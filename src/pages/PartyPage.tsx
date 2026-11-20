import { useLiveQuery } from 'dexie-react-hooks'
import { Phone, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { MoneyInput } from '../components/MoneyInput'
import { Button, Card, EmptyState, Field, Input, PageHeader, Row, Segmented, Spinner } from '../components/ui'
import { recordPayment } from '../lib/actions'
import { db } from '../lib/db'
import { formatRs } from '../lib/money'
import { useOwed } from '../lib/useDues'
import { ErrorAlert } from '../components/Alert'
import { Summary } from '../components/ConfirmDialog'
import { askConfirm } from '../lib/confirm'

export const PartyPage = () => {
  const { id = '' } = useParams()
  const owed = useOwed()
  const data = useLiveQuery(async () => {
    const party = await db.parties.get(id)
    const lots = (await db.lots.where('partyId').equals(id).toArray()).filter((l) => !l.deletedAt && l.paymentType === 'credit')
    const payments = (await db.partyPayments.where('partyId').equals(id).toArray()).filter((p) => !p.deletedAt).sort((a, b) => b.paidAt - a.paidAt)
    return { party, lots, payments }
  }, [id])
  const [amount, setAmount] = useState<number | null>(null)
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()

  if (!data || !owed) return <Spinner />
  const { party, lots, payments } = data
  if (!party) return <EmptyState title="Creditor not found" />
  const due = owed.get(id) ?? 0

  return (
    <div className="space-y-4">
      <PageHeader title={party.name} back />
      <Card>
        <Row label="Still owed">{formatRs(Math.max(0, due))}</Row>
        {due < 0 && <Row label="Paid extra">{formatRs(-due)}</Row>}
        {party.phone && <Row label="Phone"><span dir="ltr">{party.phone}</span></Row>}
        {party.address && <Row label="Address">{party.address}</Row>}
        {party.phone && (
          <a href={`tel:${party.phone}`} className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 font-medium">
            <Phone className="size-4" />Call
          </a>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Record a payment</h2>
        <MoneyInput value={amount} onChange={setAmount} placeholder={due > 0 ? String(due) : '0'} />
        <Segmented value={method} onChange={setMethod} options={[{ value: 'cash', label: 'Cash' }, { value: 'easypaisa', label: 'Easypaisa' }, { value: 'jazzcash', label: 'JazzCash' }, { value: 'bank', label: 'Bank' }]} />
        <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <ErrorAlert error={error} onClose={() => setError(undefined)} />
        <Button
          className="w-full"
          disabled={!amount}
          onClick={async () => {
            const ok = await askConfirm({
              title: `Pay ${formatRs(amount ?? 0)} to ${party.name}?`,
              confirmLabel: 'Yes, save payment',
              body: <Summary rows={[['Amount', formatRs(amount ?? 0)], ['Method', method], ['Owed before', formatRs(Math.max(0, due))], ['Owed after', formatRs(Math.max(0, due - (amount ?? 0)))], ['Note', note.trim() || undefined]]} />,
            })
            if (!ok) return
            try {
              await recordPayment({ partyId: id, amount: amount ?? 0, method, note: note.trim() || undefined })
              setAmount(null)
              setNote('')
              setError(undefined)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not save')
            }
          }}
        >
          <Wallet className="size-5" />Save payment
        </Button>
      </Card>

      <div>
        <h2 className="mb-1 font-semibold">Stock on credit</h2>
        {lots.map((l) => (
          <Row key={l.id} label={new Date(l.createdAt).toLocaleDateString()}>
            <Link to={`/stock/${l.id}`} className="text-teal-700 underline">{l.title}</Link> · {formatRs(l.totalCost)}{l.dueDate ? ` · due ${l.dueDate}` : ''}
          </Row>
        ))}
      </div>
      <div>
        <h2 className="mb-1 font-semibold">Payments</h2>
        {!payments.length ? <p className="text-sm text-slate-500">No payments yet.</p> : payments.map((p) => (
          <Row key={p.id} label={`${new Date(p.paidAt).toLocaleDateString()} · ${p.method}`}>{formatRs(p.amount)}{p.note ? ` · ${p.note}` : ''}</Row>
        ))}
      </div>
    </div>
  )
}
