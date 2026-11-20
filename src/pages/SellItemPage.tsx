import { Check, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { MoneyInput } from '../components/MoneyInput'
import { PhotoInput, PhotoThumb } from '../components/Photo'
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Segmented, Spinner } from '../components/ui'
import { recordSale } from '../lib/actions'
import { useAuth } from '../lib/auth'
import type { Sale } from '../lib/db'
import { formatRs, priceFlag } from '../lib/money'
import { useSellableItems } from '../lib/queries'
import { ErrorAlert } from '../components/Alert'
import { Summary } from '../components/ConfirmDialog'
import { askConfirm } from '../lib/confirm'

const flagText = { red: 'Below minimum', yellow: 'OK, below asking price', green: 'Good price' } as const
const flagClass = { red: 'border-red-500 bg-red-50', yellow: 'border-amber-500 bg-amber-50', green: 'border-green-600 bg-green-50' } as const

/** Step 2: photo, qty, price (colour check, no confirm), payment, save. */
export const SellItemPage = () => {
  const { key } = useParams()
  const profile = useAuth((s) => s.profile)
  const items = useSellableItems(profile?.role)
  const item = items?.find((i) => i.key === key)
  const navigate = useNavigate()
  const [photoId, setPhotoId] = useState<string>()
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState<number | null>(null)
  const [method, setMethod] = useState<Sale['paymentMethod']>('cash')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (!items) return <Spinner />
  if (!item || !profile) return <EmptyState title="This item is sold out or missing" />
  const flag = price ? priceFlag(price, item.minPrice, item.suggestedPrice) : undefined

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!price) return setError('Enter the sale price')
        // Owner asked for colour only on normal prices. A price far outside the range is usually a typo
        // (an extra or missing zero), so only then do we ask.
        if (price > item.maxPrice * 2 || price * 2 < item.minPrice) {
          const ok = await askConfirm({
            title: 'Is this price right?',
            tone: 'danger',
            confirmLabel: 'Yes, save sale',
            cancelLabel: 'Fix price',
            body: (
              <div className="space-y-2">
                <p>This price is far from the usual range. Check for an extra or missing zero.</p>
                <Summary rows={[['Price per piece', formatRs(price)], ['Usual range', `${formatRs(item.minPrice)} to ${formatRs(item.maxPrice)}`], ['Quantity', qty], ['Total', formatRs(price * qty)]]} />
              </div>
            ),
          })
          if (!ok) return
        }
        setBusy(true)
        try {
          await recordSale({ item, qty, unitSalePrice: price, paymentMethod: method, photoId, soldBy: profile.id })
          navigate('/sell', { replace: true })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not save')
          setBusy(false)
        }
      }}
    >
      <PageHeader title="Sell" back />
      <Card className="flex gap-3 p-3">
        <PhotoThumb photoId={item.photoId} />
        <div className="min-w-0">
          <p className="font-medium" dir="auto">{item.title}</p>
          <p className="text-sm text-slate-600">Min {formatRs(item.minPrice)} · Ask {formatRs(item.suggestedPrice)} · Max {formatRs(item.maxPrice)}</p>
          <p className="text-sm text-slate-500">{item.qtyRemaining} in stock</p>
        </div>
      </Card>
      <PhotoInput kind="sale" value={photoId} onChange={setPhotoId} label="Photo of item sold" />
      {!item.pieceId && (
        <Field label="Quantity" group>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" aria-label="One less" className="w-14" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="size-5" /></Button>
            <Input
              inputMode="numeric"
              dir="ltr"
              className="text-center text-lg"
              value={qty}
              onChange={(e) => setQty(Math.min(item.qtyRemaining, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)))}
            />
            <Button type="button" variant="secondary" aria-label="One more" className="w-14" onClick={() => setQty((q) => Math.min(item.qtyRemaining, q + 1))}><Plus className="size-5" /></Button>
          </div>
        </Field>
      )}
      <Field label="Price per piece">
        <div className={flag ? `rounded-xl border-2 p-1 ${flagClass[flag]}` : ''}>
          <MoneyInput value={price} onChange={setPrice} placeholder={String(item.suggestedPrice)} />
        </div>
      </Field>
      {flag && <Badge tone={flag}>{flagText[flag]}</Badge>}
      <Field label="Payment" group>
        <Segmented
          value={method}
          onChange={setMethod}
          options={[{ value: 'cash', label: 'Cash' }, { value: 'easypaisa', label: 'Easypaisa' }, { value: 'jazzcash', label: 'JazzCash' }]}
        />
      </Field>
      {price !== null && qty > 1 && <p className="text-lg">Total: <b>{formatRs(price * qty)}</b></p>}
      <ErrorAlert error={error} onClose={() => setError(undefined)} />
      <Button size="lg" className="w-full" disabled={busy}><Check className="size-5" />{busy ? 'Saving...' : 'Save sale'}</Button>
    </form>
  )
}
