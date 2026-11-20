import { db } from './db'
import { supabase } from './supabase'

/** Column names in Postgres are snake_case versions of the Dexie fields. */
const toSnake = (row: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(row)
      .filter(([k]) => k !== 'synced')
      .map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), v]),
  )

const tableName = (t: string) => t.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

let running = false

/** Push queued local changes to Supabase. Safe to call often. */
export const pushOutbox = async () => {
  if (running || !navigator.onLine) return
  running = true
  try {
    const rows = await db.outbox.orderBy('createdAt').limit(100).toArray()
    for (const job of rows) {
      const record = await db.table(job.table).get(job.recordId)
      if (!record) {
        await db.outbox.delete(job.id!)
        continue
      }
      const { error } = await supabase.from(tableName(job.table)).upsert(toSnake(record))
      if (error) {
        await db.outbox.update(job.id!, { tries: job.tries + 1 })
        continue
      }
      await db.transaction('rw', db.table(job.table), db.outbox, async () => {
        await db.table(job.table).update(job.recordId, { synced: 1 })
        await db.outbox.delete(job.id!)
      })
    }
  } finally {
    running = false
  }
}

// TODO(phase 2): pullChanges(), photo uploads to Storage bucket "photos".

export const startSync = () => {
  window.addEventListener('online', () => void pushOutbox())
  setInterval(() => void pushOutbox(), 30_000)
  void pushOutbox()
  void navigator.storage?.persist?.()
}
