export interface CreditLot {
  partyId?: string
  paymentType: 'cash' | 'credit'
  totalCost: number
  deletedAt?: number
}
export interface Payment {
  partyId: string
  amount: number
  deletedAt?: number
}
export interface DuesReturn {
  partyId?: string
  value: number
  settlement?: 'reduce_dues' | 'cash_refund'
  type: 'vendor_return' | 'write_off'
  deletedAt?: number
}

/** Amount still owed per creditor: credit lot costs - payments - vendor returns that reduce dues. */
export const owedByParty = (lots: CreditLot[], payments: Payment[], returns: DuesReturn[]): Map<string, number> => {
  const owed = new Map<string, number>()
  const add = (id: string | undefined, amount: number) => {
    if (!id) return
    owed.set(id, (owed.get(id) ?? 0) + amount)
  }
  for (const l of lots) if (!l.deletedAt && l.paymentType === 'credit') add(l.partyId, l.totalCost)
  for (const p of payments) if (!p.deletedAt) add(p.partyId, -p.amount)
  for (const r of returns)
    if (!r.deletedAt && r.type === 'vendor_return' && r.settlement === 'reduce_dues') add(r.partyId, -r.value)
  return owed
}

export const totalOwed = (owed: Map<string, number>): number =>
  [...owed.values()].reduce((s, v) => s + Math.max(0, v), 0)
