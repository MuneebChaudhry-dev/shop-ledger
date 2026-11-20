import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { MoneyInput } from '../components/MoneyInput'
import { Button, Card, Field, Input, PageHeader, Row } from '../components/ui'
import { signOut, useAuth } from '../lib/auth'
import { exportBackup } from '../lib/backup'
import { formatRs, suggestPrices } from '../lib/money'
import { can } from '../lib/roles'
import { saveSetting, useChaiDefault, useMargins } from '../lib/settings'
import { db } from '../lib/db'
import { MAX_TRIES, retryStuck, syncNow, useSyncStore } from '../lib/sync'

const pct = (v: number) => Math.round(v * 100)

const Margins = () => {
  const margins = useMargins()
  const [min, setMin] = useState(pct(margins.min))
  const [suggested, setSuggested] = useState(pct(margins.suggested))
  const [max, setMax] = useState(pct(margins.max))
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setMin(pct(margins.min))
    setSuggested(pct(margins.suggested))
    setMax(pct(margins.max))
  }, [margins])
  const valid = min <= suggested && suggested <= max
  const example = suggestPrices(3125, { min: min / 100, suggested: suggested / 100, max: max / 100 })
  const num = (v: string) => Math.min(500, Number(v.replace(/\D/g, '')) || 0)
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Suggested price margins</h2>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Min %"><Input inputMode="numeric" dir="ltr" value={min} onChange={(e) => setMin(num(e.target.value))} /></Field>
        <Field label="Ask %"><Input inputMode="numeric" dir="ltr" value={suggested} onChange={(e) => setSuggested(num(e.target.value))} /></Field>
        <Field label="Max %"><Input inputMode="numeric" dir="ltr" value={max} onChange={(e) => setMax(num(e.target.value))} /></Field>
      </div>
      <p className="text-sm text-slate-500">
        Cost {formatRs(3125)} gives {formatRs(example.minPrice)} / {formatRs(example.suggestedPrice)} / {formatRs(example.maxPrice)}
      </p>
      {!valid && <p className="text-sm text-red-600">Min must be at most Ask, and Ask at most Max.</p>}
      <Button
        className="w-full"
        disabled={!valid}
        onClick={async () => {
          await saveSetting('margins', { min: min / 100, suggested: suggested / 100, max: max / 100 })
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        }}
      >
        {saved ? 'Saved' : 'Save margins'}
      </Button>
    </Card>
  )
}

const Chai = () => {
  const chai = useChaiDefault()
  const [value, setValue] = useState<number | null>(chai)
  useEffect(() => setValue(chai), [chai])
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Daily chai amount</h2>
      <MoneyInput value={value} onChange={setValue} />
      <Button className="w-full" variant="secondary" disabled={!value || value === chai} onClick={() => value && void saveSetting('chaiDefault', value)}>Save</Button>
    </Card>
  )
}

export const SettingsPage = () => {
  const navigate = useNavigate()
  const profile = useAuth((s) => s.profile)
  const { pending, lastSyncedAt, lastError } = useSyncStore()
  const [warn, setWarn] = useState(false)
  const isOwner = can(profile?.role, 'admin.manage')
  const stuck = useLiveQuery(() => db.outbox.where('tries').aboveOrEqual(MAX_TRIES).toArray(), [])
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" />
      <Card>
        <Row label="Signed in as">{profile?.name} ({profile?.role})</Row>
        <Row label="Waiting to sync">{pending}</Row>
        <Row label="Last synced">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Not yet'}</Row>
        {lastError && <p className="mt-1 break-words text-sm text-red-600">{lastError}</p>}
        <Button variant="secondary" className="mt-2 w-full" onClick={() => void syncNow()}>Sync now</Button>
      </Card>
      {!!stuck?.length && (
        <Card className="space-y-2 border-amber-300 bg-amber-50">
          <p className="font-medium">{stuck.length} changes could not upload</p>
          {stuck.slice(0, 5).map((j) => <p key={j.id} className="break-words text-xs text-slate-600">{j.lastError}</p>)}
          <p className="text-sm text-slate-600">They are kept on this phone. Send a screenshot of this to the developer, or retry.</p>
          <Button variant="secondary" className="w-full" onClick={() => void retryStuck()}>Retry stuck changes</Button>
        </Card>
      )}
      {isOwner && <Margins />}
      {isOwner && <Chai />}
      {isOwner && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => navigate('/settings/tags')}>Tags</Button>
          <Button variant="secondary" onClick={() => navigate('/settings/users')}>Users</Button>
        </div>
      )}
      {can(profile?.role, 'stock.manage') && (
        <Button variant="secondary" className="w-full" onClick={() => void exportBackup()}>Download backup (JSON)</Button>
      )}
      {warn ? (
        <Card className="space-y-2 border-red-300 bg-red-50">
          <p className="text-sm text-red-700">{pending} changes are not uploaded yet. Signing out now deletes them from this phone.</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setWarn(false)}>Keep</Button>
            <Button variant="danger" className="flex-1" onClick={() => void signOut(true)}>Sign out anyway</Button>
          </div>
        </Card>
      ) : (
        <Button variant="ghost" className="w-full text-red-600" onClick={async () => { if (!(await signOut())) setWarn(true) }}>Sign out</Button>
      )}
    </div>
  )
}
