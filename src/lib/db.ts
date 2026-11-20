import Dexie, { type EntityTable } from 'dexie'

interface Base {
  id: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
  synced: 0 | 1
}

export interface TagGroup extends Base { name: string; sort: number }
export interface Tag extends Base { groupId: string; name: string }
export interface Party extends Base { name: string; phone?: string; address?: string; kind: 'seller' | 'creditor' }
export interface Lot extends Base {
  title: string
  description?: string
  tagIds: string[]
  mode: 'whole' | 'single'
  qtyBought: number
  qtyRemaining: number
  totalCost: number
  unitCost: number
  minPrice: number
  suggestedPrice: number
  maxPrice: number
  paymentType: 'cash' | 'credit'
  partyId?: string
  dueDate?: string
  lotPhotoId?: string
  billPhotoId?: string
}
export interface Piece extends Base {
  lotId: string
  title: string
  photoId?: string
  tagIds: string[]
  unitCost: number
  minPrice: number
  suggestedPrice: number
  maxPrice: number
  status: 'in_stock' | 'sold' | 'returned' | 'written_off'
}
export interface Sale extends Base {
  lotId: string
  pieceId?: string
  qty: number
  unitSalePrice: number
  total: number
  unitCostSnapshot: number
  paymentMethod: 'cash' | 'easypaisa' | 'jazzcash'
  photoId?: string
  soldBy: string
  soldAt: number
}
export interface PartyPayment extends Base { partyId: string; lotId?: string; amount: number; method: string; paidAt: number; note?: string }
export interface CustomerReturn extends Base { saleId: string; qty: number; refundAmount: number; backToStock: 'stock' | 'defective'; returnedAt: number; note?: string }
export interface VendorReturn extends Base {
  lotId: string
  pieceIds?: string[]
  qty: number
  value: number
  costOfItems: number
  type: 'vendor_return' | 'write_off'
  settlement?: 'reduce_dues' | 'cash_refund'
  photoId?: string
  at: number
  note?: string
}
export interface Expense extends Base { type: 'chai' | 'month_end'; name: string; amount: number; month: string; at: number; note?: string }
export interface Profile extends Base { name: string; phone?: string; role: 'owner' | 'manager' | 'worker'; active: boolean }
export interface Photo { id: string; blob: Blob; kind: string; uploaded: 0 | 1; createdAt: number }
export interface Setting { key: string; value: unknown; updatedAt: number; synced: 0 | 1 }
/** Read-only copy of the server's worker_items view (what a worker may see). */
export interface WorkerItem {
  key: string // pieceId ?? lotId
  lotId: string
  pieceId?: string
  title: string
  tagIds: string[]
  photoId?: string
  qtyRemaining: number
  minPrice: number
  suggestedPrice: number
  maxPrice: number
}
export interface Meta { key: string; value: number; lastKey?: string }
export interface OutboxRow { id?: number; table: string; recordId: string; op: 'upsert' | 'delete'; createdAt: number; tries: number; lastError?: string }

export const db = new Dexie('shop-ledger') as Dexie & {
  tagGroups: EntityTable<TagGroup, 'id'>
  tags: EntityTable<Tag, 'id'>
  parties: EntityTable<Party, 'id'>
  lots: EntityTable<Lot, 'id'>
  pieces: EntityTable<Piece, 'id'>
  sales: EntityTable<Sale, 'id'>
  partyPayments: EntityTable<PartyPayment, 'id'>
  customerReturns: EntityTable<CustomerReturn, 'id'>
  vendorReturns: EntityTable<VendorReturn, 'id'>
  expenses: EntityTable<Expense, 'id'>
  profiles: EntityTable<Profile, 'id'>
  photos: EntityTable<Photo, 'id'>
  settings: EntityTable<Setting, 'key'>
  workerItems: EntityTable<WorkerItem, 'key'>
  meta: EntityTable<Meta, 'key'>
  outbox: EntityTable<OutboxRow, 'id'>
}

// Version 2: the scaffold shipped version 1 with fewer tables.
db.version(2).stores({
  tagGroups: 'id, updatedAt',
  tags: 'id, groupId, updatedAt',
  parties: 'id, kind, updatedAt',
  lots: 'id, partyId, paymentType, createdAt, updatedAt, *tagIds',
  pieces: 'id, lotId, status, updatedAt',
  sales: 'id, lotId, pieceId, soldAt, soldBy, updatedAt',
  partyPayments: 'id, partyId, lotId, paidAt, updatedAt',
  customerReturns: 'id, saleId, returnedAt, updatedAt',
  vendorReturns: 'id, lotId, at, updatedAt',
  expenses: 'id, type, month, at, updatedAt',
  profiles: 'id, role',
  photos: 'id, uploaded',
  settings: 'key',
  workerItems: 'key, lotId, title',
  meta: 'key',
  outbox: '++id, table, createdAt, tries',
})

/** Tables that sync to Supabase (camelCase name here, snake_case on the server). */
export const syncTables = [
  'tagGroups', 'tags', 'parties', 'lots', 'pieces', 'sales', 'partyPayments',
  'customerReturns', 'vendorReturns', 'expenses', 'profiles',
] as const
export type SyncTable = (typeof syncTables)[number]

export const newId = (): string => crypto.randomUUID()

type NewRow<T> = Omit<T, 'createdAt' | 'updatedAt' | 'synced'> & Partial<Pick<Base, 'createdAt'>>

/** Write a record locally and queue it for upload, in one transaction. */
export const saveRecord = async <T extends Base>(table: SyncTable, record: NewRow<T>): Promise<T> => {
  const now = Date.now()
  const row = { createdAt: now, ...record, updatedAt: now, synced: 0 } as unknown as T
  const t = db.table(table)
  await db.transaction('rw', t, db.outbox, async () => {
    await t.put(row)
    await db.outbox.add({ table, recordId: row.id, op: 'upsert', createdAt: now, tries: 0 })
  })
  return row
}

/** Update some fields of an existing record and queue it. */
export const patchRecord = async <T extends Base>(table: SyncTable, id: string, changes: Partial<T>) => {
  const now = Date.now()
  const t = db.table(table)
  await db.transaction('rw', t, db.outbox, async () => {
    await t.update(id, { ...changes, updatedAt: now, synced: 0 })
    await db.outbox.add({ table, recordId: id, op: 'upsert', createdAt: now, tries: 0 })
  })
}

/** Soft delete (kept for history and sync). */
export const softDelete = (table: SyncTable, id: string) => patchRecord(table, id, { deletedAt: Date.now() })
