# Business rules (code: src/lib/money.ts, src/lib/calc/)

## Cost and suggested prices
- unitCost = round(totalCost / qtyBought). One by one: `allocatePieceCosts` splits the total exactly; edited costs must still sum to the total.
- Default margins (owner edits in Settings): min +10%, ask +25%, max +40%, rounded UP to the next Rs 50.
- Example: 100,000 / 32 = 3,125 -> min 3,450, ask 3,950, max 4,400.

## Profit
- Sale profit = (unitSalePrice - unitCostSnapshot) x qty.
- Customer return back to stock: profit -(refund - cost x qty). Defective: profit -refund.
- Write-off loss = cost of items. Vendor return loss = max(0, cost - value recovered).
- Daily, weekly, bi-weekly profit = sale profit + returns impact - chai.
- Monthly profit (main P&L) also subtracts month-end expenses and stock losses.
- Earning = sale totals minus refunds, counted on the day of each entry. Past days never change.

## Periods (Asia/Karachi, UTC+5, no DST)
Day; Week Mon to Sun; Bi-weekly 1st to 15th and 16th to month end; Month.

## Dues
Owed per creditor = credit lot costs - payments - vendor returns settled as `reduce_dues`. Overpayment shows as "Paid extra" and does not reduce the total owed to others.
