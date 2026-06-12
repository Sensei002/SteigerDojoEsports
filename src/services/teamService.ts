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
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { updateUserProfile } from './userService';
import type { Team, TeamInvite, TeamMember } from '@/types';

const TEAMS = 'teams';
const INVITES = 'teamInvites';

export const createTeam = async (
  data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, TEAMS), {
    ...data,
    stats: data.stats ?? { wins: 0, losses: 0, tournamentsPlayed: 0, trophies: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Captain joins their own team & is promoted.
  await updateUserProfile(data.captainId, { teamId: ref.id, role: 'captain' });
  return ref.id;
};

export const getTeam = async (id: string): Promise<Team | null> => {
  const snap = await getDoc(doc(db, TEAMS, id));
  return snap.exists() ? ({ id, ...snap.data() } as Team) : null;
};

export const updateTeam = (id: string, data: Partial<Team>) =>
  updateDoc(doc(db, TEAMS, id), { ...data, updatedAt: serverTimestamp() });

export const deleteTeam = (id: string) => deleteDoc(doc(db, TEAMS, id));

export const listTeams = async (max = 50): Promise<Team[]> => {
  const q = query(collection(db, TEAMS), orderBy('createdAt', 'desc'), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
};

export const addMember = async (teamId: string, member: TeamMember): Promise<void> => {
  await updateDoc(doc(db, TEAMS, teamId), {
    members: arrayUnion(member),
    updatedAt: serverTimestamp(),
  });
  await updateUserProfile(member.uid, { teamId });
};

export const removeMember = async (teamId: string, member: TeamMember): Promise<void> => {
  await updateDoc(doc(db, TEAMS, teamId), {
    members: arrayRemove(member),
    updatedAt: serverTimestamp(),
  });
  await updateUserProfile(member.uid, { teamId: null });
};

export const transferCaptaincy = async (
  team: Team,
  newCaptainId: string
): Promise<void> => {
  const members = team.members.map((m) => ({
    ...m,
    role: m.uid === newCaptainId ? 'captain' : m.uid === team.captainId ? 'player' : m.role,
  })) as TeamMember[];
  await updateDoc(doc(db, TEAMS, team.id), {
    captainId: newCaptainId,
    members,
    updatedAt: serverTimestamp(),
  });
  await updateUserProfile(newCaptainId, { role: 'captain' });
  await updateUserProfile(team.captainId, { role: 'player' });
};

// ------------------------------- Invites ---------------------------------

export const createInvite = (
  data: Omit<TeamInvite, 'id' | 'createdAt' | 'status'>
) =>
  addDoc(collection(db, INVITES), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

export const getUserInvites = async (uid: string): Promise<TeamInvite[]> => {
  const q = query(
    collection(db, INVITES),
    where('invitedUserId', '==', uid),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamInvite));
};

export const respondToInvite = async (
  invite: TeamInvite,
  accept: boolean,
  member: TeamMember
): Promise<void> => {
  await updateDoc(doc(db, INVITES, invite.id), {
    status: accept ? 'accepted' : 'declined',
  });
  if (accept) {
    await addMember(invite.teamId, member);
  }
};

export const searchTeams = async (term: string): Promise<Team[]> => {
  const q = query(
    collection(db, TEAMS),
    where('name', '>=', term),
    where('name', '<=', term + ''),
    fbLimit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
};
