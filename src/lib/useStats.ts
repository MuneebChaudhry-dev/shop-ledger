import { useLiveQuery } from 'dexie-react-hooks'
import type { Period } from './calc/periods'
import { computeStats, type PriceRange, type Stats } from './calc/stats'
import { db, type Sale } from './db'

export interface StatsResult {
  stats: Stats
  sales: Sale[]
}

/** Loads what the period needs from the local database and computes stats. */
export const useStats = (period: Period): StatsResult | undefined =>
  useLiveQuery(async () => {
    const [sales, returns, expenses, vendorReturns, lots, pieces] = await Promise.all([
      db.sales.where('soldAt').between(period.start, period.end, true, false).toArray(),
      db.customerReturns.where('returnedAt').between(period.start, period.end, true, false).toArray(),
      db.expenses.toArray(),
      db.vendorReturns.where('at').between(period.start, period.end, true, false).toArray(),
      db.lots.toArray(),
      db.pieces.toArray(),
    ])
    // Returns in this period may point at sales from earlier periods.
    const known = new Set(sales.map((s) => s.id))
    const missing = returns.map((r) => r.saleId).filter((id) => !known.has(id))
    const older = (await db.sales.bulkGet(missing)).filter((s): s is Sale => !!s)
    const ranges = new Map<string, PriceRange>()
    for (const l of lots) ranges.set(l.id, { minPrice: l.minPrice, maxPrice: l.maxPrice })
    for (const p of pieces) ranges.set(p.id, { minPrice: p.minPrice, maxPrice: p.maxPrice })
    const stats = computeStats({ period, sales: [...sales, ...older], returns, expenses, vendorReturns, ranges })
    return { stats, sales: sales.filter((s) => !s.deletedAt).sort((a, b) => b.soldAt - a.soldAt) }
  }, [period.start, period.end, period.kind])
