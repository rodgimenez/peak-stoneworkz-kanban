import { useAuth } from '../auth/AuthContext'
import { ALLOWED_DOMAIN } from '../lib/firebase'

export function LoginPage() {
  const { signIn, error } = useAuth()
  return (
    <div className="grid h-full place-items-center bg-stone-800 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg bg-amber-600 text-xl font-bold text-white">
          P
        </div>
        <h1 className="text-xl font-semibold">Peak Stoneworkz Boards</h1>
        <p className="mt-1 text-sm text-stone-500">Track jobs and tasks across the team.</p>
        <button
          onClick={signIn}
          className="mt-6 w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700"
        >
          Sign in with Google
        </button>
        {ALLOWED_DOMAIN && <p className="mt-3 text-xs text-stone-500">Use your @{ALLOWED_DOMAIN} account.</p>}
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  )
}
