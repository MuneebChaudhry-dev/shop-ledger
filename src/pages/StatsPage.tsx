import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PhotoThumb } from '../components/Photo'
import { TagChips, useTagNames } from '../components/TagPicker'
import { Badge, Card, EmptyState, PageHeader, Row, Segmented, Spinner, StatTile } from '../components/ui'
import { formatDayKey, getPeriod, shiftPeriod, type PeriodKind } from '../lib/calc/periods'
import { saleProfit } from '../lib/calc/stats'
import { db } from '../lib/db'
import { formatRs, groupLakh, priceFlag } from '../lib/money'
import { useStats } from '../lib/useStats'

const minus = (v: number) => (v ? `-${formatRs(v)}` : formatRs(0))
const countSales = (n: number) => `${n} sale${n === 1 ? '' : 's'}`

const kinds: { value: PeriodKind; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'biweek', label: '2 weeks' },
  { value: 'month', label: 'Month' },
]

export const StatsPage = () => {
  const [kind, setKind] = useState<PeriodKind>('day')
  const [ref, setRef] = useState(() => Date.now())
  const [tag, setTag] = useState<string>()
  const period = useMemo(() => getPeriod(kind, ref), [kind, ref])
  const result = useStats(period)
  const names = useTagNames()
  const lots = useLiveQuery(async () => new Map((await db.lots.toArray()).map((l) => [l.id, l])), [])
  const pieces = useLiveQuery(async () => new Map((await db.pieces.toArray()).map((p) => [p.id, p])), [])

  if (!result || !lots || !pieces) return <Spinner />
  const { stats, sales } = result
  const tagsOf = (s: (typeof sales)[number]) => (s.pieceId ? pieces.get(s.pieceId)?.tagIds : undefined) ?? lots.get(s.lotId)?.tagIds ?? []
  const shownSales = tag ? sales.filter((s) => tagsOf(s).includes(tag)) : sales
  const usedTags = [...new Set(sales.flatMap(tagsOf))].filter((t) => names.has(t))

  return (
    <div className="space-y-4">
      <PageHeader title="Stats" />
      <Segmented value={kind} onChange={(k) => { setKind(k); setRef(Date.now()) }} options={kinds} />
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous" className="rounded-full p-2 active:bg-slate-200" onClick={() => setRef(shiftPeriod(period, -1).start)}><ChevronLeft /></button>
        <span className="font-medium">{period.label}</span>
        <button type="button" aria-label="Next" disabled={period.end > Date.now()} className="rounded-full p-2 active:bg-slate-200 disabled:opacity-30" onClick={() => setRef(shiftPeriod(period, 1).start)}><ChevronRight /></button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Earning (sales in)" value={formatRs(stats.earning)} />
        <StatTile label={kind === 'month' ? 'Net profit (P&L)' : 'Profit'} value={formatRs(stats.profit)} tone={stats.profit < 0 ? 'bad' : 'good'} />
        <StatTile label="Pieces sold" value={stats.piecesSold} />
        <StatTile label="Chai" value={formatRs(stats.chai)} />
      </div>

      <Card>
        <Row label="Profit on sales">{formatRs(stats.saleProfit)}</Row>
        {stats.returnsImpact !== 0 && <Row label="Customer returns">{formatRs(stats.returnsImpact)}</Row>}
        <Row label="Chai">{minus(stats.chai)}</Row>
        {kind === 'month' && (
          <>
            <Row label="Month-end expenses">{minus(stats.monthEnd)}</Row>
            <Row label="Write-offs and return losses">{minus(stats.stockLoss)}</Row>
          </>
        )}
        <Row label="Sold below min">{countSales(stats.belowMin.count)} · {formatRs(stats.belowMin.gap)} under</Row>
        <Row label="Sold above max">{countSales(stats.aboveMax.count)} · {formatRs(stats.aboveMax.gap)} over</Row>
      </Card>

      {kind !== 'day' && (
        <Card className="h-64 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.days.map((d) => ({ ...d, label: formatDayKey(d.day).split(' ')[0] }))} margin={{ left: -8, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip formatter={(v) => formatRs(Number(v))} labelFormatter={(_, p) => (p?.[0] ? formatDayKey(p[0].payload.day) : '')} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="earning" name="Earning" fill="#0f766e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {usedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTag(undefined)} className={`h-8 rounded-full border px-3 text-sm ${!tag ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white'}`}>All</button>
          {usedTags.map((t) => (
            <button key={t} type="button" dir="auto" onClick={() => setTag(t)} className={`h-8 rounded-full border px-3 text-sm ${tag === t ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white'}`}>{names.get(t)}</button>
          ))}
        </div>
      )}

      <h2 className="font-semibold">Sales ({shownSales.length})</h2>
      {!shownSales.length ? <EmptyState title="No sales in this period" /> : (
        <div className="space-y-2">
          {shownSales.map((s) => {
            const src = s.pieceId ? pieces.get(s.pieceId) : lots.get(s.lotId)
            const flag = src ? priceFlag(s.unitSalePrice, src.minPrice, src.suggestedPrice) : undefined
            const profit = saleProfit(s)
            return (
              <Card key={s.id} className="flex gap-3 p-3">
                <PhotoThumb photoId={s.photoId ?? (s.pieceId ? pieces.get(s.pieceId)?.photoId : undefined) ?? lots.get(s.lotId)?.lotPhotoId} className="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" dir="auto">{src?.title ?? 'Item'}</p>
                  <TagChips ids={tagsOf(s)} names={names} />
                  <p className="text-xs text-slate-500">{new Date(s.soldAt).toLocaleString()} · {s.qty} × {groupLakh(s.unitSalePrice)} · {s.paymentMethod}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatRs(s.total)}</p>
                  <p className={`text-xs ${profit < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatRs(profit)}</p>
                  {flag && <Badge tone={flag}>{flag}</Badge>}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
