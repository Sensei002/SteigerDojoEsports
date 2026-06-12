import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { updateTournament } from './tournamentService';
import type { Registration, Tournament, Team, RegistrationStatus } from '@/types';
import { toDate } from '@/utils/helpers';

const REGISTRATIONS = 'registrations';

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

/** Run all registration validation rules for a team against a tournament. */
export const checkEligibility = (
  tournament: Tournament,
  team: Team,
  existing: Registration[]
): EligibilityResult => {
  const reasons: string[] = [];

  // Duplicate registration prevention
  if (existing.some((r) => r.teamId === team.id && r.status !== 'withdrawn')) {
    reasons.push('This team is already registered for the tournament.');
  }

  // Team size validation
  if (team.members.length < tournament.teamSize) {
    reasons.push(
      `Your roster has ${team.members.length} players but the tournament requires ${tournament.teamSize}.`
    );
  }

  // Registration deadline check
  const close = toDate(tournament.registrationClose);
  if (close && close.getTime() < Date.now()) {
    reasons.push('Registration has closed for this tournament.');
  }

  // Status check
  if (tournament.status !== 'registration_open') {
    reasons.push('This tournament is not currently open for registration.');
  }

  // Capacity check
  if ((tournament.registeredTeams ?? 0) >= tournament.maxTeams) {
    reasons.push('This tournament has reached the maximum number of teams.');
  }

  // Game match
  if (team.game !== tournament.game) {
    reasons.push('Your team plays a different game than this tournament.');
  }

  return { eligible: reasons.length === 0, reasons };
};

export const getRegistrations = async (tournamentId: string): Promise<Registration[]> => {
  const q = query(collection(db, REGISTRATIONS), where('tournamentId', '==', tournamentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
};

export const getTeamRegistrations = async (teamId: string): Promise<Registration[]> => {
  const q = query(collection(db, REGISTRATIONS), where('teamId', '==', teamId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
};

export const registerTeam = async (
  data: Omit<Registration, 'id' | 'createdAt' | 'status'>
): Promise<string> => {
  const ref = await addDoc(collection(db, REGISTRATIONS), {
    ...data,
    status: 'pending' as RegistrationStatus,
    createdAt: serverTimestamp(),
  });
  await updateTournament(data.tournamentId, {
    registeredTeams: increment(1) as unknown as number,
  });
  return ref.id;
};

export const updateRegistration = (id: string, data: Partial<Registration>) =>
  updateDoc(doc(db, REGISTRATIONS, id), data);

export const checkIn = (id: string) =>
  updateRegistration(id, { status: 'checked_in' });

export const withdrawRegistration = async (reg: Registration): Promise<void> => {
  await updateRegistration(reg.id, { status: 'withdrawn' });
  await updateTournament(reg.tournamentId, {
    registeredTeams: increment(-1) as unknown as number,
  });
};

export const removeRegistration = (id: string) =>
  deleteDoc(doc(db, REGISTRATIONS, id));
