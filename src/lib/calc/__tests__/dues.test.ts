import { describe, expect, it } from 'vitest'
import { owedByParty, totalOwed } from '../dues'
import { lotRecovery, stockValue } from '../stock'

describe('owedByParty', () => {
  it('credit lots minus payments minus dues-reducing returns', () => {
    const owed = owedByParty(
      [
        { partyId: 'v1', paymentType: 'credit', totalCost: 100_000 },
        { partyId: 'v1', paymentType: 'cash', totalCost: 50_000 },
        { partyId: 'v2', paymentType: 'credit', totalCost: 20_000 },
        { partyId: 'v2', paymentType: 'credit', totalCost: 5_000, deletedAt: 1 },
      ],
      [{ partyId: 'v1', amount: 30_000 }],
      [
        { partyId: 'v1', value: 6_250, settlement: 'reduce_dues', type: 'vendor_return' },
        { partyId: 'v2', value: 1_000, settlement: 'cash_refund', type: 'vendor_return' },
      ],
    )
    expect(owed.get('v1')).toBe(63_750)
    expect(owed.get('v2')).toBe(20_000)
    expect(totalOwed(owed)).toBe(83_750)
  })
  it('overpayment does not reduce the total owed to others', () => {
    const owed = owedByParty([{ partyId: 'v1', paymentType: 'credit', totalCost: 100 }], [{ partyId: 'v1', amount: 150 }], [])
    expect(owed.get('v1')).toBe(-50)
    expect(totalOwed(owed)).toBe(0)
  })
})

describe('stock', () => {
  it('stock value and lot recovery', () => {
    expect(stockValue([{ qtyRemaining: 10, unitCost: 3125, totalCost: 100_000 }, { qtyRemaining: 5, unitCost: 100, totalCost: 500, deletedAt: 1 }])).toBe(31_250)
    expect(lotRecovery(50_000, { totalCost: 100_000 })).toBe(0.5)
  })
})
