import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_LS_DB_URL as string;
const key = import.meta.env.VITE_LS_DB_PK as string;

if (!url || !key) console.warn('Supabase env vars missing: copy .env.example to .env.local')

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
})
