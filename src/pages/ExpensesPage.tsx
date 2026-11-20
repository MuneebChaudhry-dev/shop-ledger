import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MoneyInput } from '../components/MoneyInput'
import { Button, Card, Field, Input, PageHeader, Row, Spinner } from '../components/ui'
import { addExpense } from '../lib/actions'
import { getPeriod, monthKey, shiftPeriod } from '../lib/calc/periods'
import { db, softDelete } from '../lib/db'
import { formatRs } from '../lib/money'
import { ErrorAlert } from '../components/Alert'

const presets = ['Rent', 'Electricity', 'Salaries', 'Internet', 'Transport', 'Other']

export const ExpensesPage = () => {
  const [ref, setRef] = useState(() => Date.now())
  const period = useMemo(() => getPeriod('month', ref), [ref])
  const month = monthKey(period.start)
  const expenses = useLiveQuery(async () => (await db.expenses.toArray()).filter((e) => !e.deletedAt), [])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const [error, setError] = useState<string>()
  if (!expenses) return <Spinner />
  const monthEnd = expenses.filter((e) => e.type === 'month_end' && e.month === month)
  const chai = expenses.filter((e) => e.type === 'chai' && e.at >= period.start && e.at < period.end)
  const total = (rows: typeof expenses) => rows.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-4">
      <PageHeader title="Expenses" back />
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous month" className="rounded-full p-2 active:bg-slate-200" onClick={() => setRef(shiftPeriod(period, -1).start)}><ChevronLeft /></button>
        <span className="font-medium">{period.label}</span>
        <button type="button" aria-label="Next month" disabled={period.end > Date.now()} className="rounded-full p-2 active:bg-slate-200 disabled:opacity-30" onClick={() => setRef(shiftPeriod(period, 1).start)}><ChevronRight /></button>
      </div>
      <Card>
        <Row label="Chai this month">{formatRs(total(chai))} ({chai.length} times)</Row>
        <Row label="Month-end expenses">{formatRs(total(monthEnd))}</Row>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Add month-end expense</h2>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p} type="button" onClick={() => setName(p)} className={`h-8 rounded-full border px-3 text-sm ${name === p ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white'}`}>{p}</button>
          ))}
        </div>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Amount"><MoneyInput value={amount} onChange={setAmount} /></Field>
        <ErrorAlert error={error} onClose={() => setError(undefined)} />
        <Button
          className="w-full"
          disabled={!name.trim() || !amount}
          onClick={async () => {
            try {
              await addExpense({ type: 'month_end', name: name.trim(), amount: amount ?? 0, month })
              setName('')
              setAmount(null)
              setError(undefined)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not save')
            }
          }}
        >
          <Plus className="size-5" />Add to {period.label}
        </Button>
      </Card>

      <div>
        {monthEnd.map((e) => (
          <div key={e.id} className="flex items-center justify-between border-b border-slate-200 py-2">
            <span dir="auto">{e.name}</span>
            <span className="flex items-center gap-3">
              <b>{formatRs(e.amount)}</b>
              <button type="button" aria-label={`Remove ${e.name}`} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" onClick={() => confirm(`Remove ${e.name}?`) && void softDelete('expenses', e.id)}><Trash2 className="size-4" /></button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
