export interface Margins {
  min: number
  suggested: number
  max: number
}

export const defaultMargins: Margins = { min: 0.1, suggested: 0.25, max: 0.4 }

export const unitCost = (totalCost: number, qty: number): number =>
  qty > 0 ? Math.round(totalCost / qty) : 0

export const roundUp50 = (value: number): number => Math.ceil(value / 50) * 50

export const suggestPrices = (cost: number, m: Margins = defaultMargins) => ({
  minPrice: roundUp50(cost * (1 + m.min)),
  suggestedPrice: roundUp50(cost * (1 + m.suggested)),
  maxPrice: roundUp50(cost * (1 + m.max)),
})

export type PriceFlag = 'red' | 'yellow' | 'green'

export const priceFlag = (price: number, minPrice: number, suggestedPrice: number): PriceFlag =>
  price < minPrice ? 'red' : price < suggestedPrice ? 'yellow' : 'green'

const rs = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })
export const formatRs = (value: number): string => `Rs ${rs.format(value)}`
