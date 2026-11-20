import { Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { PhotoThumb } from '../components/Photo'
import { useTagNames } from '../components/TagPicker'
import { EmptyState, Input, PageHeader, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { formatRs } from '../lib/money'
import { matchesSearch, useSellableItems } from '../lib/queries'

/** Step 1 of a sale: pick what was sold. Recent stock first. */
export const SellPage = () => {
  const role = useAuth((s) => s.profile?.role)
  const items = useSellableItems(role)
  const names = useTagNames()
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const shown = (items ?? []).filter((i) => matchesSearch(i, q, names))
  return (
    <div>
      <PageHeader title="What did you sell?" />
      <Input icon={Search} placeholder="Search name or tag" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
      {!items ? <Spinner /> : !shown.length ? <EmptyState title="No stock to sell" /> : (
        <div className="grid grid-cols-2 gap-2">
          {shown.map((i) => (
            <button key={i.key} type="button" onClick={() => navigate(`/sell/${i.key}`)} className="rounded-2xl border border-slate-200 bg-white p-2 text-left active:bg-slate-50">
              <PhotoThumb photoId={i.photoId} className="aspect-square w-full" />
              <p className="mt-2 line-clamp-2 text-sm font-medium" dir="auto">{i.title}</p>
              <p className="text-xs text-slate-500">{i.pieceId ? 'Single piece' : `${i.qtyRemaining} left`} · {formatRs(i.suggestedPrice)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
