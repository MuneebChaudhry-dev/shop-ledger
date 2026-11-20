import { PackagePlus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { MoneyInput } from '../components/MoneyInput'
import { PhotoInput } from '../components/Photo'
import { TagPicker } from '../components/TagPicker'
import { Button, Card, Field, Input, PageHeader, Segmented, Select, Textarea } from '../components/ui'
import { createLot } from '../lib/actions'
import { db } from '../lib/db'
import { allocatePieceCosts, formatRs, leftToAssign, suggestPrices, unitCost, type PriceSet } from '../lib/money'
import { useMargins } from '../lib/settings'
import { ErrorAlert } from '../components/Alert'
import { Summary } from '../components/ConfirmDialog'
import { askConfirm } from '../lib/confirm'

interface PieceDraft extends PriceSet {
  title: string
  unitCost: number
  photoId?: string
}

const MAX_PIECES = 200
const emptyPrices: PriceSet = { minPrice: 0, suggestedPrice: 0, maxPrice: 0 }

const PriceFields = ({ value, onChange }: { value: PriceSet; onChange: (v: PriceSet) => void }) => (
  <div className="grid grid-cols-3 gap-2">
    <Field label="Min"><MoneyInput value={value.minPrice} onChange={(v) => onChange({ ...value, minPrice: v ?? 0 })} /></Field>
    <Field label="Ask"><MoneyInput value={value.suggestedPrice} onChange={(v) => onChange({ ...value, suggestedPrice: v ?? 0 })} /></Field>
    <Field label="Max"><MoneyInput value={value.maxPrice} onChange={(v) => onChange({ ...value, maxPrice: v ?? 0 })} /></Field>
  </div>
)

export const AddLotPage = () => {
  const navigate = useNavigate()
  const margins = useMargins()
  const parties = useLiveQuery(() => db.parties.toArray(), [])
  const [mode, setMode] = useState<'whole' | 'single'>('whole')
  const [lotPhotoId, setLotPhotoId] = useState<string>()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [qty, setQty] = useState<number | null>(null)
  const [totalCost, setTotalCost] = useState<number | null>(null)
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash')
  const [partyId, setPartyId] = useState('')
  const [party, setParty] = useState({ name: '', phone: '', address: '' })
  const [dueDate, setDueDate] = useState('')
  const [billPhotoId, setBillPhotoId] = useState<string>()
  const [prices, setPrices] = useState<PriceSet>(emptyPrices)
  const [pricesTouched, setPricesTouched] = useState(false)
  const [pieces, setPieces] = useState<PieceDraft[]>([])
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const titleRef = useRef(title)
  useEffect(() => {
    titleRef.current = title
  }, [title])

  const cost = qty && totalCost !== null ? unitCost(totalCost, qty) : 0

  // Suggested prices follow the cost until the user edits them.
  useEffect(() => {
    if (!pricesTouched) setPrices(cost ? suggestPrices(cost, margins) : emptyPrices)
  }, [cost, margins, pricesTouched])

  // One by one: rebuild the piece list when qty or total changes (keeps typed rows if the count is the same).
  useEffect(() => {
    if (mode !== 'single' || !qty || totalCost === null || qty > MAX_PIECES) {
      setPieces([])
      return
    }
    const costs = allocatePieceCosts(totalCost, qty)
    setPieces((old) =>
      costs.map((c, i) =>
        old.length === qty && old[i]
          ? { ...old[i], unitCost: c, ...suggestPrices(c, margins) }
          : { title: `${titleRef.current.trim() || 'Piece'} #${i + 1}`, unitCost: c, ...suggestPrices(c, margins) },
      ),
    )
  }, [mode, qty, totalCost, margins])

  const setPieceCost = (i: number, c: number) =>
    setPieces((ps) => ps.map((p, j) => (j === i ? { ...p, unitCost: c, ...suggestPrices(c, margins) } : p)))
  const setPiece = (i: number, change: Partial<PieceDraft>) => setPieces((ps) => ps.map((p, j) => (j === i ? { ...p, ...change } : p)))

  const left = leftToAssign(totalCost ?? 0, pieces.map((p) => p.unitCost))
  const partyOptions = (parties ?? []).filter((p) => !p.deletedAt && (paymentType === 'credit' ? p.kind === 'creditor' : true))

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setError(undefined)
        if (!title.trim() || !qty || totalCost === null) return setError('Title, quantity and total cost are required')
        if (mode === 'single' && qty > MAX_PIECES) return setError(`One by one supports up to ${MAX_PIECES} pieces`)
        if (paymentType === 'credit' && !partyId && !party.name.trim()) return setError('Add the creditor name')
        if (mode === 'single' && left !== 0) return setError(`Piece costs must add up to the total (${formatRs(left)} left)`)
        const partyName = partyId ? partyOptions.find((p) => p.id === partyId)?.name : party.name.trim()
        const ok = await askConfirm({
          title: 'Save this stock?',
          confirmLabel: 'Yes, save stock',
          body: (
            <div className="space-y-2">
              <Summary
                rows={[
                  ['Item', title.trim()],
                  ['Type', mode === 'whole' ? 'Whole lot' : 'One by one'],
                  ['Quantity', `${qty} pieces`],
                  ['Total cost', formatRs(totalCost)],
                  ['Cost per piece', formatRs(cost)],
                  ['Paid', paymentType === 'credit' ? 'On credit' : 'Cash'],
                  [paymentType === 'credit' ? 'Creditor' : 'Seller', partyName || undefined],
                  ['Pay by', paymentType === 'credit' && dueDate ? dueDate : undefined],
                  ['Min price', mode === 'whole' ? formatRs(prices.minPrice) : undefined],
                  ['Ask price', mode === 'whole' ? formatRs(prices.suggestedPrice) : undefined],
                  ['Max price', mode === 'whole' ? formatRs(prices.maxPrice) : undefined],
                ]}
              />
              <p className="font-medium text-amber-700">Quantity and total cost cannot be changed later.</p>
            </div>
          ),
        })
        if (!ok) return
        setBusy(true)
        try {
          const lot = await createLot({
            title: title.trim(),
            description: description.trim() || undefined,
            tagIds,
            mode,
            qtyBought: qty,
            totalCost,
            paymentType,
            party: partyId
              ? { id: partyId, name: '' }
              : party.name.trim()
                ? { name: party.name.trim(), phone: party.phone.trim() || undefined, address: party.address.trim() || undefined }
                : undefined,
            dueDate: paymentType === 'credit' && dueDate ? dueDate : undefined,
            lotPhotoId,
            billPhotoId,
            ...prices,
            pieces: mode === 'single' ? pieces.map((p) => ({ ...p, tagIds })) : undefined,
          })
          navigate(`/stock/${lot.id}`, { replace: true })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not save')
          setBusy(false)
        }
      }}
    >
      <PageHeader title="Add stock" back />
      <Segmented value={mode} onChange={setMode} options={[{ value: 'whole', label: 'Whole lot' }, { value: 'single', label: 'One by one' }]} />
      <PhotoInput kind="lot" value={lotPhotoId} onChange={setLotPhotoId} label="Photo of the lot" />
      <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Silk 3-piece, blue" /></Field>
      <Field label="Description (optional)"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field label="Tags" group><TagPicker value={tagIds} onChange={setTagIds} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Quantity (pieces)">
          <Input inputMode="numeric" dir="ltr" value={qty ?? ''} onChange={(e) => setQty(Number(e.target.value.replace(/\D/g, '')) || null)} />
        </Field>
        <Field label="Total cost"><MoneyInput value={totalCost} onChange={setTotalCost} /></Field>
      </div>
      {cost > 0 && <p className="text-sm text-slate-600">Cost per piece: <b>{formatRs(cost)}</b></p>}

      <Card className="space-y-3">
        <Segmented value={paymentType} onChange={setPaymentType} options={[{ value: 'cash', label: 'Paid cash' }, { value: 'credit', label: 'On credit' }]} />
        <Field label={paymentType === 'credit' ? 'Creditor' : 'Seller'}>
          <Select value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="">New {paymentType === 'credit' ? 'creditor' : 'seller'}...</option>
            {partyOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        {!partyId && (
          <>
            <Field label="Name"><Input value={party.name} onChange={(e) => setParty({ ...party, name: e.target.value })} /></Field>
            {paymentType === 'credit' && (
              <>
                <Field label="Phone"><Input inputMode="tel" dir="ltr" value={party.phone} onChange={(e) => setParty({ ...party, phone: e.target.value })} /></Field>
                <Field label="Address"><Input value={party.address} onChange={(e) => setParty({ ...party, address: e.target.value })} /></Field>
              </>
            )}
          </>
        )}
        {paymentType === 'credit' && <Field label="Pay by (optional)"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>}
        <PhotoInput kind="bill" value={billPhotoId} onChange={setBillPhotoId} label="Photo of the bill" />
      </Card>

      {mode === 'whole' ? (
        <Field label="Sale price per piece" hint="Suggested from cost. Change if needed." group>
          <PriceFields value={prices} onChange={(v) => { setPrices(v); setPricesTouched(true) }} />
        </Field>
      ) : (
        <div className="space-y-2">
          <p className={left === 0 ? 'text-sm text-green-700' : 'text-sm font-medium text-red-600'}>
            {left === 0 ? 'Piece costs match the total' : left > 0 ? `${formatRs(left)} left to assign` : `${formatRs(-left)} over the total`}
          </p>
          {pieces.map((p, i) => (
            <Card key={i} className="space-y-2 p-3">
              <Input value={p.title} onChange={(e) => setPiece(i, { title: e.target.value })} />
              <Field label="Buy cost"><MoneyInput value={p.unitCost} onChange={(v) => setPieceCost(i, v ?? 0)} /></Field>
              <PriceFields value={p} onChange={(v) => setPiece(i, v)} />
              <PhotoInput kind="piece" value={p.photoId} onChange={(id) => setPiece(i, { photoId: id })} label="Photo (optional)" />
            </Card>
          ))}
        </div>
      )}
      <ErrorAlert error={error} onClose={() => setError(undefined)} />
      <Button size="lg" className="w-full" disabled={busy}><PackagePlus className="size-5" />{busy ? 'Saving...' : 'Save stock'}</Button>
    </form>
  )
}
