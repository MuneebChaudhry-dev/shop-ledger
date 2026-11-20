import { AlertCircle, X } from 'lucide-react'
import { friendlyError } from '../lib/errors'

/** Red alert box with a plain-language title, what to do next, and the raw message in small print. */
export const ErrorAlert = ({ error, onClose }: { error: unknown; onClose?: () => void }) => {
  const f = friendlyError(error)
  if (!f) return null
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{f.title}</p>
        {f.hint && <p className="mt-0.5 text-sm text-red-700">{f.hint}</p>}
        {f.detail && <p className="mt-1 break-words font-mono text-[11px] text-red-500/80">{f.detail}</p>}
      </div>
      {onClose && (
        <button type="button" aria-label="Dismiss" onClick={onClose} className="-m-1 h-fit rounded-lg p-1 text-red-500 hover:bg-red-100">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
