import { ref, set, remove } from 'firebase/database';
import { rtdb } from '@/firebase/config';
import type { TeamMember } from '@/types';

/**
 * Mirrors a tournament's registered teams into the STGR Match Control broadcast
 * app, which reads teams from the Realtime Database at `rooms/<room>/teams/<id>`.
 *
 * Both apps now share ONE Firebase project, so a write here shows up live in
 * Match Control (control panel + OBS overlays). This is the reverse of
 * `matchControlImport.ts` (which copies Match Control teams into Firestore).
 *
 * We key each team by its Firestore `teamId`, so re-registering the same team
 * overwrites its entry rather than duplicating it. Writes require the caller to
 * be signed in (enforced by the RTDB rules: `rooms/$room` `.write: auth != null`).
 */

/** A team as Match Control stores it (see public/matchcontrol/js/store.js). */
interface McTeam {
  name: string;
  short: string;
  color: string;
  logo: string;
  players: { name: string; role: string; platform: string }[];
}

// Match Control defaults: blue accent, PC (Ubisoft) platform for stat lookups.
const DEFAULT_COLOR = '#1e90ff';
const DEFAULT_PLATFORM = 'ubi';

const toMcPlayers = (roster: TeamMember[] = []): McTeam['players'] =>
  roster
    .filter((m) => m && m.username && m.username.trim())
    .map((m) => ({ name: m.username.trim(), role: m.role, platform: DEFAULT_PLATFORM }));

export interface McSyncInput {
  teamId: string;
  teamName: string;
  teamTag: string;
  teamLogoUrl?: string;
  roster: TeamMember[];
}

/** Write (or overwrite) a team into a Match Control room. */
export const syncTeamToMatchControl = async (
  room: string,
  team: McSyncInput
): Promise<void> => {
  const mc: McTeam = {
    name: team.teamName,
    short: team.teamTag,
    color: DEFAULT_COLOR,
    // RTDB rejects `undefined`, so fall back to an empty string.
    logo: team.teamLogoUrl ?? '',
    players: toMcPlayers(team.roster),
  };
  await set(ref(rtdb, `rooms/${room}/teams/${team.teamId}`), mc);
};

/** Remove a team from a Match Control room (e.g. on withdrawal). */
export const removeTeamFromMatchControl = async (
  room: string,
  teamId: string
): Promise<void> => {
  await remove(ref(rtdb, `rooms/${room}/teams/${teamId}`));
};
