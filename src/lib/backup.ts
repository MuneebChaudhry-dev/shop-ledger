import { db, syncTables } from './db'

/** Download every synced table (no photos) as one JSON file. */
export const exportBackup = async () => {
  const out: Record<string, unknown[]> = {}
  for (const t of syncTables) out[t] = await db.table(t).toArray()
  out.settings = await db.settings.toArray()
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...out }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `shop-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
