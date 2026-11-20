import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { PhotoThumb } from '../components/Photo'
import { Badge, Button, Card, EmptyState, PageHeader, Spinner } from '../components/ui'
import { db } from '../lib/db'
import { formatRs, groupLakh } from '../lib/money'

const PAGE = 50

/** Recent sales, newest first, with returns shown and a Return action. */
export const SalesPage = () => {
  const navigate = useNavigate()
  const [limit, setLimit] = useState(PAGE)
  const data = useLiveQuery(async () => {
    const sales = (await db.sales.orderBy('soldAt').reverse().limit(limit).toArray()).filter((s) => !s.deletedAt)
    const returns = await db.customerReturns.where('saleId').anyOf(sales.map((s) => s.id)).toArray()
    const lots = new Map((await db.lots.bulkGet([...new Set(sales.map((s) => s.lotId))])).filter((l) => !!l).map((l) => [l!.id, l!]))
    const pieces = new Map((await db.pieces.bulkGet(sales.flatMap((s) => (s.pieceId ? [s.pieceId] : [])))).filter((p) => !!p).map((p) => [p!.id, p!]))
    const profiles = new Map((await db.profiles.toArray()).map((p) => [p.id, p.name]))
    return { sales, returns, lots, pieces, profiles }
  }, [limit])
  if (!data) return <Spinner />
  const { sales, returns, lots, pieces, profiles } = data
  return (
    <div className="space-y-2">
      <PageHeader title="Sales and returns" back />
      {!sales.length ? <EmptyState title="No sales yet" /> : sales.map((s) => {
        const back = returns.filter((r) => r.saleId === s.id && !r.deletedAt).reduce((n, r) => n + r.qty, 0)
        const title = (s.pieceId ? pieces.get(s.pieceId)?.title : undefined) ?? lots.get(s.lotId)?.title ?? 'Item'
        return (
          <Card key={s.id} className="flex items-center gap-3 p-3">
            <PhotoThumb photoId={s.photoId ?? lots.get(s.lotId)?.lotPhotoId} className="size-12" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" dir="auto">{title}</p>
              <p className="text-xs text-slate-500">
                {new Date(s.soldAt).toLocaleString()} · {s.qty} × {groupLakh(s.unitSalePrice)}
                {profiles.get(s.soldBy) ? ` · ${profiles.get(s.soldBy)}` : ''}
              </p>
              {back > 0 && <Badge tone="yellow">{back} returned</Badge>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-semibold">{formatRs(s.total)}</span>
              {back < s.qty && <Button size="sm" variant="secondary" onClick={() => navigate(`/sales/${s.id}/return`)}>Return</Button>}
            </div>
          </Card>
        )
      })}
      {sales.length >= limit && <Button variant="ghost" className="w-full" onClick={() => setLimit((l) => l + PAGE)}>Show more</Button>}
    </div>
  )
}
