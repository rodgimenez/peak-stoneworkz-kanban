import { useState } from 'react'
import { authMessage, useAuth } from '../auth/AuthContext'

export function VerifyEmailPage() {
  const { email, refreshVerification, resendVerification, signOut } = useAuth()
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setMsg({ text: authMessage(e), ok: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid h-full place-items-center bg-stone-800 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-stone-600">
          We sent a verification link to <strong>{email}</strong>. Click it, then come back here.
        </p>
        <p className="mt-1 text-xs text-stone-500">Can't find it? Check your spam or junk folder.</p>
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              if (!(await refreshVerification()))
                setMsg({ text: "Not verified yet. Click the link in the email first.", ok: false })
            })
          }
          className="mt-6 w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          I've verified, continue
        </button>
        <div className="mt-4 flex justify-between text-sm">
          <button
            disabled={busy}
            onClick={() => run(async () => (await resendVerification(), setMsg({ text: 'Sent another link.', ok: true })))}
            className="text-amber-700 hover:underline"
          >
            Resend email
          </button>
          <button onClick={signOut} className="text-stone-500 hover:text-stone-800">
            Sign out
          </button>
        </div>
        {msg && <p className={`mt-3 text-sm ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{msg.text}</p>}
      </div>
    </div>
  )
}
