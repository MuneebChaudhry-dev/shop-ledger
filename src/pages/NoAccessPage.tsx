import { Button } from '../components/ui'
import { signOut } from '../lib/auth'

export const NoAccessPage = () => (
  <div className="mx-auto flex h-full max-w-sm flex-col justify-center gap-4 p-6">
    <h1 className="text-xl font-semibold">No access</h1>
    <p className="text-slate-600">
      This login has no active shop profile, or the phone was offline on its first sign in. Ask the owner to add or enable you, then try again online.
    </p>
    <Button variant="secondary" onClick={() => void signOut(true)}>Sign out</Button>
  </div>
)
