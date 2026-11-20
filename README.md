# Shop Ledger

Offline-first PWA for a clothes shop: stock lots, sales, dues, expenses and profit.

```bash
npm install
cp .env.example .env.local   # fill Supabase URL and key
npm run dev
```

Database: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
Project rules for Claude Code: `CLAUDE.md`. Specs: `docs/`.
