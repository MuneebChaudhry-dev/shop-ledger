import { PackageMinus, Pencil, Save, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { MoneyInput } from '../components/MoneyInput'
import { PhotoInput, PhotoThumb } from '../components/Photo'
import { TagChips, TagPicker, useTagNames } from '../components/TagPicker'
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Row, Segmented, Spinner, Textarea } from '../components/ui'
import { recordVendorReturn } from '../lib/actions'
import { lotRecovery } from '../lib/calc/stock'
import { db, patchRecord, softDelete, type Lot, type Piece } from '../lib/db'
import { formatRs, type PriceSet } from '../lib/money'
import { ErrorAlert } from '../components/Alert'
import { Summary } from '../components/ConfirmDialog'
import { askConfirm } from '../lib/confirm'

const statusTone = { in_stock: 'green', sold: 'slate', returned: 'yellow', written_off: 'red' } as const
const statusText = { in_stock: 'In stock', sold: 'Sold', returned: 'Returned', written_off: 'Written off' } as const

const EditLot = ({ lot, onDone }: { lot: Lot; onDone: () => void }) => {
  const [title, setTitle] = useState(lot.title)
  const [description, setDescription] = useState(lot.description ?? '')
  const [tagIds, setTagIds] = useState(lot.tagIds)
  const [prices, setPrices] = useState<PriceSet>({ minPrice: lot.minPrice, suggestedPrice: lot.suggestedPrice, maxPrice: lot.maxPrice })
  return (
    <Card className="space-y-3">
      <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field label="Tags" group><TagPicker value={tagIds} onChange={setTagIds} /></Field>
      {lot.mode === 'whole' && (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Min"><MoneyInput value={prices.minPrice} onChange={(v) => setPrices({ ...prices, minPrice: v ?? 0 })} /></Field>
          <Field label="Ask"><MoneyInput value={prices.suggestedPrice} onChange={(v) => setPrices({ ...prices, suggestedPrice: v ?? 0 })} /></Field>
          <Field label="Max"><MoneyInput value={prices.maxPrice} onChange={(v) => setPrices({ ...prices, maxPrice: v ?? 0 })} /></Field>
        </div>
      )}
      <p className="text-sm text-slate-500">Total cost and quantity are locked. Use returns or write-offs to change stock.</p>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onDone}>Cancel</Button>
        <Button
          type="button"
          className="flex-1"
          disabled={!title.trim()}
          onClick={async () => {
            await patchRecord<Lot>('lots', lot.id, { title: title.trim(), description: description.trim() || undefined, tagIds, ...prices })
            onDone()
          }}
        >
          <Save className="size-4" />Save
        </Button>
      </div>
    </Card>
  )
}

const ReturnForm = ({ lot, pieces, onDone }: { lot: Lot; pieces: Piece[]; onDone: () => void }) => {
  const [type, setType] = useState<'vendor_return' | 'write_off'>('vendor_return')
  const [qty, setQty] = useState(1)
  const [chosen, setChosen] = useState<string[]>([])
  const [value, setValue] = useState<number | null>(null)
  const [photoId, setPhotoId] = useState<string>()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const inStock = pieces.filter((p) => p.status === 'in_stock')
  const selected = inStock.filter((p) => chosen.includes(p.id))
  const count = lot.mode === 'single' ? selected.length : qty
  const cost = lot.mode === 'single' ? selected.reduce((s, p) => s + p.unitCost, 0) : lot.unitCost * qty
  return (
    <Card className="space-y-3">
      <Segmented value={type} onChange={setType} options={[{ value: 'vendor_return', label: 'Return to vendor' }, { value: 'write_off', label: 'Write off (defective)' }]} />
      {lot.mode === 'single' ? (
        <div className="space-y-1">
          {inStock.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={chosen.includes(p.id)} onChange={() => setChosen((c) => (c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id]))} />
              <span dir="auto">{p.title}</span> <span className="text-slate-500">{formatRs(p.unitCost)}</span>
            </label>
          ))}
        </div>
      ) : (
        <Field label={`Pieces (max ${lot.qtyRemaining})`}>
          <Input inputMode="numeric" dir="ltr" value={qty} onChange={(e) => setQty(Math.min(lot.qtyRemaining, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)))} />
        </Field>
      )}
      <p className="text-sm text-slate-600">Cost of these pieces: <b>{formatRs(cost)}</b></p>
      {type === 'vendor_return' && (
        <Field label={lot.paymentType === 'credit' ? 'Amount taken off what you owe' : 'Cash refund from vendor'} hint="Leave empty to use the full cost.">
          <MoneyInput value={value} onChange={setValue} placeholder={String(cost)} />
        </Field>
      )}
      <PhotoInput kind="return" value={photoId} onChange={setPhotoId} label="Photo (optional)" />
      <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <ErrorAlert error={error} onClose={() => setError(undefined)} />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onDone}>Cancel</Button>
        <Button
          type="button"
          variant={type === 'write_off' ? 'danger' : 'primary'}
          className="flex-1"
          disabled={count === 0}
          onClick={async () => {
            const writeOff = type === 'write_off'
            const ok = await askConfirm({
              title: writeOff ? `Write off ${count} piece${count === 1 ? '' : 's'}?` : `Return ${count} piece${count === 1 ? '' : 's'} to the vendor?`,
              tone: writeOff ? 'danger' : 'primary',
              confirmLabel: writeOff ? 'Yes, write off' : 'Yes, return',
              body: (
                <div className="space-y-2">
                  <Summary
                    rows={[
                      ['Item', lot.title],
                      ['Pieces', count],
                      ['Cost of these pieces', formatRs(cost)],
                      [lot.paymentType === 'credit' ? 'Taken off what you owe' : 'Cash refund', writeOff ? undefined : formatRs(value ?? cost)],
                      ['Loss in this month', writeOff ? formatRs(cost) : formatRs(Math.max(0, cost - (value ?? cost)))],
                    ]}
                  />
                  <p className="font-medium text-amber-700">Stock goes down now. This cannot be undone.</p>
                </div>
              ),
            })
            if (!ok) return
            try {
              await recordVendorReturn(lot, {
                type, qty, pieces: lot.mode === 'single' ? selected : undefined, value: value ?? cost, photoId, note: note.trim() || undefined,
              })
              onDone()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not save')
            }
          }}
        >
          Save {count} piece{count === 1 ? '' : 's'}
        </Button>
      </div>
    </Card>
  )
}

export const LotPage = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const names = useTagNames()
  const [panel, setPanel] = useState<'none' | 'edit' | 'return'>('none')
  const data = useLiveQuery(async () => {
    const lot = await db.lots.get(id)
    if (!lot) return { lot: undefined }
    const [pieces, sales, vendorReturns, party] = await Promise.all([
      db.pieces.where('lotId').equals(id).toArray(),
      db.sales.where('lotId').equals(id).toArray(),
      db.vendorReturns.where('lotId').equals(id).toArray(),
      lot.partyId ? db.parties.get(lot.partyId) : undefined,
    ])
    return { lot, pieces: pieces.filter((p) => !p.deletedAt), sales: sales.filter((s) => !s.deletedAt), vendorReturns, party }
  }, [id])

  if (!data) return <Spinner />
  const { lot } = data
  if (!lot || lot.deletedAt) return <EmptyState title="Lot not found" />
  const { pieces = [], sales = [], vendorReturns = [], party } = data
  const salesTotal = sales.reduce((s, x) => s + x.total, 0)
  const recovery = lotRecovery(salesTotal, lot)

  return (
    <div className="space-y-4">
      <PageHeader title={lot.title} back action={panel === 'none' && <Button size="sm" variant="secondary" onClick={() => setPanel('edit')}><Pencil className="size-4" />Edit</Button>} />
      <PhotoThumb photoId={lot.lotPhotoId} className="aspect-video w-full" />
      <TagChips ids={lot.tagIds} names={names} />
      {lot.description && <p className="text-slate-700" dir="auto">{lot.description}</p>}

      {panel === 'edit' && <EditLot lot={lot} onDone={() => setPanel('none')} />}

      <Card>
        <Row label="In stock">{lot.qtyRemaining} of {lot.qtyBought}</Row>
        <Row label="Total cost">{formatRs(lot.totalCost)}</Row>
        <Row label="Cost per piece">{formatRs(lot.unitCost)}</Row>
        {lot.mode === 'whole' && <Row label="Min / Ask / Max">{formatRs(lot.minPrice)} / {formatRs(lot.suggestedPrice)} / {formatRs(lot.maxPrice)}</Row>}
        <Row label="Sold so far">{sales.reduce((s, x) => s + x.qty, 0)} pcs · {formatRs(salesTotal)}</Row>
        <Row label="Cost recovered">{Math.round(recovery * 100)}%{recovery >= 1 ? ' (paid for itself)' : ''}</Row>
        <Row label="Payment">
          {lot.paymentType === 'credit' ? <Badge tone="yellow">Credit</Badge> : <Badge>Cash</Badge>}{' '}
          {party && (lot.paymentType === 'credit' ? <Link className="text-teal-700 underline" to={`/dues/${party.id}`}>{party.name}</Link> : party.name)}
        </Row>
        {lot.dueDate && <Row label="Pay by">{lot.dueDate}</Row>}
      </Card>

      {lot.billPhotoId && (
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Bill</p>
          <PhotoThumb photoId={lot.billPhotoId} className="h-48 w-full" />
        </div>
      )}

      {lot.mode === 'single' && (
        <div className="space-y-2">
          <h2 className="font-semibold">Pieces</h2>
          {pieces.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-3">
              <PhotoThumb photoId={p.photoId} className="size-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" dir="auto">{p.title}</p>
                <p className="text-xs text-slate-500">Cost {formatRs(p.unitCost)} · Ask {formatRs(p.suggestedPrice)}</p>
              </div>
              <Badge tone={statusTone[p.status]}>{statusText[p.status]}</Badge>
            </Card>
          ))}
        </div>
      )}

      {panel === 'return' ? (
        <ReturnForm lot={lot} pieces={pieces} onDone={() => setPanel('none')} />
      ) : (
        lot.qtyRemaining > 0 && panel === 'none' && (
          <Button variant="secondary" className="w-full" onClick={() => setPanel('return')}><PackageMinus className="size-5" />Return to vendor or write off</Button>
        )
      )}

      {vendorReturns.length > 0 && (
        <div className="space-y-1">
          <h2 className="font-semibold">Returns and write-offs</h2>
          {vendorReturns.map((v) => (
            <Row key={v.id} label={`${new Date(v.at).toLocaleDateString()} · ${v.type === 'write_off' ? 'Write-off' : 'Returned'}`}>
              {v.qty} pcs · {formatRs(v.type === 'write_off' ? v.costOfItems : v.value)}
            </Row>
          ))}
        </div>
      )}

      {sales.length === 0 && vendorReturns.length === 0 && (
        <Button
          variant="ghost"
          className="w-full text-red-600"
          onClick={async () => {
            const ok = await askConfirm({
              title: 'Delete this lot?',
              tone: 'danger',
              confirmLabel: 'Yes, delete',
              body: <Summary rows={[['Item', lot.title], ['Quantity', lot.qtyBought], ['Total cost', formatRs(lot.totalCost)]]} />,
            })
            if (!ok) return
            await softDelete('lots', lot.id)
            for (const p of pieces) await softDelete('pieces', p.id)
            navigate('/stock', { replace: true })
          }}
        >
          <Trash2 className="size-4" />Delete lot
        </Button>
      )}
    </div>
  )
}
