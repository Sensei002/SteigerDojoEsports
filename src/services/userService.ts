import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { AppUser, UserRole } from '@/types';

const USERS = 'users';

export const getUser = async (uid: string): Promise<AppUser | null> => {
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? ({ uid, ...snap.data() } as AppUser) : null;
};

export const createUserProfile = async (
  uid: string,
  data: Partial<AppUser>
): Promise<void> => {
  await setDoc(doc(db, USERS, uid), {
    role: 'player',
    stats: { wins: 0, losses: 0, tournamentsPlayed: 0 },
    achievements: [],
    mainGames: [],
    teamId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...data,
  });
};

export const updateUserProfile = async (
  uid: string,
  data: Partial<AppUser>
): Promise<void> => {
  await updateDoc(doc(db, USERS, uid), { ...data, updatedAt: serverTimestamp() });
};

export const setUserRole = (uid: string, role: UserRole) =>
  updateUserProfile(uid, { role });

export const isUsernameTaken = async (username: string): Promise<boolean> => {
  const q = query(collection(db, USERS), where('username', '==', username), fbLimit(1));
  const snap = await getDocs(q);
  return !snap.empty;
};

export const listUsers = async (max = 100): Promise<AppUser[]> => {
  const q = query(collection(db, USERS), orderBy('createdAt', 'desc'), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser));
};

export const searchUsers = async (term: string): Promise<AppUser[]> => {
  // Firestore lacks substring search; we do a prefix range query on username.
  const end = term + '';
  const q = query(
    collection(db, USERS),
    where('username', '>=', term),
    where('username', '<=', end),
    fbLimit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser));
};
