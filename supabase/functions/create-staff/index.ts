// Owner-only: creates a login for a manager or worker.
// Deploy: npx supabase functions deploy create-staff
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: caller } = await admin.auth.getUser(token)
    if (!caller.user) return json({ error: 'Not signed in' }, 401)

    const { data: me } = await admin.from('profiles').select('role, active').eq('id', caller.user.id).single()
    if (me?.role !== 'owner' || !me.active) return json({ error: 'Only the owner can add staff' }, 403)

    const { email, password, name, phone, role } = await req.json()
    if (!email || !password || password.length < 6 || !name || !['manager', 'worker'].includes(role)) {
      return json({ error: 'Name, login, a password of 6+ characters and a role are required' }, 400)
    }

    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !created.user) return json({ error: error?.message ?? 'Could not create user' }, 400)

    const now = Date.now()
    const { error: pErr } = await admin.from('profiles').insert({
      id: created.user.id, name, phone: phone || null, role, active: true, created_at: now, updated_at: now,
    })
    if (pErr) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: pErr.message }, 400)
    }
    return json({ id: created.user.id })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500)
  }
})
