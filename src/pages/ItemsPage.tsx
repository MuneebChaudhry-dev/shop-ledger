import { Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { PhotoThumb } from '../components/Photo'
import { TagChips, useTagNames } from '../components/TagPicker'
import { Card, EmptyState, Input, PageHeader, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { formatRs } from '../lib/money'
import { matchesSearch, useSellableItems } from '../lib/queries'

export const ItemsPage = () => {
  const role = useAuth((s) => s.profile?.role)
  const items = useSellableItems(role)
  const names = useTagNames()
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const shown = (items ?? []).filter((i) => matchesSearch(i, q, names))
  return (
    <div>
      <PageHeader title="Items in stock" />
      <Input icon={Search} placeholder="Search name or tag" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
      {!items ? <Spinner /> : !shown.length ? <EmptyState title="Nothing found">New stock shows here after it syncs.</EmptyState> : (
        <div className="space-y-2">
          {shown.map((i) => (
            <Card key={i.key} onClick={() => navigate(`/sell/${i.key}`)} className="flex gap-3 p-3">
              <PhotoThumb photoId={i.photoId} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" dir="auto">{i.title}</p>
                <TagChips ids={i.tagIds} names={names} />
                <p className="mt-1 text-sm text-slate-600">
                  {formatRs(i.minPrice)} to {formatRs(i.maxPrice)} · <span className="font-medium text-teal-700">ask {formatRs(i.suggestedPrice)}</span>
                </p>
              </div>
              <span className="shrink-0 text-sm text-slate-500">{i.qtyRemaining} left</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
