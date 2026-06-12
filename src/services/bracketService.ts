import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getRegistrations } from './registrationService';
import { setStatus } from './tournamentService';
import type { Bracket, Match, Tournament, Registration } from '@/types';
import {
  autoSeed,
  generateSingleElimination,
  generateDoubleElimination,
  generateRoundRobin,
  type SeededTeam,
  type DraftMatch,
} from '@/utils/bracket';

const BRACKETS = 'brackets';
const MATCHES = 'matches';

export const getBracket = async (tournamentId: string): Promise<Bracket | null> => {
  const q = query(collection(db, BRACKETS), where('tournamentId', '==', tournamentId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Bracket;
};

const buildDraftMatches = (
  format: Tournament['format'],
  seeded: SeededTeam[]
): DraftMatch[] => {
  switch (format) {
    case 'single_elim':
    case 'group_playoffs':
      return generateSingleElimination(seeded);
    case 'double_elim':
      return generateDoubleElimination(seeded);
    case 'round_robin':
    case 'swiss':
      return generateRoundRobin(seeded);
    default:
      return generateSingleElimination(seeded);
  }
};

/**
 * Generate and persist a bracket for a tournament.
 * `seeds` lets organizers pass a manual seed order; otherwise we auto-seed.
 */
export const generateBracket = async (
  tournament: Tournament,
  manualSeeds?: SeededTeam[]
): Promise<Bracket> => {
  const registrations: Registration[] = (await getRegistrations(tournament.id)).filter(
    (r) => r.status !== 'withdrawn' && r.status !== 'rejected'
  );
  const seeded = manualSeeds ?? autoSeed(registrations);

  if (seeded.length < 2) {
    throw new Error('At least two teams are required to generate a bracket.');
  }

  // Remove any existing bracket + matches for idempotency.
  await clearBracket(tournament.id);

  const drafts = buildDraftMatches(tournament.format, seeded);

  // Persist matches first to obtain real IDs, then remap nextMatchId links.
  const batch = writeBatch(db);
  const localToRef = new Map<string, ReturnType<typeof doc>>();
  for (const d of drafts) {
    const ref = doc(collection(db, MATCHES));
    localToRef.set(d.localId, ref);
  }

  const matchIds: string[] = [];
  for (const d of drafts) {
    const ref = localToRef.get(d.localId)!;
    const { localId, nextMatchId, nextLoserMatchId, ...rest } = d;
    const resolvedNext = nextMatchId ? localToRef.get(nextMatchId)?.id ?? null : null;
    const resolvedLoser = nextLoserMatchId
      ? localToRef.get(nextLoserMatchId)?.id ?? null
      : null;
    batch.set(ref, {
      ...rest,
      tournamentId: tournament.id,
      nextMatchId: resolvedNext,
      nextLoserMatchId: resolvedLoser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as Omit<Match, 'id'>);
    matchIds.push(ref.id);
  }

  const rounds = Math.max(...drafts.map((d) => d.round), 1);
  const bracketRef = doc(collection(db, BRACKETS));
  batch.set(bracketRef, {
    tournamentId: tournament.id,
    format: tournament.format,
    rounds,
    matchIds,
    generatedAt: serverTimestamp(),
  } as Omit<Bracket, 'id'>);

  await batch.commit();
  await setStatus(tournament.id, 'live');

  return {
    id: bracketRef.id,
    tournamentId: tournament.id,
    format: tournament.format,
    rounds,
    matchIds,
  };
};

export const clearBracket = async (tournamentId: string): Promise<void> => {
  const matchesSnap = await getDocs(
    query(collection(db, MATCHES), where('tournamentId', '==', tournamentId))
  );
  const bracketsSnap = await getDocs(
    query(collection(db, BRACKETS), where('tournamentId', '==', tournamentId))
  );
  const batch = writeBatch(db);
  matchesSnap.docs.forEach((d) => batch.delete(d.ref));
  bracketsSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};
