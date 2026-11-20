import { dayKeysIn, dayKey, inPeriod, monthKey, type Period } from './periods'

export interface SaleLike {
  id: string
  lotId: string
  pieceId?: string
  qty: number
  unitSalePrice: number
  total: number
  unitCostSnapshot: number
  soldAt: number
  deletedAt?: number
}
export interface ReturnLike {
  saleId: string
  qty: number
  refundAmount: number
  backToStock: 'stock' | 'defective'
  returnedAt: number
  deletedAt?: number
}
export interface ExpenseLike {
  type: 'chai' | 'month_end'
  amount: number
  month: string
  at: number
  deletedAt?: number
}
export interface VendorReturnLike {
  type: 'vendor_return' | 'write_off'
  qty: number
  value: number
  costOfItems: number
  at: number
  deletedAt?: number
}
export interface PriceRange {
  minPrice: number
  maxPrice: number
}

export interface DayRow {
  day: string
  earning: number
  profit: number
  pieces: number
}

export interface Stats {
  earning: number
  saleProfit: number
  returnsImpact: number
  chai: number
  monthEnd: number
  stockLoss: number
  profit: number
  piecesSold: number
  belowMin: { count: number; gap: number }
  aboveMax: { count: number; gap: number }
  days: DayRow[]
}

export const saleProfit = (s: Pick<SaleLike, 'qty' | 'unitSalePrice' | 'unitCostSnapshot'>): number =>
  (s.unitSalePrice - s.unitCostSnapshot) * s.qty

/**
 * Profit change caused by a customer return.
 * Back to stock: the sale is undone, so remove (refund - cost of returned pieces).
 * Defective: the money goes back and the piece is worthless, so remove the full refund.
 */
export const returnImpact = (r: ReturnLike, sale: Pick<SaleLike, 'unitCostSnapshot'>): number =>
  r.backToStock === 'stock' ? -(r.refundAmount - sale.unitCostSnapshot * r.qty) : -r.refundAmount

/** Loss from a vendor return or write-off: cost of the items minus what was recovered. */
export const stockLoss = (v: VendorReturnLike): number =>
  v.type === 'write_off' ? v.costOfItems : Math.max(0, v.costOfItems - v.value)

const live = <T extends { deletedAt?: number }>(rows: T[]) => rows.filter((r) => !r.deletedAt)

export interface StatsInput {
  period: Period
  sales: SaleLike[]
  returns: ReturnLike[]
  expenses: ExpenseLike[]
  vendorReturns: VendorReturnLike[]
  /** Price range per lot id or piece id, used for below-min / above-max. */
  ranges: Map<string, PriceRange>
}

/**
 * Daily, weekly and bi-weekly profit = sale profits + returns impact - chai.
 * Monthly profit (the main P&L) also subtracts month-end expenses and stock losses.
 */
export const computeStats = ({ period, sales, returns, expenses, vendorReturns, ranges }: StatsInput): Stats => {
  const isMonth = period.kind === 'month'
  const days = new Map<string, DayRow>(dayKeysIn(period).map((d) => [d, { day: d, earning: 0, profit: 0, pieces: 0 }]))
  const allSales = live(sales)
  const salesById = new Map(allSales.map((s) => [s.id, s]))

  let earning = 0
  let saleProfitSum = 0
  let piecesSold = 0
  const belowMin = { count: 0, gap: 0 }
  const aboveMax = { count: 0, gap: 0 }

  for (const s of allSales) {
    if (!inPeriod(s.soldAt, period)) continue
    const p = saleProfit(s)
    earning += s.total
    saleProfitSum += p
    piecesSold += s.qty
    const row = days.get(dayKey(s.soldAt))
    if (row) {
      row.earning += s.total
      row.profit += p
      row.pieces += s.qty
    }
    const range = ranges.get(s.pieceId ?? s.lotId)
    if (range) {
      if (s.unitSalePrice < range.minPrice) {
        belowMin.count += 1
        belowMin.gap += (range.minPrice - s.unitSalePrice) * s.qty
      } else if (s.unitSalePrice > range.maxPrice) {
        aboveMax.count += 1
        aboveMax.gap += (s.unitSalePrice - range.maxPrice) * s.qty
      }
    }
  }

  let returnsImpact = 0
  for (const r of live(returns)) {
    if (!inPeriod(r.returnedAt, period)) continue
    const sale = salesById.get(r.saleId)
    if (!sale) continue
    const impact = returnImpact(r, sale)
    returnsImpact += impact
    earning -= r.refundAmount
    const row = days.get(dayKey(r.returnedAt))
    if (row) {
      row.earning -= r.refundAmount
      row.profit += impact
    }
  }

  let chai = 0
  let monthEnd = 0
  const monthsInPeriod = new Set(dayKeysIn(period).map((d) => d.slice(0, 7)))
  for (const e of live(expenses)) {
    if (e.type === 'chai' && inPeriod(e.at, period)) {
      chai += e.amount
      const row = days.get(dayKey(e.at))
      if (row) row.profit -= e.amount
    }
    if (isMonth && e.type === 'month_end' && monthsInPeriod.has(e.month)) monthEnd += e.amount
  }

  let loss = 0
  if (isMonth) {
    for (const v of live(vendorReturns)) if (monthsInPeriod.has(monthKey(v.at))) loss += stockLoss(v)
  }

  return {
    earning,
    saleProfit: saleProfitSum,
    returnsImpact,
    chai,
    monthEnd,
    stockLoss: loss,
    profit: saleProfitSum + returnsImpact - chai - monthEnd - loss,
    piecesSold,
    belowMin,
    aboveMax,
    days: [...days.values()],
  }
}
