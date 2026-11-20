# Data model

Same tables in Dexie (local, camelCase) and Supabase Postgres (snake_case). Money = integer rupees.
Common fields: `id` (UUID made on device), `createdAt`, `updatedAt`, `deletedAt` (soft delete), `synced` (local only), `synced_at` (server only, server clock).

| Table | Fields |
| --- | --- |
| tagGroups | name, sort |
| tags | groupId, name |
| parties | name, phone, address, kind (seller/creditor) |
| lots | title, description, tagIds[], mode (whole/single), qtyBought, qtyRemaining, totalCost, unitCost, minPrice, suggestedPrice, maxPrice, paymentType (cash/credit), partyId, dueDate, lotPhotoId, billPhotoId |
| pieces | lotId, title, photoId, tagIds[], unitCost, minPrice, suggestedPrice, maxPrice, status (in_stock/sold/returned/written_off) |
| sales | lotId, pieceId, qty, unitSalePrice, total, unitCostSnapshot, paymentMethod (cash/easypaisa/jazzcash), photoId, soldBy, soldAt |
| partyPayments | partyId, lotId, amount, method, paidAt, note |
| customerReturns | saleId, qty, refundAmount, backToStock (stock/defective), returnedAt, note |
| vendorReturns | lotId, pieceIds[], qty, value, costOfItems, type (vendor_return/write_off), settlement (reduce_dues/cash_refund), photoId, at, note |
| expenses | type (chai/month_end), name, amount, month (YYYY-MM), at, note |
| profiles | id = auth user id, name, phone, role (owner/manager/worker), active |
| settings | key (margins, chaiDefault), value (json) |

Local only: `photos` (blob, uploaded flag), `workerItems` (copy of the `worker_items` view), `meta` (pull cursors), `outbox` (queued uploads).

Photos live in the private Storage bucket `photos` as `<photoId>.jpg`.
Migrations: `supabase/migrations/20261120000000_init.sql`, `20261121000000_sync_and_stock.sql`.
