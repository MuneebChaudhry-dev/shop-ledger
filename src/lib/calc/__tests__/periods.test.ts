import { describe, expect, it } from 'vitest'
import { dayKey, dayKeysIn, getPeriod, shiftPeriod, startOfDayKey } from '../periods'

// 2026-11-20 is a Friday. 23:30 PKT on Nov 20 = 18:30 UTC.
const fri2330 = Date.parse('2026-11-20T18:30:00Z')
// 00:30 PKT on Nov 21 = 19:30 UTC on Nov 20.
const sat0030 = Date.parse('2026-11-20T19:30:00Z')

describe('dayKey', () => {
  it('uses Pakistan time, not UTC', () => {
    expect(dayKey(fri2330)).toBe('2026-11-20')
    expect(dayKey(sat0030)).toBe('2026-11-21')
  })
  it('round-trips with startOfDayKey', () => {
    expect(dayKey(startOfDayKey('2026-03-01'))).toBe('2026-03-01')
    expect(startOfDayKey('2026-11-21')).toBe(Date.parse('2026-11-20T19:00:00Z'))
  })
})

describe('getPeriod', () => {
  it('day', () => {
    expect(dayKeysIn(getPeriod('day', fri2330))).toEqual(['2026-11-20'])
  })
  it('week runs Monday to Sunday', () => {
    const p = getPeriod('week', fri2330)
    expect(dayKeysIn(p)[0]).toBe('2026-11-16')
    expect(dayKeysIn(p).at(-1)).toBe('2026-11-22')
  })
  it('week of a Sunday still starts the previous Monday', () => {
    expect(dayKeysIn(getPeriod('week', Date.parse('2026-11-22T10:00:00Z')))[0]).toBe('2026-11-16')
  })
  it('bi-weekly is 1st to 15th and 16th to month end', () => {
    expect(dayKeysIn(getPeriod('biweek', Date.parse('2026-02-10T10:00:00Z')))).toHaveLength(15)
    const second = getPeriod('biweek', Date.parse('2026-02-20T10:00:00Z'))
    expect(dayKeysIn(second)[0]).toBe('2026-02-16')
    expect(dayKeysIn(second).at(-1)).toBe('2026-02-28')
  })
  it('month covers the whole month in PKT', () => {
    const p = getPeriod('month', fri2330)
    expect(dayKeysIn(p)).toHaveLength(30)
    expect(p.label).toBe('Nov 2026')
  })
  it('a sale at 00:30 PKT on Dec 1 belongs to December', () => {
    expect(getPeriod('month', Date.parse('2026-11-30T19:30:00Z')).label).toBe('Dec 2026')
  })
})

describe('shiftPeriod', () => {
  it('moves across month and year boundaries', () => {
    const dec = getPeriod('month', Date.parse('2026-12-10T10:00:00Z'))
    expect(shiftPeriod(dec, 1).label).toBe('Jan 2027')
    expect(shiftPeriod(dec, -1).label).toBe('Nov 2026')
  })
  it('moves bi-weekly halves', () => {
    const p = getPeriod('biweek', Date.parse('2026-11-20T10:00:00Z'))
    expect(dayKeysIn(shiftPeriod(p, -1))[0]).toBe('2026-11-01')
    expect(dayKeysIn(shiftPeriod(p, 1))[0]).toBe('2026-12-01')
  })
})
