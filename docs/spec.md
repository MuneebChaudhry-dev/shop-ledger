# Product spec (MVP)

Users: shop owner plus managers and workers he adds, on normal Android phones, often offline. English UI with familiar Urdu terms; Urdu typing works in every text field.

Out of scope for MVP: online store, social catalog, voice notes, customer credit (udhaar).

## Navigation
- Owner / manager tabs: Home, Stock, Sell, Stats, More (Dues, Sales and returns, Expenses, Tags, Users, Settings).
- Worker tabs: Items, Sell, Account. Workers never see cost, vendors, bills, stats or profit.

## Screens
| Route | Page | Who |
| --- | --- | --- |
| `/` | Home: today earning/profit/pieces, Sell, Add stock, Chai button | owner, manager |
| `/` , `/items` | Items with min / ask / max price | worker (all can open `/items`) |
| `/sell`, `/sell/:key` | Pick item, then photo, qty, price colour, payment | all |
| `/stock`, `/stock/new`, `/stock/:id` | Lots, add lot (whole / one by one), lot detail, edit, vendor return, write-off | owner, manager |
| `/stats` | Day / week / 2 weeks / month, chart, breakdown, sales list, tag filter | owner, manager |
| `/dues`, `/dues/:id` | Owed per creditor, record payment, call | owner, manager |
| `/sales`, `/sales/:id/return` | Recent sales, customer return | owner, manager |
| `/expenses` | Month-end expenses per month, chai total | owner, manager |
| `/settings` | Sync status, margins and chai (owner), backup, sign out | all |
| `/settings/tags`, `/settings/users` | Tag groups and tags; add / disable staff | owner |

## Key rules
- Price colour: red below min, yellow min up to ask, green ask or above. No confirm dialog.
- One by one lots: piece costs must add up exactly to the lot total ("Rs X left to assign").
- Corrections are new records: customer return, vendor return, write-off. Lots can be deleted only before any sale or return.
- Chai is the only expense in daily profit; month-end expenses count only in the monthly P&L.
