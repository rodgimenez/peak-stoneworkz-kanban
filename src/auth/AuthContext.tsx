import { type User, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ALLOWED_DOMAIN, auth, googleProvider } from '../lib/firebase'

interface AuthState {
  user: User | null
  /** Lower-cased email of the signed-in user ('' when signed out) */
  email: string
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        const email = u?.email?.toLowerCase() ?? ''
        if (u && ALLOWED_DOMAIN && !email.endsWith('@' + ALLOWED_DOMAIN)) {
          setError(`Please sign in with your @${ALLOWED_DOMAIN} account.`)
          await fbSignOut(auth)
          return
        }
        setUser(u)
        setLoading(false)
      }),
    [],
  )

  const value: AuthState = {
    user,
    email: user?.email?.toLowerCase() ?? '',
    loading,
    error,
    signIn: async () => {
      setError(null)
      try {
        await signInWithPopup(auth, googleProvider)
      } catch (e) {
        const code = (e as { code?: string }).code
        if (code !== 'auth/popup-closed-by-user') setError((e as Error).message)
      }
    },
    signOut: () => fbSignOut(auth),
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
