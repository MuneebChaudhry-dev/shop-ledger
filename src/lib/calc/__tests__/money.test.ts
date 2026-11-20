import { describe, expect, it } from 'vitest'
import { allocatePieceCosts, formatRs, leftToAssign, parseRs, priceFlag, roundUp50, suggestPrices, unitCost } from '../../money'

describe('unitCost', () => {
  it('divides and rounds to whole rupees', () => {
    expect(unitCost(100_000, 32)).toBe(3125)
    expect(unitCost(1000, 3)).toBe(333)
  })
  it('returns 0 for zero qty', () => expect(unitCost(500, 0)).toBe(0))
})

describe('roundUp50', () => {
  it('rounds up to the next 50', () => {
    expect(roundUp50(3437.5)).toBe(3450)
    expect(roundUp50(3901)).toBe(3950)
  })
  it('keeps exact multiples despite float noise', () => {
    expect(roundUp50(2000 * 1.1)).toBe(2200)
    expect(roundUp50(4000 * 1.25)).toBe(5000)
  })
})

describe('suggestPrices', () => {
  it('matches the silk lot example from the plan', () => {
    expect(suggestPrices(3125)).toEqual({ minPrice: 3450, suggestedPrice: 3950, maxPrice: 4400 })
  })
  it('uses custom margins', () => {
    expect(suggestPrices(1000, { min: 0, suggested: 0.5, max: 1 })).toEqual({ minPrice: 1000, suggestedPrice: 1500, maxPrice: 2000 })
  })
})

describe('priceFlag', () => {
  it('red below min, yellow up to suggested, green at or above suggested', () => {
    expect(priceFlag(3000, 3450, 3950)).toBe('red')
    expect(priceFlag(3450, 3450, 3950)).toBe('yellow')
    expect(priceFlag(3949, 3450, 3950)).toBe('yellow')
    expect(priceFlag(3950, 3450, 3950)).toBe('green')
    expect(priceFlag(9000, 3450, 3950)).toBe('green')
  })
})

describe('allocatePieceCosts', () => {
  it('always sums to the lot total', () => {
    for (const [total, qty] of [[100_000, 32], [1000, 3], [7, 16], [0, 4]] as const) {
      const costs = allocatePieceCosts(total, qty)
      expect(costs).toHaveLength(qty)
      expect(costs.reduce((a, b) => a + b, 0)).toBe(total)
      expect(Math.max(...costs) - Math.min(...costs)).toBeLessThanOrEqual(1)
    }
  })
  it('handles zero qty', () => expect(allocatePieceCosts(100, 0)).toEqual([]))
})

describe('leftToAssign', () => {
  it('shows remaining and over-assigned amounts', () => {
    expect(leftToAssign(10_000, [3000, 3000])).toBe(4000)
    expect(leftToAssign(10_000, [6000, 6000])).toBe(-2000)
  })
})

describe('formatRs / parseRs', () => {
  it('formats with Pakistani grouping', () => {
    expect(formatRs(100000)).toBe('Rs 1,00,000')
    expect(formatRs(-125)).toBe('-Rs 125')
    expect(formatRs(12_34_56_789)).toBe('Rs 12,34,56,789')
    expect(formatRs(1000)).toBe('Rs 1,000')
    expect(formatRs(0)).toBe('Rs 0')
  })
  it('parses typed amounts', () => {
    expect(parseRs('1,00,000')).toBe(100000)
    expect(parseRs('Rs 3500')).toBe(3500)
    expect(parseRs('35.5')).toBeNull()
    expect(parseRs('')).toBeNull()
  })
})
