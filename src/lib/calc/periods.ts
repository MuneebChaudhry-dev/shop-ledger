/** Pakistan Standard Time is UTC+5 with no daylight saving. */
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export type PeriodKind = 'day' | 'week' | 'biweek' | 'month'

export interface Period {
  kind: PeriodKind
  start: number // inclusive, epoch ms
  end: number // exclusive, epoch ms
  label: string
}

/** 'YYYY-MM-DD' of a timestamp in Pakistan time. */
export const dayKey = (ts: number): string => new Date(ts + PKT_OFFSET_MS).toISOString().slice(0, 10)

/** 'YYYY-MM' of a timestamp in Pakistan time. */
export const monthKey = (ts: number): string => dayKey(ts).slice(0, 7)

/** Epoch ms of 00:00 Pakistan time on the given 'YYYY-MM-DD'. */
export const startOfDayKey = (key: string): number => Date.parse(`${key}T00:00:00Z`) - PKT_OFFSET_MS

const parts = (ts: number) => {
  const d = new Date(ts + PKT_OFFSET_MS)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), dow: d.getUTCDay() }
}

const pktMidnight = (y: number, m: number, day: number) => Date.UTC(y, m, day) - PKT_OFFSET_MS

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (ts: number) => {
  const p = parts(ts)
  return `${p.day} ${MONTHS[p.m]}`
}

export const formatDayKey = (key: string): string => fmt(startOfDayKey(key))

export const getPeriod = (kind: PeriodKind, ref: number): Period => {
  const { y, m, day, dow } = parts(ref)
  if (kind === 'day') {
    const start = pktMidnight(y, m, day)
    return { kind, start, end: start + DAY_MS, label: fmt(start) }
  }
  if (kind === 'week') {
    const back = (dow + 6) % 7 // Monday = 0
    const start = pktMidnight(y, m, day - back)
    const end = start + 7 * DAY_MS
    return { kind, start, end, label: `${fmt(start)} to ${fmt(end - DAY_MS)}` }
  }
  if (kind === 'biweek') {
    const first = day <= 15
    const start = pktMidnight(y, m, first ? 1 : 16)
    const end = first ? pktMidnight(y, m, 16) : pktMidnight(y, m + 1, 1)
    return { kind, start, end, label: `${fmt(start)} to ${fmt(end - DAY_MS)}` }
  }
  const start = pktMidnight(y, m, 1)
  return { kind, start, end: pktMidnight(y, m + 1, 1), label: `${MONTHS[m]} ${y}` }
}

/** Period before or after the given one (step = -1 or 1). */
export const shiftPeriod = (p: Period, step: -1 | 1): Period =>
  getPeriod(p.kind, step === 1 ? p.end + 1 : p.start - 1)

export const dayKeysIn = (p: Period): string[] => {
  const keys: string[] = []
  for (let t = p.start; t < p.end; t += DAY_MS) keys.push(dayKey(t))
  return keys
}

export const inPeriod = (ts: number, p: Period): boolean => ts >= p.start && ts < p.end
