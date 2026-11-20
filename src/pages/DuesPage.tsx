import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { Card, EmptyState, PageHeader, Spinner } from '../components/ui'
import { totalOwed } from '../lib/calc/dues'
import { db } from '../lib/db'
import { formatRs } from '../lib/money'
import { useOwed } from '../lib/useDues'

export const DuesPage = () => {
  const navigate = useNavigate()
  const owed = useOwed()
  const parties = useLiveQuery(() => db.parties.where('kind').equals('creditor').toArray(), [])
  if (!owed || !parties) return <Spinner />
  const rows = parties.filter((p) => !p.deletedAt).map((p) => ({ ...p, owed: owed.get(p.id) ?? 0 })).sort((a, b) => b.owed - a.owed)
  return (
    <div className="space-y-3">
      <PageHeader title="Dues" back />
      <Card className="bg-amber-50">
        <p className="text-sm text-slate-600">Total you owe</p>
        <p className="text-2xl font-semibold">{formatRs(totalOwed(owed))}</p>
      </Card>
      {!rows.length ? <EmptyState title="No creditors yet">They appear when you add stock on credit.</EmptyState> : rows.map((p) => (
        <Card key={p.id} onClick={() => navigate(`/dues/${p.id}`)} className="flex items-center justify-between p-3">
          <div>
            <p className="font-medium" dir="auto">{p.name}</p>
            {p.phone && <p className="text-sm text-slate-500" dir="ltr">{p.phone}</p>}
          </div>
          <p className={`font-semibold ${p.owed > 0 ? 'text-red-600' : 'text-green-700'}`}>{p.owed > 0 ? formatRs(p.owed) : 'Clear'}</p>
        </Card>
      ))}
    </div>
  )
}
