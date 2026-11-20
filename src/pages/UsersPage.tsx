import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { UserCheck, UserPlus, UserX } from 'lucide-react'
import { Badge, Button, Card, Field, Input, PageHeader, PasswordInput, Segmented, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { db, patchRecord, type Profile } from '../lib/db'
import { createStaff } from '../lib/staff'
import { queueSync } from '../lib/sync'
import { ErrorAlert } from '../components/Alert'
import { Summary } from '../components/ConfirmDialog'
import { askConfirm } from '../lib/confirm'

export const UsersPage = () => {
  const me = useAuth((s) => s.profile)
  const users = useLiveQuery(() => db.profiles.toArray(), [])
  const [form, setForm] = useState({ name: '', username: '', password: '', phone: '', role: 'worker' as 'worker' | 'manager' })
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  if (!users) return <Spinner />
  return (
    <div className="space-y-4">
      <PageHeader title="Users" back />
      {users.sort((a, b) => a.name.localeCompare(b.name)).map((u) => (
        <Card key={u.id} className="flex items-center justify-between p-3">
          <div>
            <p className="font-medium" dir="auto">{u.name}</p>
            <div className="flex gap-1"><Badge tone="teal">{u.role}</Badge>{!u.active && <Badge tone="red">Disabled</Badge>}</div>
          </div>
          {u.id !== me?.id && u.role !== 'owner' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const ok = await askConfirm(
                  u.active
                    ? { title: `Disable ${u.name}?`, tone: 'danger', confirmLabel: 'Yes, disable', body: 'They lose access, and their phone is cleared the next time they open the app online. You can enable them again later.' }
                    : { title: `Enable ${u.name}?`, confirmLabel: 'Yes, enable', body: `They can sign in again as ${u.role}.` },
                )
                if (!ok) return
                await patchRecord<Profile>('profiles', u.id, { active: !u.active })
                queueSync()
              }}
            >
              {u.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
              {u.active ? 'Disable' : 'Enable'}
            </Button>
          )}
        </Card>
      ))}

      <Card className="space-y-3">
        <h2 className="font-semibold">Add a manager or worker</h2>
        <Segmented value={form.role} onChange={(role) => setForm({ ...form, role })} options={[{ value: 'worker', label: 'Worker' }, { value: 'manager', label: 'Manager' }]} />
        <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Username" hint="Letters and numbers, used to sign in"><Input dir="ltr" autoCapitalize="none" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() })} /></Field>
        <Field label="Password" hint="At least 6 characters"><PasswordInput autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Phone (optional)"><Input dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <ErrorAlert error={error} onClose={() => setError(undefined)} />
        <Button
          className="w-full"
          disabled={busy || !form.name.trim() || !form.username || form.password.length < 6}
          onClick={async () => {
            const ok = await askConfirm({
              title: `Add ${form.name.trim()} as ${form.role}?`,
              confirmLabel: `Yes, add ${form.role}`,
              tone: form.role === 'manager' ? 'danger' : 'primary',
              body: (
                <div className="space-y-2">
                  <Summary rows={[['Name', form.name.trim()], ['Username', form.username], ['Role', form.role], ['Phone', form.phone.trim() || undefined]]} />
                  <p className="font-medium text-amber-700">
                    {form.role === 'manager' ? 'A manager can see costs, profit, dues and all stock.' : 'A worker sees only items and prices, and can record sales.'}
                  </p>
                </div>
              ),
            })
            if (!ok) return
            setBusy(true)
            setError(undefined)
            try {
              await createStaff({ ...form, name: form.name.trim(), phone: form.phone.trim() || undefined })
              setForm({ name: '', username: '', password: '', phone: '', role: 'worker' })
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not add user')
            } finally {
              setBusy(false)
            }
          }}
        >
          <UserPlus className="size-5" />
          {busy ? 'Adding...' : `Add ${form.role}`}
        </Button>
      </Card>
    </div>
  )
}
