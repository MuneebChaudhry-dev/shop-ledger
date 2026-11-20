# Architecture

## Offline-first flow (src/lib/db.ts, src/lib/sync.ts)
1. UI calls an action in `src/lib/actions.ts`. It writes to Dexie and adds an `outbox` row in one transaction (`saveRecord` / `patchRecord`).
2. `syncNow()` runs on start, every 30 s, when the phone comes online, when the app is reopened, and 0.5 s after each save.
3. Push: outbox rows oldest first. Append-only tables (sales, returns, payments) use a plain INSERT; a duplicate-key error (23505) means an earlier try landed. Other tables upsert. A failing row is retried next round and does not block the others; after 10 tries it is parked and shown in Settings ("Retry stuck changes").
4. Photos upload after records: `<id>.jpg`, bill photos under `bills/` (owner and manager only). "Already exists" counts as uploaded.
5. Pull always runs, even if a push failed: rows ordered by (`synced_at`, id) with keyset paging, server clock, 2 min overlap on each run. A local row that is unsynced and newer is kept until pushed. Workers pull only tags, their profile and the `worker_items` view.
6. `navigator.storage.persist()` is requested; Settings has a JSON backup download.

## Stock is server-owned
- Triggers: sale insert -> cost snapshot (before) and stock down (after); customer return to stock -> stock up; vendor return / write-off -> stock down and piece status.
- `guard_stock_columns` ignores client values for `lots.qty_remaining` and `pieces.status` on update, and `reset_stock_on_insert` starts every new lot at `qty_bought` (a lot created offline arrives already reduced; the queued sales then apply once each).
- `last_write_wins` skips an update whose `updated_at` is older than the stored row and never undoes a soft delete.
- The client mirrors these changes locally for instant feedback; the next pull brings the server value.

## Auth and roles
- Supabase email/password. Staff sign in with a username, mapped to `<username>@staff.shopledger.app`.
- Owner adds staff through the `create-staff` edge function (service role stays on the server).
- Session and profile are cached, so the app opens offline after the first sign in. Signing out warns if changes are unsynced, then wipes local data. Signing in as a different person is refused while the previous person has unsynced changes. A disabled user or a role change wipes local data.

| Capability | owner | manager | worker |
| --- | --- | --- | --- |
| Items list with prices, record sale | yes | yes | yes |
| Lots, costs, vendors, bills, add stock, returns | yes | yes | no |
| Dues, expenses, stats, profit | yes | yes | no |
| Users, tags, margins, chai amount | yes | no | no |

Enforced twice: `can(role, action)` in `src/lib/roles.ts` for the UI, Postgres RLS for data. Workers read `worker_items` (no cost columns) and cannot read sales back (rows carry the cost snapshot). Note: `min_price` is shown to workers and is roughly cost +10%.

## PWA and hosting
vite-plugin-pwa (autoUpdate, app shell and Urdu font precached). Needs HTTPS. `vercel.json` and `public/_redirects` send all routes to `index.html`.
