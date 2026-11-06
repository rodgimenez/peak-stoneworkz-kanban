import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const env = import.meta.env
export const USE_EMULATORS = env.VITE_USE_EMULATORS === 'true'

export const app = initializeApp({
  // The emulators accept any key; a real project needs the values from .env.local
  apiKey: env.VITE_FIREBASE_API_KEY || (USE_EMULATORS ? 'demo-api-key' : undefined),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || (USE_EMULATORS ? 'localhost' : undefined),
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-peak-kanban',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)

// Offline cache + multi-tab support: boards keep working on spotty shop Wi-Fi.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
})

if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export const ALLOWED_DOMAIN: string = (env.VITE_ALLOWED_DOMAIN || '').toLowerCase()

export const googleProvider = new GoogleAuthProvider()
if (ALLOWED_DOMAIN) googleProvider.setCustomParameters({ hd: ALLOWED_DOMAIN })

// Dev-only: lets automated tests sign in against the Auth emulator without the Google popup.
if (USE_EMULATORS && import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__emulatorSignIn = async (email: string, name: string) => {
    const { signInWithCredential } = await import('firebase/auth')
    const fakeIdToken = JSON.stringify({ sub: email, email, email_verified: true, name })
    await signInWithCredential(auth, GoogleAuthProvider.credential(fakeIdToken))
  }
}
