import { useLiveQuery } from 'dexie-react-hooks'
import { owedByParty } from './calc/dues'
import { db } from './db'

/** Amount owed per creditor, from lots on credit, payments and vendor returns. */
export const useOwed = () =>
  useLiveQuery(async () => {
    const [lots, payments, returns] = await Promise.all([db.lots.toArray(), db.partyPayments.toArray(), db.vendorReturns.toArray()])
    const lotParty = new Map(lots.map((l) => [l.id, l.partyId]))
    return owedByParty(lots, payments, returns.map((r) => ({ ...r, partyId: lotParty.get(r.lotId) })))
  }, [])
