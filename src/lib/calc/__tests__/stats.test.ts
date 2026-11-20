import { describe, expect, it } from 'vitest'
import { getPeriod } from '../periods'
import { computeStats, returnImpact, saleProfit, stockLoss, type SaleLike } from '../stats'

const at = (iso: string) => Date.parse(iso)
const nov20 = at('2026-11-20T07:00:00Z') // 12:00 PKT
const sale = (id: string, price: number, extra: Partial<SaleLike> = {}): SaleLike => ({
  id, lotId: 'silk', qty: 1, unitSalePrice: price, total: price, unitCostSnapshot: 3125, soldAt: nov20, ...extra,
})
const ranges = new Map([['silk', { minPrice: 3500, maxPrice: 4500 }]])
const base = { returns: [], expenses: [], vendorReturns: [], ranges }

describe('saleProfit', () => {
  it('matches the plan examples', () => {
    expect(saleProfit(sale('a', 3000))).toBe(-125)
    expect(saleProfit(sale('b', 5000))).toBe(1875)
    expect(saleProfit({ qty: 3, unitSalePrice: 4000, unitCostSnapshot: 3125 })).toBe(2625)
  })
})

describe('returnImpact', () => {
  const s = sale('a', 4000)
  it('back to stock reverses the sale profit', () => {
    expect(returnImpact({ saleId: 'a', qty: 1, refundAmount: 4000, backToStock: 'stock', returnedAt: nov20 }, s)).toBe(-875)
  })
  it('defective removes the whole refund', () => {
    expect(returnImpact({ saleId: 'a', qty: 1, refundAmount: 4000, backToStock: 'defective', returnedAt: nov20 }, s)).toBe(-4000)
  })
})

describe('stockLoss', () => {
  it('write-off loses full cost, vendor return loses only the shortfall', () => {
    expect(stockLoss({ type: 'write_off', qty: 2, value: 0, costOfItems: 6250, at: nov20 })).toBe(6250)
    expect(stockLoss({ type: 'vendor_return', qty: 2, value: 6000, costOfItems: 6250, at: nov20 })).toBe(250)
    expect(stockLoss({ type: 'vendor_return', qty: 2, value: 6250, costOfItems: 6250, at: nov20 })).toBe(0)
  })
})

describe('computeStats', () => {
  it('daily: earnings, profit minus chai, below/above range', () => {
    const s = computeStats({
      ...base,
      period: getPeriod('day', nov20),
      sales: [sale('a', 3000), sale('b', 5000)],
      expenses: [
        { type: 'chai', amount: 200, month: '2026-11', at: nov20 },
        { type: 'month_end', amount: 50_000, month: '2026-11', at: nov20 },
      ],
    })
    expect(s.earning).toBe(8000)
    expect(s.saleProfit).toBe(1750)
    expect(s.chai).toBe(200)
    expect(s.monthEnd).toBe(0) // month-end expenses only in monthly view
    expect(s.profit).toBe(1550)
    expect(s.belowMin).toEqual({ count: 1, gap: 500 })
    expect(s.aboveMax).toEqual({ count: 1, gap: 500 })
    expect(s.days).toEqual([{ day: '2026-11-20', earning: 8000, profit: 1550, pieces: 2 }])
  })

  it('monthly: subtracts month-end expenses and stock losses', () => {
    const s = computeStats({
      ...base,
      period: getPeriod('month', nov20),
      sales: [sale('a', 5000)],
      expenses: [
        { type: 'chai', amount: 200, month: '2026-11', at: nov20 },
        { type: 'month_end', amount: 1000, month: '2026-11', at: nov20 },
        { type: 'month_end', amount: 9999, month: '2026-10', at: nov20 },
      ],
      vendorReturns: [{ type: 'write_off', qty: 1, value: 0, costOfItems: 3125, at: nov20 }],
    })
    expect(s.profit).toBe(1875 - 200 - 1000 - 3125)
    expect(s.days).toHaveLength(30)
  })

  it('returns reduce earning and profit on the return day only', () => {
    const nov21 = at('2026-11-21T07:00:00Z')
    const input = {
      ...base,
      sales: [sale('a', 4000)],
      returns: [{ saleId: 'a', qty: 1, refundAmount: 4000, backToStock: 'stock' as const, returnedAt: nov21 }],
    }
    const day1 = computeStats({ ...input, period: getPeriod('day', nov20) })
    expect(day1.earning).toBe(4000)
    expect(day1.profit).toBe(875)
    const day2 = computeStats({ ...input, period: getPeriod('day', nov21) })
    expect(day2.earning).toBe(-4000)
    expect(day2.profit).toBe(-875)
    const week = computeStats({ ...input, period: getPeriod('week', nov20) })
    expect(week.earning).toBe(0)
    expect(week.profit).toBe(0)
  })

  it('ignores soft-deleted rows and sales outside the period', () => {
    const s = computeStats({
      ...base,
      period: getPeriod('day', nov20),
      sales: [sale('a', 4000, { deletedAt: 1 }), sale('b', 4000, { soldAt: at('2026-11-19T07:00:00Z') })],
    })
    expect(s.earning).toBe(0)
    expect(s.piecesSold).toBe(0)
  })

  it('uses piece range when the sale is for a piece', () => {
    const s = computeStats({
      ...base,
      ranges: new Map([['silk', { minPrice: 100, maxPrice: 200 }], ['p1', { minPrice: 5000, maxPrice: 6000 }]]),
      period: getPeriod('day', nov20),
      sales: [sale('a', 4000, { pieceId: 'p1' })],
    })
    expect(s.belowMin.count).toBe(1)
    expect(s.aboveMax.count).toBe(0)
  })
})
