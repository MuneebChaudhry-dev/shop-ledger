import { useState } from 'react'
import { Button, Field, Input } from '../components/ui'
import { signIn } from '../lib/auth'

export const LoginPage = () => {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  return (
    <div className="mx-auto flex h-full max-w-sm flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">Shop Ledger</h1>
      <p className="mb-6 text-slate-500">Sign in once. The app keeps working offline after that.</p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!navigator.onLine) return setError('Connect to the internet for the first sign in.')
          setBusy(true)
          setError((await signIn(login, password)) ?? undefined)
          setBusy(false)
        }}
      >
        <Field label="Username or email">
          <Input autoCapitalize="none" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} required />
        </Field>
        <Field label="Password" error={error}>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button className="w-full" size="lg" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</Button>
      </form>
    </div>
  )
}
