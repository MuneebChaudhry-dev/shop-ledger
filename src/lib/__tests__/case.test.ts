import { describe, expect, it } from 'vitest'
import { tableName, toLocal, toServer } from '../case'

describe('case mapping', () => {
  it('maps table names', () => {
    expect(tableName('partyPayments')).toBe('party_payments')
    expect(tableName('lots')).toBe('lots')
  })
  it('local to server drops local-only fields and turns undefined into null', () => {
    expect(toServer({ id: '1', qtyRemaining: 3, synced: 0, dueDate: undefined })).toEqual({ id: '1', qty_remaining: 3, due_date: null })
  })
  it('server to local camelCases and drops nulls', () => {
    expect(toLocal({ id: '1', unit_cost_snapshot: 3125, piece_id: null })).toEqual({ id: '1', unitCostSnapshot: 3125 })
  })
})
