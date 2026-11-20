import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', () => ({ supabase: {} }))
vi.mock('../sync', () => ({ queueSync: vi.fn() }))

const { db } = await import('../db')
const { createLot, recordCustomerReturn, recordSale, recordVendorReturn, addExpense, recordPayment } = await import('../actions')

const prices = { minPrice: 3450, suggestedPrice: 3950, maxPrice: 4400 }
const silk = () =>
  createLot({ title: 'Silk', tagIds: [], mode: 'whole', qtyBought: 32, totalCost: 100_000, paymentType: 'credit', party: { name: 'Ahmed Traders' }, ...prices })

const itemFor = (lot: Awaited<ReturnType<typeof silk>>) => ({
  key: lot.id, lotId: lot.id, title: lot.title, tagIds: [], qtyRemaining: lot.qtyRemaining, unitCost: lot.unitCost, ...prices,
})

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('createLot', () => {
  it('saves the lot, creditor and outbox rows with cost per piece', async () => {
    const lot = await silk()
    expect(lot.unitCost).toBe(3125)
    expect(lot.qtyRemaining).toBe(32)
    expect(await db.parties.count()).toBe(1)
    expect((await db.outbox.toArray()).map((o) => o.table)).toEqual(['parties', 'lots'])
  })

  it('rejects one-by-one pieces that do not add up', async () => {
    await expect(
      createLot({
        title: 'Suits', tagIds: [], mode: 'single', qtyBought: 2, totalCost: 10_000, paymentType: 'cash', ...prices,
        pieces: [{ title: 'A', unitCost: 4000, tagIds: [], ...prices }, { title: 'B', unitCost: 4000, tagIds: [], ...prices }],
      }),
    ).rejects.toThrow('add up')
  })

  it('creates pieces for one-by-one lots', async () => {
    const lot = await createLot({
      title: 'Suits', tagIds: [], mode: 'single', qtyBought: 2, totalCost: 10_000, paymentType: 'cash', ...prices,
      pieces: [{ title: 'A', unitCost: 6000, tagIds: [], ...prices }, { title: 'B', unitCost: 4000, tagIds: [], ...prices }],
    })
    const pieces = await db.pieces.where('lotId').equals(lot.id).toArray()
    expect(pieces.map((p) => p.status)).toEqual(['in_stock', 'in_stock'])
  })
})

describe('recordSale', () => {
  it('stores the cost snapshot and reduces local stock', async () => {
    const lot = await silk()
    const sale = await recordSale({ item: itemFor(lot), qty: 3, unitSalePrice: 4000, paymentMethod: 'cash', soldBy: 'u1' })
    expect(sale.total).toBe(12_000)
    expect(sale.unitCostSnapshot).toBe(3125)
    expect((await db.lots.get(lot.id))?.qtyRemaining).toBe(29)
  })

  it('a worker sale stores cost 0 (server fills it in)', async () => {
    const lot = await silk()
    const { unitCost: _hidden, ...workerItem } = itemFor(lot)
    void _hidden
    const sale = await recordSale({ item: workerItem, qty: 1, unitSalePrice: 4000, paymentMethod: 'cash', soldBy: 'w1' })
    expect(sale.unitCostSnapshot).toBe(0)
  })

  it('refuses more than is in stock, zero qty and zero price', async () => {
    const lot = await silk()
    await expect(recordSale({ item: itemFor(lot), qty: 33, unitSalePrice: 4000, paymentMethod: 'cash', soldBy: 'u1' })).rejects.toThrow('Only 32')
    await expect(recordSale({ item: itemFor(lot), qty: 0, unitSalePrice: 4000, paymentMethod: 'cash', soldBy: 'u1' })).rejects.toThrow()
    await expect(recordSale({ item: itemFor(lot), qty: 1, unitSalePrice: 0, paymentMethod: 'cash', soldBy: 'u1' })).rejects.toThrow('price')
  })

  it('marks a piece as sold', async () => {
    const lot = await createLot({
      title: 'Suit', tagIds: [], mode: 'single', qtyBought: 1, totalCost: 5000, paymentType: 'cash', ...prices,
      pieces: [{ title: 'Red suit', unitCost: 5000, tagIds: [], ...prices }],
    })
    const piece = (await db.pieces.toArray())[0]
    await recordSale({ item: { ...itemFor(lot), key: piece.id, pieceId: piece.id, qtyRemaining: 1, unitCost: 5000 }, qty: 1, unitSalePrice: 7000, paymentMethod: 'jazzcash', soldBy: 'u1' })
    expect((await db.pieces.get(piece.id))?.status).toBe('sold')
  })
})

describe('returns', () => {
  it('customer return back to stock restores stock and blocks over-returning', async () => {
    const lot = await silk()
    const sale = await recordSale({ item: itemFor(lot), qty: 2, unitSalePrice: 4000, paymentMethod: 'cash', soldBy: 'u1' })
    await recordCustomerReturn(sale, { qty: 1, refundAmount: 4000, backToStock: 'stock' })
    expect((await db.lots.get(lot.id))?.qtyRemaining).toBe(31)
    await recordCustomerReturn(sale, { qty: 1, refundAmount: 4000, backToStock: 'defective' })
    expect((await db.lots.get(lot.id))?.qtyRemaining).toBe(31) // defective does not come back
    await expect(recordCustomerReturn(sale, { qty: 1, refundAmount: 4000, backToStock: 'stock' })).rejects.toThrow('Only 0')
  })

  it('refund cannot be more than what was paid', async () => {
    const lot = await silk()
    const sale = await recordSale({ item: itemFor(lot), qty: 1, unitSalePrice: 4000, paymentMethod: 'cash', soldBy: 'u1' })
    await expect(recordCustomerReturn(sale, { qty: 1, refundAmount: 4500, backToStock: 'stock' })).rejects.toThrow('Refund')
  })

  it('vendor return on a credit lot reduces dues by default and records the cost', async () => {
    const lot = await silk()
    const r = await recordVendorReturn(lot, { type: 'vendor_return', qty: 2, value: 6250 })
    expect(r.settlement).toBe('reduce_dues')
    expect(r.costOfItems).toBe(6250)
    expect((await db.lots.get(lot.id))?.qtyRemaining).toBe(30)
  })

  it('write-off has no recovered value', async () => {
    const lot = await silk()
    const r = await recordVendorReturn(lot, { type: 'write_off', qty: 1, value: 9999 })
    expect(r.value).toBe(0)
    expect(r.settlement).toBeUndefined()
  })
})

describe('expenses and payments', () => {
  it('chai goes to the current month; amounts must be positive', async () => {
    const e = await addExpense({ type: 'chai', name: 'Chai', amount: 200 })
    expect(e.month).toMatch(/^\d{4}-\d{2}$/)
    await expect(addExpense({ type: 'chai', name: 'Chai', amount: 0 })).rejects.toThrow()
    await expect(recordPayment({ partyId: 'p', amount: -5, method: 'cash' })).rejects.toThrow()
  })
})
