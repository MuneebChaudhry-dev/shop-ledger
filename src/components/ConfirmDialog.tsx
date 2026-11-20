import { AlertTriangle, HelpCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { closeConfirm, useConfirmStore } from '../lib/confirm'
import { Button } from './ui'

/** Mounted once in App. Bottom sheet on phones, centred card on wider screens. */
export const ConfirmDialog = () => {
  const open = useConfirmStore((s) => s.open)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeConfirm(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  const danger = open.tone === 'danger'
  const Icon = danger ? AlertTriangle : HelpCircle
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={() => closeConfirm(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700'}`}>
            <Icon className="size-5" />
          </div>
          <h2 id="confirm-title" className="min-w-0 flex-1 text-lg font-semibold leading-snug" dir="auto">{open.title}</h2>
        </div>
        {open.body && <div className="text-sm text-slate-600">{open.body}</div>}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => closeConfirm(false)}>{open.cancelLabel ?? 'Cancel'}</Button>
          <Button ref={confirmRef} variant={danger ? 'danger' : 'primary'} className="flex-1" onClick={() => closeConfirm(true)}>
            {open.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Label / value lines for the confirm body. */
export const Summary = ({ rows }: { rows: [string, string | number | undefined][] }) => (
  <dl className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-3">
    {rows.filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => (
      <div key={k} className="flex justify-between gap-3 py-1.5">
        <dt className="shrink-0 text-slate-500">{k}</dt>
        <dd className="text-right font-medium text-slate-800" dir="auto">{v}</dd>
      </div>
    ))}
  </dl>
)
