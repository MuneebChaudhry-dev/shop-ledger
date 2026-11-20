import { CloudOff, Lock, LogIn, Shirt, User } from 'lucide-react'
import { useState } from 'react'
import { Button, Field, Input, PasswordInput } from '../components/ui'
import { signIn } from '../lib/auth'
import { ErrorAlert } from '../components/Alert'

export const LoginPage = () => {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  return (
    <div
      className="flex min-h-full items-center justify-center bg-teal-900 bg-cover bg-center p-5"
      style={{ backgroundImage: 'url(/login-bg.svg)' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <Shirt className="size-9" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Shop Ledger</h1>
          <p className="mt-1 text-teal-100">Stock, sales and profit for your shop</p>
          <p className="mt-1 font-urdu text-lg text-amber-200" dir="rtl" lang="ur">دکان کا حساب، آسان</p>
        </div>

        <form
          className="space-y-4 rounded-3xl bg-white/95 p-6 shadow-2xl shadow-black/30 ring-1 ring-white/50 backdrop-blur"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!navigator.onLine) return setError('Connect to the internet for the first sign in.')
            setBusy(true)
            setError((await signIn(login, password)) ?? undefined)
            setBusy(false)
          }}
        >
          <Field label="Username or email">
            <Input icon={User} autoCapitalize="none" autoComplete="username" value={login} onChange={(e) => { setLogin(e.target.value); setError(undefined) }} required />
          </Field>
          <Field label="Password">
            <PasswordInput icon={Lock} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(undefined) }} required />
          </Field>
          <ErrorAlert error={error} />
          <Button className="w-full" size="lg" disabled={busy}>
            <LogIn className="size-5" />
            {busy ? 'Signing in...' : 'Sign in'}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <CloudOff className="size-3.5" />
            Sign in once. It keeps working offline after that.
          </p>
        </form>
      </div>
    </div>
  )
}
