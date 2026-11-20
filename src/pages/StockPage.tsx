import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { PhotoThumb } from '../components/Photo'
import { TagChips, useTagNames } from '../components/TagPicker'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Segmented, Spinner } from '../components/ui'
import { stockValue } from '../lib/calc/stock'
import { db } from '../lib/db'
import { formatRs } from '../lib/money'
import { matchesSearch } from '../lib/queries'

export const StockPage = () => {
  const navigate = useNavigate()
  const names = useTagNames()
  const [q, setQ] = useState('')
  const [show, setShow] = useState<'in' | 'all'>('in')
  const lots = useLiveQuery(async () => (await db.lots.orderBy('createdAt').reverse().toArray()).filter((l) => !l.deletedAt), [])
  const shown = (lots ?? []).filter((l) => (show === 'all' || l.qtyRemaining > 0) && matchesSearch(l, q, names))
  return (
    <div>
      <PageHeader title="Stock" action={<Button size="sm" onClick={() => navigate('/stock/new')}><Plus className="size-4" />Add</Button>} />
      {lots && <p className="mb-3 text-sm text-slate-500">Stock value at cost: <b className="text-slate-800">{formatRs(stockValue(lots))}</b></p>}
      <Input icon={Search} placeholder="Search name or tag" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
      <div className="mb-3">
        <Segmented value={show} onChange={setShow} options={[{ value: 'in', label: 'In stock' }, { value: 'all', label: 'All lots' }]} />
      </div>
      {!lots ? <Spinner /> : !shown.length ? <EmptyState title="No lots yet">Tap Add to record stock you bought.</EmptyState> : (
        <div className="space-y-2">
          {shown.map((l) => (
            <Card key={l.id} onClick={() => navigate(`/stock/${l.id}`)} className="flex gap-3 p-3">
              <PhotoThumb photoId={l.lotPhotoId} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" dir="auto">{l.title}</p>
                <TagChips ids={l.tagIds} names={names} />
                <p className="mt-1 text-sm text-slate-600">{l.qtyRemaining}/{l.qtyBought} left · cost {formatRs(l.unitCost)}/pc</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {l.paymentType === 'credit' && <Badge tone="yellow">Credit</Badge>}
                {l.mode === 'single' && <Badge>Pieces</Badge>}
                {!l.synced && <Badge tone="teal">Not synced</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
