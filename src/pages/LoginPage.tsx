import { useState } from 'react'
import { authMessage, useAuth } from '../auth/AuthContext'
import { ALLOWED_DOMAIN } from '../lib/firebase'

type Mode = 'signin' | 'signup' | 'reset'

const input = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none'

export function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const switchTo = (m: Mode) => {
    setMode(m)
    setError(null)
    setInfo(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') await signIn(email, password)
      else if (mode === 'signup') {
        if (!name.trim()) throw new Error('Enter your name.')
        await signUp(name, email, password)
      } else {
        await resetPassword(email)
        setInfo('If an account exists for that email, a reset link is on its way. Check your spam folder too.')
      }
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const placeholder = ALLOWED_DOMAIN ? `you@${ALLOWED_DOMAIN}` : 'you@company.com'

  return (
    <div className="grid h-full place-items-center bg-stone-800 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg bg-amber-600 text-xl font-bold text-white">
            P
          </div>
          <h1 className="text-xl font-semibold">Peak Stoneworkz Boards</h1>
          <p className="mt-1 text-sm text-stone-500">
            {mode === 'signin' && 'Sign in with your work email.'}
            {mode === 'signup' && 'Create your account.'}
            {mode === 'reset' && "We'll email you a link to set a new password."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === 'signup' && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className={input} />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            autoComplete="email"
            className={input}
          />
          {mode !== 'reset' && (
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className={input}
            />
          )}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {mode === 'signin' && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'reset' && 'Send reset link'}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        {info && <p className="mt-3 text-sm text-emerald-700">{info}</p>}

        <div className="mt-5 flex justify-between text-sm">
          {mode === 'signin' ? (
            <>
              <button onClick={() => switchTo('reset')} className="text-stone-500 hover:text-stone-800">
                Forgot password?
              </button>
              <button onClick={() => switchTo('signup')} className="font-medium text-amber-700 hover:underline">
                Create account
              </button>
            </>
          ) : (
            <button onClick={() => switchTo('signin')} className="text-amber-700 hover:underline">
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
