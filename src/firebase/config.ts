import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

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
  // Realtime Database — used to mirror registered teams into Match Control.
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
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

  // On a deployed build this almost always means the GitHub Actions secrets
  // were missing/empty when the site was built. Show a readable banner instead
  // of a blank screen so the cause is obvious.
  if (typeof document !== 'undefined') {
    const el = document.getElementById('root');
    if (el) {
      el.innerHTML =
        '<div style="font-family:system-ui,sans-serif;max-width:640px;margin:15vh auto;padding:2rem;' +
        'color:#e6e6e6;background:#161616;border:1px solid #e11d2a;border-radius:12px;line-height:1.6">' +
        '<h1 style="color:#e11d2a;margin-top:0">Firebase is not configured</h1>' +
        '<p>This deployed build was compiled without your Firebase keys. The most ' +
        'common cause is missing or empty <b>GitHub Actions secrets</b>.</p>' +
        '<p>Fix: add every <code>VITE_FIREBASE_*</code> and <code>VITE_CLOUDINARY_*</code> ' +
        'value under <b>Settings → Secrets and variables → Actions</b>, then ' +
        '<b>re-run the deploy workflow</b> (Actions → latest run → Re-run all jobs).</p>' +
        '</div>';
    }
  }
}

// initializeApp + getAuth can throw synchronously if apiKey is empty/undefined.
// Guard so a misconfigured environment still renders the app shell.
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Realtime Database client for the Match Control sync (see services/matchControlSync.ts).
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
