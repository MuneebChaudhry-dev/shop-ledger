import { monthKey } from './calc/periods'
import { db, newId, saveRecord, type CustomerReturn, type Expense, type Lot, type Party, type PartyPayment, type Piece, type Sale, type VendorReturn } from './db'
import { unitCost, type PriceSet } from './money'
import { queueSync } from './sync'

/** One thing that can be sold: a whole-lot line or a single piece. */
export interface SellableItem extends PriceSet {
  key: string
  lotId: string
  pieceId?: string
  title: string
  tagIds: string[]
  photoId?: string
  qtyRemaining: number
  /** Known only to owner and manager. */
  unitCost?: number
}

/*
 * Stock counts (lots.qtyRemaining, pieces.status) are owned by server triggers.
 * Locally we adjust them directly (no outbox row) so the phone shows the right stock
 * until the next pull brings the server value.
 */
const adjustLotStock = async (lotId: string, delta: number) => {
  const lot = await db.lots.get(lotId)
  if (lot) await db.lots.update(lotId, { qtyRemaining: Math.max(0, lot.qtyRemaining + delta) })
}

export interface NewLotInput extends PriceSet {
  title: string
  description?: string
  tagIds: string[]
  mode: 'whole' | 'single'
  qtyBought: number
  totalCost: number
  paymentType: 'cash' | 'credit'
  party?: { id?: string; name: string; phone?: string; address?: string }
  dueDate?: string
  lotPhotoId?: string
  billPhotoId?: string
  pieces?: (PriceSet & { title: string; unitCost: number; tagIds: string[]; photoId?: string })[]
}

export const createLot = async (input: NewLotInput): Promise<Lot> => {
  if (!input.title.trim() || input.qtyBought <= 0 || input.totalCost < 0) throw new Error('Title, quantity and cost are required')
  if (input.mode === 'single') {
    const pieces = input.pieces ?? []
    const sum = pieces.reduce((s, p) => s + p.unitCost, 0)
    if (pieces.length !== input.qtyBought || sum !== input.totalCost) throw new Error('Piece costs must add up to the lot total')
  }
  let partyId = input.party?.id
  if (!partyId && input.party?.name) {
    const party = await saveRecord<Party>('parties', {
      id: newId(),
      name: input.party.name,
      phone: input.party.phone,
      address: input.party.address,
      kind: input.paymentType === 'credit' ? 'creditor' : 'seller',
    })
    partyId = party.id
  }
  const lot = await saveRecord<Lot>('lots', {
    id: newId(),
    title: input.title,
    description: input.description,
    tagIds: input.tagIds,
    mode: input.mode,
    qtyBought: input.qtyBought,
    qtyRemaining: input.qtyBought,
    totalCost: input.totalCost,
    unitCost: unitCost(input.totalCost, input.qtyBought),
    minPrice: input.minPrice,
    suggestedPrice: input.suggestedPrice,
    maxPrice: input.maxPrice,
    paymentType: input.paymentType,
    partyId,
    dueDate: input.dueDate,
    lotPhotoId: input.lotPhotoId,
    billPhotoId: input.billPhotoId,
  })
  for (const p of input.pieces ?? []) {
    await saveRecord<Piece>('pieces', { id: newId(), lotId: lot.id, status: 'in_stock', ...p })
  }
  queueSync()
  return lot
}

export interface SaleInput {
  item: SellableItem
  qty: number
  unitSalePrice: number
  paymentMethod: Sale['paymentMethod']
  photoId?: string
  soldBy: string
}

export const recordSale = async ({ item, qty, unitSalePrice, paymentMethod, photoId, soldBy }: SaleInput): Promise<Sale> => {
  if (!Number.isInteger(qty) || qty <= 0 || qty > item.qtyRemaining) throw new Error(`Only ${item.qtyRemaining} in stock`)
  if (item.pieceId && qty !== 1) throw new Error('A piece is sold one at a time')
  if (!Number.isInteger(unitSalePrice) || unitSalePrice <= 0) throw new Error('Enter the sale price')
  const sale = await saveRecord<Sale>('sales', {
    id: newId(),
    lotId: item.lotId,
    pieceId: item.pieceId,
    qty,
    unitSalePrice,
    total: unitSalePrice * qty,
    // Workers do not know the cost; the server fills it from the lot or piece.
    unitCostSnapshot: item.unitCost ?? 0,
    paymentMethod,
    photoId,
    soldBy,
    soldAt: Date.now(),
  })
  await adjustLotStock(item.lotId, -qty)
  if (item.pieceId) await db.pieces.update(item.pieceId, { status: 'sold' })
  const wi = await db.workerItems.get(item.key)
  if (wi) {
    if (wi.qtyRemaining - qty <= 0) await db.workerItems.delete(item.key)
    else await db.workerItems.update(item.key, { qtyRemaining: wi.qtyRemaining - qty })
  }
  queueSync()
  return sale
}

export const recordPayment = async (input: { partyId: string; amount: number; method: string; note?: string; lotId?: string }) => {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error('Amount must be more than 0')
  const row = await saveRecord<PartyPayment>('partyPayments', { id: newId(), paidAt: Date.now(), ...input })
  queueSync()
  return row
}

export const returnedQty = async (saleId: string) =>
  (await db.customerReturns.where('saleId').equals(saleId).toArray()).filter((r) => !r.deletedAt).reduce((s, r) => s + r.qty, 0)

export const recordCustomerReturn = async (sale: Sale, input: { qty: number; refundAmount: number; backToStock: 'stock' | 'defective'; note?: string }) => {
  const left = sale.qty - (await returnedQty(sale.id))
  if (!Number.isInteger(input.qty) || input.qty <= 0 || input.qty > left) throw new Error(`Only ${left} left to return on this sale`)
  const maxRefund = sale.unitSalePrice * input.qty
  if (!Number.isInteger(input.refundAmount) || input.refundAmount < 0 || input.refundAmount > maxRefund)
    throw new Error(`Refund must be between Rs 0 and ${maxRefund} for ${input.qty} piece(s)`)
  const row = await saveRecord<CustomerReturn>('customerReturns', { id: newId(), saleId: sale.id, returnedAt: Date.now(), ...input })
  if (input.backToStock === 'stock') {
    await adjustLotStock(sale.lotId, input.qty)
    if (sale.pieceId) await db.pieces.update(sale.pieceId, { status: 'in_stock' })
  }
  queueSync()
  return row
}

export const recordVendorReturn = async (
  lot: Lot,
  input: { type: 'vendor_return' | 'write_off'; qty: number; pieces?: Piece[]; value: number; settlement?: 'reduce_dues' | 'cash_refund'; photoId?: string; note?: string },
) => {
  const qty = input.pieces?.length ?? input.qty
  if (!Number.isInteger(qty) || qty <= 0 || qty > lot.qtyRemaining) throw new Error(`Only ${lot.qtyRemaining} in stock`)
  const costOfItems = input.pieces ? input.pieces.reduce((s, p) => s + p.unitCost, 0) : lot.unitCost * qty
  const row = await saveRecord<VendorReturn>('vendorReturns', {
    id: newId(),
    lotId: lot.id,
    pieceIds: input.pieces?.map((p) => p.id),
    qty,
    value: input.type === 'write_off' ? 0 : input.value,
    costOfItems,
    type: input.type,
    settlement: input.type === 'write_off' ? undefined : (input.settlement ?? (lot.paymentType === 'credit' ? 'reduce_dues' : 'cash_refund')),
    photoId: input.photoId,
    at: Date.now(),
    note: input.note,
  })
  await adjustLotStock(lot.id, -qty)
  for (const p of input.pieces ?? []) await db.pieces.update(p.id, { status: input.type === 'write_off' ? 'written_off' : 'returned' })
  queueSync()
  return row
}

export const addExpense = async (input: { type: Expense['type']; name: string; amount: number; month?: string; note?: string }) => {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error('Amount must be more than 0')
  const at = Date.now()
  const row = await saveRecord<Expense>('expenses', { id: newId(), at, ...input, month: input.month ?? monthKey(at) })
  queueSync()
  return row
}
