export interface StockLot {
  qtyRemaining: number
  unitCost: number
  totalCost: number
  deletedAt?: number
}

export const stockValue = (lots: StockLot[]): number =>
  lots.filter((l) => !l.deletedAt).reduce((s, l) => s + l.qtyRemaining * l.unitCost, 0)

/** Share of the lot cost already recovered by sales (0..n, 1 = paid for itself). */
export const lotRecovery = (salesTotal: number, lot: Pick<StockLot, 'totalCost'>): number =>
  lot.totalCost > 0 ? salesTotal / lot.totalCost : 0
