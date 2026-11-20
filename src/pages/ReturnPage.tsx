import { Undo2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { MoneyInput } from '../components/MoneyInput'
import { Button, Card, EmptyState, Field, Input, PageHeader, Row, Segmented, Spinner } from '../components/ui'
import { recordCustomerReturn, returnedQty } from '../lib/actions'
import { db } from '../lib/db'
import { formatRs } from '../lib/money'
import { ErrorAlert } from '../components/Alert'

/** Customer brings an item back. Recorded as a new dated entry; the original sale is not changed. */
export const ReturnPage = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const sale = await db.sales.get(id)
    if (!sale) return { sale: undefined }
    const lot = await db.lots.get(sale.lotId)
    return { sale, lot, already: await returnedQty(sale.id) }
  }, [id])
  const [qty, setQty] = useState(1)
  const [refund, setRefund] = useState<number | null>(null)
  const [backToStock, setBackToStock] = useState<'stock' | 'defective'>('stock')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()

  if (!data) return <Spinner />
  const { sale, lot, already = 0 } = data
  if (!sale) return <EmptyState title="Sale not found" />
  const left = sale.qty - already
  const defaultRefund = sale.unitSalePrice * qty

  return (
    <div className="space-y-4">
      <PageHeader title="Customer return" back />
      <Card>
        <Row label="Item">{lot?.title ?? 'Item'}</Row>
        <Row label="Sold">{new Date(sale.soldAt).toLocaleString()}</Row>
        <Row label="Qty × price">{sale.qty} × {formatRs(sale.unitSalePrice)}</Row>
        <Row label="Already returned">{already}</Row>
      </Card>
      {left <= 0 ? <EmptyState title="Everything on this sale is already returned" /> : (
        <>
          {left > 1 && (
            <Field label={`Pieces returned (max ${left})`}>
              <Input inputMode="numeric" dir="ltr" value={qty} onChange={(e) => setQty(Math.min(left, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)))} />
            </Field>
          )}
          <Field label="Refund given" hint={`Leave empty for the full ${formatRs(defaultRefund)}`}>
            <MoneyInput value={refund} onChange={setRefund} placeholder={String(defaultRefund)} />
          </Field>
          <Field label="Condition" group>
            <Segmented value={backToStock} onChange={setBackToStock} options={[{ value: 'stock', label: 'Back to stock' }, { value: 'defective', label: 'Defective' }]} />
          </Field>
          <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <ErrorAlert error={error} onClose={() => setError(undefined)} />
          <Button
            size="lg"
            className="w-full"
            onClick={async () => {
              try {
                await recordCustomerReturn(sale, { qty, refundAmount: refund ?? defaultRefund, backToStock, note: note.trim() || undefined })
                navigate(-1)
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not save')
              }
            }}
          >
            <Undo2 className="size-5" />Save return
          </Button>
        </>
      )}
    </div>
  )
}
