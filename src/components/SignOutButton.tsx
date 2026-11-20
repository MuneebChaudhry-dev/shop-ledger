import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { pendingCount, signOut } from '../lib/auth'
import { askConfirm } from '../lib/confirm'

/** Red outline, solid red on hover. Always asks first, and warns loudly if changes are still waiting to upload. */
export const SignOutButton = () => {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        const pending = await pendingCount()
        const ok = await askConfirm(
          pending > 0
            ? {
                title: `${pending === 1 ? '1 change is' : `${pending} changes are`} not uploaded yet`,
                body: 'Signing out now deletes them from this phone. Connect to the internet and wait for "All synced" first.',
                confirmLabel: 'Sign out',
                cancelLabel: 'Stay signed in',
                tone: 'danger',
              }
            : { title: 'Sign out?', body: 'You will need the internet to sign in again.', confirmLabel: 'Sign out', tone: 'danger' },
        )
        if (ok) await signOut(true)
        setBusy(false)
      }}
      className="flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
    >
      <LogOut className="size-3.5" />
      Sign out
    </button>
  )
}
