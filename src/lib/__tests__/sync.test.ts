import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A tiny fake of the supabase-js query builder: records calls, returns canned results.
const calls: { table: string; op: string; args: unknown[] }[] = []
let upsertErrors: Record<string, string> = {}
let insertErrors: Record<string, { message: string; code?: string }> = {}
let pages: Record<string, Record<string, unknown>[][]> = {}
let uploadError: { message: string; statusCode?: string } | null = null

const builder = (table: string) => {
  const b = {
    upsert: (row: unknown, opts: unknown) => {
      calls.push({ table, op: 'upsert', args: [row, opts] })
      return Promise.resolve({ error: upsertErrors[table] ? { message: upsertErrors[table] } : null })
    },
    insert: (row: unknown) => {
      calls.push({ table, op: 'insert', args: [row] })
      return Promise.resolve({ error: insertErrors[table] ?? null })
    },
    select: () => b,
    or: (f: string) => (calls.push({ table, op: 'or', args: [f] }), b),
    gte: (c: string, v: number) => (calls.push({ table, op: 'gte', args: [c, v] }), b),
    order: () => b,
    limit: () => Promise.resolve({ data: (pages[table] ?? []).shift() ?? [], error: null }),
  }
  return b
}

vi.mock('../supabase', () => ({
  supabase: {
    from: (t: string) => builder(t),
    storage: { from: () => ({ upload: (path: string) => (calls.push({ table: 'storage', op: 'upload', args: [path] }), Promise.resolve({ error: uploadError })) }) },
  },
}))

const { db } = await import('../db')
const { pushOutbox, pullTable, pushPhotos, photoPath, MAX_TRIES } = await import('../sync')

const queue = async (table: 'lots' | 'sales', id: string, createdAt: number) => {
  await db.table(table).put({ id, updatedAt: 1, createdAt, synced: 0 })
  await db.outbox.add({ table, recordId: id, op: 'upsert', createdAt, tries: 0 })
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  calls.length = 0
  upsertErrors = {}
  insertErrors = {}
  pages = {}
  uploadError = null
})

describe('pushOutbox', () => {
  it('keeps going past a failing row and records the error', async () => {
    await queue('lots', 'lot1', 1)
    await queue('sales', 'sale1', 2)
    upsertErrors = { lots: 'permission denied' }
    const err = await pushOutbox()
    expect(err).toBe('lots: permission denied')
    expect((await db.sales.get('sale1'))?.synced).toBe(1)
    const left = await db.outbox.toArray()
    expect(left).toHaveLength(1)
    expect(left[0]).toMatchObject({ table: 'lots', tries: 1, lastError: 'lots: permission denied' })
  })

  it('inserts sales (duplicate key = already uploaded) and upserts lots', async () => {
    await queue('lots', 'lot1', 1)
    await queue('sales', 'sale1', 2)
    insertErrors = { sales: { message: 'duplicate key value violates unique constraint', code: '23505' } }
    expect(await pushOutbox()).toBeUndefined()
    expect(calls.find((c) => c.table === 'sales')?.op).toBe('insert')
    expect(calls.find((c) => c.table === 'lots')?.args[1]).toEqual({ onConflict: 'id' })
    expect(await db.outbox.count()).toBe(0)
    expect((await db.sales.get('sale1'))?.synced).toBe(1)
  })

  it('any other insert error on a sale is a real failure', async () => {
    await queue('sales', 'sale1', 2)
    insertErrors = { sales: { message: 'new row violates row-level security policy', code: '42501' } }
    expect(await pushOutbox()).toContain('row-level security')
    expect(await db.outbox.count()).toBe(1)
  })

  it('parks rows after MAX_TRIES so they stop blocking', async () => {
    await queue('lots', 'lot1', 1)
    await db.outbox.toCollection().modify({ tries: MAX_TRIES })
    await pushOutbox()
    expect(calls.filter((c) => c.op === 'upsert')).toHaveLength(0)
  })
})

describe('pushPhotos', () => {
  it('bills go under bills/, and an "already exists" error counts as uploaded', async () => {
    expect(photoPath('a', 'bill')).toBe('bills/a.jpg')
    expect(photoPath('a', 'sale')).toBe('a.jpg')
    await db.photos.put({ id: 'p1', blob: new Blob(['x']), kind: 'bill', uploaded: 0, createdAt: 1 })
    uploadError = { message: 'The resource already exists', statusCode: '409' }
    expect(await pushPhotos()).toBeUndefined()
    expect((await db.photos.get('p1'))?.uploaded).toBe(1)
    expect(calls.find((c) => c.op === 'upload')?.args[0]).toBe('bills/p1.jpg')
  })
})

describe('pullTable', () => {
  it('pages by (synced_at, id) and keeps unsynced newer local rows', async () => {
    const row = (id: string, at: number, updated = 5) => ({ id, synced_at: at, updated_at: updated, created_at: 0, name: id, group_id: null })
    // Page size is 500; fake a full first page so the loop asks for a second.
    const first = Array.from({ length: 500 }, (_, i) => row(`t${String(i).padStart(3, '0')}`, 100))
    pages = { tags: [first, [row('t999', 100), row('mine', 101, 5)]] }
    await db.tags.put({ id: 'mine', groupId: 'g', name: 'local edit', createdAt: 0, updatedAt: 9, synced: 0 })
    await pullTable('tags')
    expect(await db.tags.count()).toBe(502)
    expect((await db.tags.get('mine'))?.name).toBe('local edit')
    expect(calls.find((c) => c.op === 'gte')?.args).toEqual(['synced_at', -1])
    expect(calls.find((c) => c.op === 'or')?.args[0]).toBe('synced_at.gt.100,and(synced_at.eq.100,id.gt.t499)')
    expect((await db.meta.get('pull:tags'))?.value).toBe(101)
  })
})
