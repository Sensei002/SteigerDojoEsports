import type { Timestamp } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';

/** Convert a Firestore Timestamp (or Date) to a JS Date safely. */
export const toDate = (ts?: Timestamp | Date | null): Date | null => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof (ts as Timestamp).toDate === 'function') return (ts as Timestamp).toDate();
  return null;
};

export const formatDate = (ts?: Timestamp | Date | null, fmt = 'MMM d, yyyy'): string => {
  const d = toDate(ts);
  return d ? format(d, fmt) : '—';
};

export const formatDateTime = (ts?: Timestamp | Date | null): string =>
  formatDate(ts, "MMM d, yyyy 'at' HH:mm");

export const fromNow = (ts?: Timestamp | Date | null): string => {
  const d = toDate(ts);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '';
};

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const initials = (name?: string): string => {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
};

export const winRate = (wins = 0, losses = 0): number => {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
};

/** Pseudo-random but deterministic color from a string (for avatar fallbacks). */
export const colorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 35%)`;
};

export const truncate = (text: string, len = 120): string =>
  text.length > len ? `${text.slice(0, len).trimEnd()}…` : text;

/**
 * Remove keys whose value is `undefined`. Firestore rejects `undefined` field
 * values, so call this on any object before writing it via addDoc/setDoc/updateDoc.
 * (A field left out entirely is fine — it just isn't written.)
 */
export const stripUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;

/**
 * Recursively remove every `undefined` value — object keys AND values nested
 * inside arrays/objects. Firestore rejects `undefined` anywhere in a document
 * (e.g. an optional `avatarUrl` on a member buried in a `members` array), and
 * the shallow `stripUndefined` above can't reach those. Use this on whole
 * documents before addDoc/setDoc. Firestore sentinels (serverTimestamp(),
 * increment(), arrayUnion(), etc.) and Timestamps are left untouched.
 */
export const deepStripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => deepStripUndefined(v)) as unknown as T;
  }
  // Only descend into plain objects — leave class instances (Firestore
  // FieldValue sentinels, Timestamp, Date, etc.) exactly as they are.
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, deepStripUndefined(v)])
    ) as T;
  }
  return value;
};

/** Map a Firebase auth error code to a friendly message. */
export const authErrorMessage = (code: string): string => {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
  };
  // Surface the raw code for unmapped errors so problems are diagnosable
  // instead of hidden behind a generic message.
  return map[code] ?? `Something went wrong (${code || 'unknown'}). Please try again.`;
};
