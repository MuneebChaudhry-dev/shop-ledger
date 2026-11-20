import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { defaultMargins, type Margins } from './money'
import { queueSync } from './sync'

export const saveSetting = async (key: string, value: unknown) => {
  const now = Date.now()
  await db.transaction('rw', db.settings, db.outbox, async () => {
    await db.settings.put({ key, value, updatedAt: now, synced: 0 })
    await db.outbox.add({ table: 'settings', recordId: key, op: 'upsert', createdAt: now, tries: 0 })
  })
  queueSync()
}

export const useMargins = (): Margins => {
  const row = useLiveQuery(() => db.settings.get('margins'))
  return (row?.value as Margins | undefined) ?? defaultMargins
}

export const useChaiDefault = (): number => {
  const row = useLiveQuery(() => db.settings.get('chaiDefault'))
  return Number(row?.value ?? 200)
}
