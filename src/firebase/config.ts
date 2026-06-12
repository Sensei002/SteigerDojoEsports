import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration is loaded from environment variables (see .env.example).
// Never hard-code secrets here — Vite injects VITE_* vars at build time.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/**
 * True when the env vars are still the placeholders from .env.example (or
 * missing entirely). In that state Firebase network calls will fail, but we
 * must NOT let initialization throw — that would white-screen the whole app.
 */
export const isFirebaseConfigured =
  !!firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.startsWith('your-') &&
  !!firebaseConfig.projectId &&
  !firebaseConfig.projectId.startsWith('your-');

if (!isFirebaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '%c[SteigerDojoEsports] Firebase is not configured.',
    'color:#e11d2a;font-weight:bold',
    '\nCreate a .env file (copy .env.example) and add your Firebase project keys,' +
      ' then restart `npm run dev`. The UI will load, but login and data will not work until then.'
  );
}

// initializeApp + getAuth can throw synchronously if apiKey is empty/undefined.
// Guard so a misconfigured environment still renders the app shell.
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
