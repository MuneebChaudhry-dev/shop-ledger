import { create } from 'zustand'
import { toLocal, toServer, tableName } from './case'
import { db, syncTables, type SyncTable, type WorkerItem } from './db'
import type { Role } from './roles'
import { supabase } from './supabase'

/**
 * Append-only tables: a retry must never overwrite or re-apply. They are pushed with a plain INSERT,
 * and a duplicate-key error means an earlier try already landed. (INSERT ... ON CONFLICT would need a
 * SELECT policy, and workers must not read sales back because the rows carry the buy cost.)
 */
const appendOnly = new Set<string>(['sales', 'customerReturns', 'vendorReturns', 'partyPayments'])

/** Pull cursors overlap by this much, so rows committed slightly late are not missed. */
const PULL_OVERLAP_MS = 2 * 60 * 1000

interface SyncState {
  pending: number
  syncing: boolean
  lastError?: string
  lastSyncedAt?: number
}

export const useSyncStore = create<SyncState>(() => ({ pending: 0, syncing: false }))

const refreshPending = async () => {
  const [jobs, photos] = await Promise.all([db.outbox.count(), db.photos.where('uploaded').equals(0).count()])
  useSyncStore.setState({ pending: jobs + photos })
}

/** After this many failed tries a row is parked: it stays in the outbox and shows in Settings, but no longer blocks the rest. */
export const MAX_TRIES = 10

/**
 * Push queued rows oldest first. A failing row does not stop the others: a row that depends on it
 * (for example a sale whose lot failed) also fails this round and succeeds on a later round.
 */
export const pushOutbox = async (): Promise<string | undefined> => {
  let firstError: string | undefined
  const jobs = (await db.outbox.orderBy('createdAt').limit(500).toArray()).filter((j) => j.tries < MAX_TRIES)
  for (const job of jobs) {
    const record = await db.table(job.table).get(job.recordId)
    if (!record) {
      await db.outbox.delete(job.id!)
      continue
    }
    const onConflict = job.table === 'settings' ? 'key' : 'id'
    const query = supabase.from(tableName(job.table))
    const { error } = appendOnly.has(job.table)
      ? await query.insert(toServer(record))
      : await query.upsert(toServer(record), { onConflict })
    const alreadyThere = appendOnly.has(job.table) && error?.code === '23505'
    if (error && !alreadyThere) {
      const message = `${job.table}: ${error.message}`
      firstError ??= message
      await db.outbox.update(job.id!, { tries: job.tries + 1, lastError: message })
      continue
    }
    await db.transaction('rw', db.table(job.table), db.outbox, async () => {
      const current = await db.table(job.table).get(job.recordId)
      // Only mark synced if nothing changed locally while we were uploading.
      if (current && current.updatedAt === record.updatedAt) await db.table(job.table).update(job.recordId, { synced: 1 })
      await db.outbox.delete(job.id!)
    })
  }
  return firstError
}

/** Bill photos show buy costs, so they go in bills/ where only owner and manager can read. */
export const photoPath = (id: string, kind: string) => (kind === 'bill' ? `bills/${id}.jpg` : `${id}.jpg`)

export const pushPhotos = async (): Promise<string | undefined> => {
  let firstError: string | undefined
  const photos = await db.photos.where('uploaded').equals(0).limit(30).toArray()
  for (const p of photos) {
    const { error } = await supabase.storage.from('photos').upload(photoPath(p.id, p.kind), p.blob, { contentType: 'image/jpeg', upsert: false })
    // "Already exists" means an earlier try uploaded it but the app closed before we noted it.
    const exists = error && /exist|duplicate|409/i.test(`${error.message} ${(error as { statusCode?: string }).statusCode ?? ''}`)
    if (error && !exists) {
      firstError ??= `photo: ${error.message}`
      continue
    }
    await db.photos.update(p.id, { uploaded: 1 })
  }
  return firstError
}

interface Cursor { at: number; key: string }

const getCursor = async (name: string): Promise<Cursor> => {
  const row = await db.meta.get(name)
  return row ? { at: row.value, key: row.lastKey ?? '' } : { at: -1, key: '' }
}
const setCursor = (name: string, c: Cursor) => db.meta.put({ key: name, value: c.at, lastKey: c.key })

/**
 * Pull rows changed on the server since the last pull, using the server clock (synced_at).
 * Keyset paging on (synced_at, id) so equal timestamps at a page edge are never skipped.
 * The first page of each run starts a little before the cursor, in case a slow transaction
 * committed an older timestamp after we last looked. Re-reading rows is harmless.
 * A local row that is unsynced and newer is kept until it is pushed.
 */
export const pullTable = async (table: SyncTable | 'settings') => {
  const cursorName = `pull:${table}`
  const pk = table === 'settings' ? 'key' : 'id'
  const saved = await getCursor(cursorName)
  let pos: Cursor = saved.at < 0 ? saved : { at: Math.max(-1, saved.at - PULL_OVERLAP_MS), key: '' }
  let maxSeen = saved
  const pageSize = 500
  for (;;) {
    let query = supabase.from(tableName(table)).select('*')
    // No key yet (first page of a run): take everything from the timestamp on.
    query = pos.key ? query.or(`synced_at.gt.${pos.at},and(synced_at.eq.${pos.at},${pk}.gt.${pos.key})`) : query.gte('synced_at', pos.at)
    const { data, error } = await query
      .order('synced_at')
      .order(pk)
      .limit(pageSize)
    if (error) throw new Error(`pull ${table}: ${error.message}`)
    if (!data?.length) break
    await db.transaction('rw', db.table(table), async () => {
      for (const raw of data as Record<string, unknown>[]) {
        const row = toLocal(raw)
        delete row.syncedAt
        const key = row[pk] as string
        const local = await db.table(table).get(key)
        if (local && local.synced === 0 && local.updatedAt >= (row.updatedAt as number)) continue
        await db.table(table).put({ ...row, synced: 1 })
      }
    })
    const last = data[data.length - 1] as Record<string, unknown>
    pos = { at: Number(last.synced_at), key: String(last[pk]) }
    if (pos.at > maxSeen.at || (pos.at === maxSeen.at && pos.key > maxSeen.key)) maxSeen = pos
    if (data.length < pageSize) break
  }
  await setCursor(cursorName, maxSeen)
}

/** Workers get a fresh copy of the worker_items view each time (it is small). */
const pullWorkerItems = async () => {
  const { data, error } = await supabase.from('worker_items').select('*')
  if (error) throw new Error(`pull items: ${error.message}`)
  const items = (data ?? []).map((raw) => {
    const r = toLocal(raw as Record<string, unknown>)
    return { ...r, tagIds: r.tagIds ?? [], key: (r.pieceId ?? r.lotId) as string } as WorkerItem
  })
  await db.transaction('rw', db.workerItems, async () => {
    await db.workerItems.clear()
    await db.workerItems.bulkPut(items)
  })
}

const pullAll = async (role: Role) => {
  if (role === 'worker') {
    // Workers never pull sales or lots: those rows carry buy costs.
    for (const t of ['tagGroups', 'tags', 'profiles'] as const) await pullTable(t)
    await pullWorkerItems()
    return
  }
  for (const t of syncTables) await pullTable(t)
  await pullTable('settings')
}

let running: Promise<void> | null = null
let currentRole: Role | undefined

/** Push local changes, upload photos, then pull. Safe to call often; runs one at a time. */
export const syncNow = (): Promise<void> => {
  if (running) return running
  if (!navigator.onLine || !currentRole) return refreshPending()
  const role = currentRole
  running = (async () => {
    useSyncStore.setState({ syncing: true, lastError: undefined })
    try {
      // Push problems never block the pull: the phone keeps receiving other people's changes.
      const outboxError = await pushOutbox()
      const photoError = await pushPhotos()
      const pushError = outboxError ?? photoError
      let pullError: string | undefined
      try {
        await pullAll(role)
      } catch (e) {
        pullError = e instanceof Error ? e.message : String(e)
      }
      const lastError = pushError ?? pullError
      useSyncStore.setState({ lastError, ...(lastError ? {} : { lastSyncedAt: Date.now() }) })
    } catch (e) {
      useSyncStore.setState({ lastError: e instanceof Error ? e.message : String(e) })
    } finally {
      useSyncStore.setState({ syncing: false })
      await refreshPending()
      running = null
    }
  })()
  return running
}

let timer: ReturnType<typeof setInterval> | undefined

export const startSync = (role: Role) => {
  currentRole = role
  if (!timer) {
    window.addEventListener('online', () => void syncNow())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void syncNow()
    })
    timer = setInterval(() => void syncNow(), 30_000)
  }
  void navigator.storage?.persist?.()
  void syncNow()
}

export const stopSync = () => {
  currentRole = undefined
}

/** Call after a local save so changes leave the phone quickly. */
export const queueSync = () => {
  void refreshPending()
  setTimeout(() => void syncNow(), 500)
}

/** Rows that failed MAX_TRIES times. Shown in Settings so a person can see why and retry. */
export const retryStuck = async () => {
  await db.outbox.where('tries').aboveOrEqual(MAX_TRIES).modify({ tries: 0 })
  await syncNow()
}
