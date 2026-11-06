import {
  type User,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ALLOWED_DOMAIN, auth } from '../lib/firebase'

interface AuthState {
  user: User | null
  /** Lower-cased email of the signed-in user ('' when signed out) */
  email: string
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resendVerification: () => Promise<void>
  /** Re-checks whether the user clicked the verification link. Returns true once verified. */
  refreshVerification: () => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Use a password with at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase (see README).',
}

/** Turns Firebase auth errors into messages people can act on. */
export function authMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? ''
  return MESSAGES[code] ?? (e as Error).message ?? 'Something went wrong.'
}

const domainOk = (email: string) => !ALLOWED_DOMAIN || email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN)
const domainError = () => new Error(`Use your @${ALLOWED_DOMAIN} email address.`)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Bumped after user.reload() so consumers re-render (the User object is mutated in place).
  const [, setVersion] = useState(0)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      }),
    [],
  )

  const value: AuthState = {
    user,
    email: user?.email?.toLowerCase() ?? '',
    loading,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    },
    signUp: async (name, email, password) => {
      if (!domainOk(email.trim())) throw domainError()
      if (password.length < 8) throw Object.assign(new Error(), { code: 'auth/weak-password' })
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      await updateProfile(cred.user, { displayName: name.trim() })
      await sendEmailVerification(cred.user)
      setVersion((v) => v + 1)
    },
    resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
    resendVerification: async () => {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser)
    },
    refreshVerification: async () => {
      const u = auth.currentUser
      if (!u) return false
      await u.reload()
      // Force a fresh ID token so Firestore rules see email_verified = true.
      if (u.emailVerified) await u.getIdToken(true)
      setVersion((v) => v + 1)
      return u.emailVerified
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
