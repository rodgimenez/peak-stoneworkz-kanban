import { type FirebaseOptions, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const env = import.meta.env
export const USE_EMULATORS = env.VITE_USE_EMULATORS === 'true'

/** Optional: only allow sign-ups from this email domain, e.g. peakstoneworkz.com */
export const ALLOWED_DOMAIN: string = (env.VITE_ALLOWED_DOMAIN || '').toLowerCase().replace(/^@/, '')

async function loadConfig(): Promise<FirebaseOptions> {
  // 1. Explicit config from .env.local (local development against a real project)
  if (env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    }
  }
  // 2. Local emulators accept any key
  if (USE_EMULATORS) {
    return { apiKey: 'demo-api-key', authDomain: 'localhost', projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-peak-kanban' }
  }
  // 3. On Firebase Hosting the project's web config is served automatically at this reserved URL,
  //    so production builds need no config at all.
  const res = await fetch('/__/firebase/init.json')
  if (!res.ok) throw new Error('Firebase config not found: set VITE_FIREBASE_* in .env.local (see README).')
  return res.json()
}

export const app = initializeApp(await loadConfig())

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
