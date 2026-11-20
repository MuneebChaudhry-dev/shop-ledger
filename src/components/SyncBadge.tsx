import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { friendlyError } from '../lib/errors'
import { syncNow, useSyncStore } from '../lib/sync'

export const useOnline = () => {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export const SyncBadge = () => {
  const { pending, syncing, lastError } = useSyncStore()
  const online = useOnline()
  const base = 'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium'
  if (!online)
    return <span className={`${base} bg-slate-200 text-slate-700`}><CloudOff className="size-3.5" />Offline{pending ? ` · ${pending} waiting` : ''}</span>
  if (lastError)
    return (
      <button type="button" title={friendlyError(lastError)?.title} onClick={() => void syncNow()} className={`${base} bg-red-100 text-red-700`}>
        <AlertTriangle className="size-3.5" />Sync problem · tap to retry
      </button>
    )
  if (syncing || pending)
    return (
      <button type="button" onClick={() => void syncNow()} className={`${base} bg-amber-100 text-amber-800`}>
        <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} />{pending ? `${pending} waiting` : 'Syncing'}
      </button>
    )
  return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle2 className="size-3.5" />All synced</span>
}
