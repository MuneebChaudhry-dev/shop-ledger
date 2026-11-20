# Shop Ledger

Offline-first PWA for one clothes shop: stock lots, sales with photos, dues, expenses, daily to monthly profit. Owner, manager and worker roles.

Stack: Vite + React 19 + TypeScript, Tailwind v4, Dexie (IndexedDB), Supabase (Auth, Postgres, Storage), vite-plugin-pwa, Recharts, Zustand, React Router.

## Commands
- `npm run dev` / `npm run build` / `npm run lint`
- DB schema changes: add a new file in `supabase/migrations/`, never edit an applied one.

## Rules
- IMPORTANT: Every write goes to Dexie first, then the outbox in `src/lib/sync.ts` uploads it. Never call Supabase directly from a component.
- IMPORTANT: Money is integer rupees (`number`, no decimals). Use helpers in `src/lib/money.ts` for cost, margins and rounding.
- Each sale stores `unitCostSnapshot`; never recalculate past profit from the current lot cost.
- Corrections are new records (return, write-off, adjust), not edits to old sales or lots.
- Role checks use `can()` from `src/lib/roles.ts`; the matching RLS policy in Supabase must also exist.
- Records use device-made UUIDs (`crypto.randomUUID()`) plus `updatedAt`, `deletedAt`, `synced`.
- Text fields accept Urdu: add `dir="auto"` to inputs and text that show user-typed content.
- Use named exports, not default exports (except route pages if a router needs it).
- Put pages in `src/pages/`, shared UI in `src/components/`, data and logic in `src/lib/`.

## Reference (read when the task touches it)
- Features and screens: `.claude/docs/spec.md`
- Tables and fields: `.claude/docs/data-model.md`
- Pricing, profit, stats, returns: `.claude/docs/business-rules.md`
- Sync, roles, security: `.claude/docs/architecture.md`
