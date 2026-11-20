export interface Margins {
  min: number
  suggested: number
  max: number
}

export const defaultMargins: Margins = { min: 0.1, suggested: 0.25, max: 0.4 }

export const unitCost = (totalCost: number, qty: number): number =>
  qty > 0 ? Math.round(totalCost / qty) : 0

/** Round up to the next Rs 50 (float noise like 2200.0000001 is ignored). */
export const roundUp50 = (value: number): number => Math.ceil(Math.round(value * 100) / 100 / 50) * 50

export interface PriceSet {
  minPrice: number
  suggestedPrice: number
  maxPrice: number
}

export const suggestPrices = (cost: number, m: Margins = defaultMargins): PriceSet => ({
  minPrice: roundUp50(cost * (1 + m.min)),
  suggestedPrice: roundUp50(cost * (1 + m.suggested)),
  maxPrice: roundUp50(cost * (1 + m.max)),
})

export type PriceFlag = 'red' | 'yellow' | 'green'

export const priceFlag = (price: number, minPrice: number, suggestedPrice: number): PriceFlag =>
  price < minPrice ? 'red' : price < suggestedPrice ? 'yellow' : 'green'

/** Split a lot total into per-piece costs that add up exactly (remainder spread on the first pieces). */
export const allocatePieceCosts = (totalCost: number, qty: number): number[] => {
  if (qty <= 0) return []
  const base = Math.floor(totalCost / qty)
  const remainder = totalCost - base * qty
  return Array.from({ length: qty }, (_, i) => base + (i < remainder ? 1 : 0))
}

/** Rupees still to assign so piece costs equal the lot total (negative = over-assigned). */
export const leftToAssign = (totalCost: number, pieceCosts: number[]): number =>
  totalCost - pieceCosts.reduce((s, c) => s + c, 0)

/** Pakistani grouping (1,00,000), done by hand because Intl support for it varies by device. */
export const groupLakh = (value: number): string => {
  const digits = String(Math.round(Math.abs(value)))
  if (digits.length <= 3) return digits
  const last3 = digits.slice(-3)
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${rest},${last3}`
}

export const formatRs = (value: number): string => `${value < 0 ? '-' : ''}Rs ${groupLakh(value)}`

/** Parse a typed rupee amount ("1,00,000" or "3500") into an integer, or null. */
export const parseRs = (input: string): number | null => {
  const clean = input.replace(/[,\s]/g, '').replace(/^rs\.?/i, '')
  if (!/^\d+$/.test(clean)) return null
  return Number(clean)
}
