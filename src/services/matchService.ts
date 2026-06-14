import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { stripUndefined } from '@/utils/helpers';
import type { Match, MatchMessage, MatchStatus } from '@/types';

const MATCHES = 'matches';
const MESSAGES = 'matchMessages';

export const getMatch = async (id: string): Promise<Match | null> => {
  const snap = await getDoc(doc(db, MATCHES, id));
  return snap.exists() ? ({ id, ...snap.data() } as Match) : null;
};

export const getTournamentMatches = async (tournamentId: string): Promise<Match[]> => {
  const q = query(collection(db, MATCHES), where('tournamentId', '==', tournamentId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Match))
    .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);
};

export const updateMatch = (id: string, data: Partial<Match>) =>
  updateDoc(doc(db, MATCHES, id), { ...data, updatedAt: serverTimestamp() });

/**
 * Report a score and (if decisive) advance the winner to the next match.
 * The winner is placed into the first empty slot of the linked next match.
 */
export const reportScore = async (
  match: Match,
  scoreA: number,
  scoreB: number,
  finalize = false
): Promise<void> => {
  const winnerTeamId =
    scoreA === scoreB ? null : scoreA > scoreB ? match.teamA.teamId : match.teamB.teamId;

  await updateMatch(match.id, {
    teamA: { ...match.teamA, score: scoreA },
    teamB: { ...match.teamB, score: scoreB },
    winnerTeamId: finalize ? winnerTeamId : match.winnerTeamId,
    status: finalize ? 'completed' : 'reported',
  });

  if (finalize && winnerTeamId && match.nextMatchId) {
    await advanceWinner(match.nextMatchId, {
      teamId: winnerTeamId,
      teamName: winnerTeamId === match.teamA.teamId ? match.teamA.teamName : match.teamB.teamName,
      teamLogoUrl:
        winnerTeamId === match.teamA.teamId ? match.teamA.teamLogoUrl : match.teamB.teamLogoUrl,
    });
  }
};

const advanceWinner = async (
  nextMatchId: string,
  team: { teamId: string; teamName?: string; teamLogoUrl?: string }
): Promise<void> => {
  const next = await getMatch(nextMatchId);
  if (!next) return;
  const slot = !next.teamA.teamId ? 'teamA' : !next.teamB.teamId ? 'teamB' : null;
  if (!slot) return;
  await updateMatch(nextMatchId, {
    [slot]: { teamId: team.teamId, teamName: team.teamName, teamLogoUrl: team.teamLogoUrl },
  } as Partial<Match>);
};

/** Admin override: force a result without normal score flow. */
export const forceResult = (match: Match, winnerTeamId: string) =>
  updateMatch(match.id, { winnerTeamId, status: 'completed' });

export const rescheduleMatch = (id: string, scheduledAt: Date) =>
  updateMatch(id, { scheduledAt: scheduledAt as unknown as Match['scheduledAt'], status: 'ready' });

export const setMatchStatus = (id: string, status: MatchStatus) =>
  updateMatch(id, { status });

// ----------------------------- Match chat --------------------------------

export const sendMatchMessage = (
  data: Omit<MatchMessage, 'id' | 'createdAt'>
) =>
  // stripUndefined: a sender with no avatar would otherwise pass
  // avatarUrl: undefined, which Firestore rejects.
  addDoc(collection(db, MESSAGES), { ...stripUndefined(data), createdAt: serverTimestamp() });

export const subscribeToMatchChat = (
  matchId: string,
  cb: (messages: MatchMessage[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, MESSAGES),
    where('matchId', '==', matchId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchMessage)));
  });
};
