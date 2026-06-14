import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { stripUndefined } from '@/utils/helpers';
import type { Tournament, TournamentStatus, GameId } from '@/types';

const TOURNAMENTS = 'tournaments';

export const createTournament = (
  data: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>
) =>
  addDoc(collection(db, TOURNAMENTS), {
    registeredTeams: 0,
    featured: false,
    // Drop optional fields the form left blank (banner, dates) — Firestore
    // rejects `undefined` values.
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).then((ref) => ref.id);

export const getTournament = async (id: string): Promise<Tournament | null> => {
  const snap = await getDoc(doc(db, TOURNAMENTS, id));
  return snap.exists() ? ({ id, ...snap.data() } as Tournament) : null;
};

export const updateTournament = (id: string, data: Partial<Tournament>) =>
  updateDoc(doc(db, TOURNAMENTS, id), { ...stripUndefined(data), updatedAt: serverTimestamp() });

export const deleteTournament = (id: string) =>
  deleteDoc(doc(db, TOURNAMENTS, id));

export const setStatus = (id: string, status: TournamentStatus) =>
  updateTournament(id, { status });

export interface TournamentFilter {
  status?: TournamentStatus;
  game?: GameId;
  featured?: boolean;
  max?: number;
}

export const listTournaments = async (
  filter: TournamentFilter = {}
): Promise<Tournament[]> => {
  const constraints = [];
  if (filter.status) constraints.push(where('status', '==', filter.status));
  if (filter.game) constraints.push(where('game', '==', filter.game));
  if (filter.featured !== undefined) constraints.push(where('featured', '==', filter.featured));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(fbLimit(filter.max ?? 50));

  const q = query(collection(db, TOURNAMENTS), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
};

/** Public tournaments only (anything not in draft). */
export const listPublicTournaments = async (max = 50): Promise<Tournament[]> => {
  const all = await listTournaments({ max: 100 });
  return all.filter((t) => t.status !== 'draft').slice(0, max);
};

export const searchTournaments = async (term: string): Promise<Tournament[]> => {
  const q = query(
    collection(db, TOURNAMENTS),
    where('name', '>=', term),
    where('name', '<=', term + ''),
    fbLimit(10)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Tournament))
    .filter((t) => t.status !== 'draft');
};
