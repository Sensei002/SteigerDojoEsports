import { collection, addDoc, getDocs, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Team, TeamMember } from '@/types';

/**
 * One-way importer that pulls the broadcast teams created in the STGR Match
 * Control app into this site's Firestore `teams` collection so they appear as
 * first-class teams.
 *
 * Match Control and the site now share ONE Firebase project (SteigerDojoEsports),
 * so this reads from the same Realtime Database the rest of the site uses. Teams
 * live under `rooms/<room>/teams`; we fetch them over the RTDB REST API (`.json`),
 * which needs no extra SDK connection. The write side uses the normal Firestore
 * client, so the caller must be a signed-in admin.
 *
 * Re-running is safe: each created team records a `sourceRef`
 * (`matchcontrol:<roomTeamId>`) and already-imported teams are skipped.
 */

// The unified SteigerDojoEsports Realtime Database. Derived from the same env var
// the Firebase client uses (see src/firebase/config.ts and firebase-config.js) so
// there is a single source of truth; falls back to the project's default RTDB URL.
const MC_DB_URL =
  import.meta.env.VITE_FIREBASE_DATABASE_URL ||
  'https://steigerdojoesports-default-rtdb.firebaseio.com';
const MC_ROOM = 'main';

// All Match Control teams are Rainbow Six Siege rosters from the SEA/Asia scene.
const IMPORT_GAME: Team['game'] = 'r6';
const IMPORT_REGION: Team['region'] = 'asia';

/** Shape of a team as stored in the Match Control Realtime Database. */
interface McPlayer {
  name?: string;
  role?: string;
  platform?: string;
}
interface McTeam {
  name?: string;
  short?: string;
  color?: string;
  logo?: string;
  players?: McPlayer[];
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  importedNames: string[];
}

const TEAMS = 'teams';

/** Build a tag from a team name when Match Control has none (first 4 letters). */
const fallbackTag = (name: string) =>
  name.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'TEAM';

const mapRoster = (mcId: string, players: McPlayer[] = []): TeamMember[] =>
  players
    .filter((p) => p && p.name && p.name.trim())
    .map((p, i) => ({
      // Synthetic, stable id — these IGNs are not site accounts, so profile
      // links won't resolve, but the roster renders and the player count is right.
      uid: `mc-${mcId}-${i}`,
      username: p.name!.trim(),
      role: 'player' as const,
    }));

/**
 * Import every Match Control team that hasn't been imported yet.
 * @param adminUid uid of the signed-in admin, recorded as the team's captain
 *                 so they can manage/delete it from the site.
 */
export const importMatchControlTeams = async (
  adminUid: string
): Promise<ImportResult> => {
  // 1. Read the Match Control teams over the public RTDB REST API.
  const res = await fetch(`${MC_DB_URL}/rooms/${MC_ROOM}/teams.json`);
  if (!res.ok) {
    throw new Error(`Could not read Match Control teams (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as Record<string, McTeam> | null;
  const entries = data ? Object.entries(data) : [];

  // 2. Figure out what's already been imported (idempotent re-runs).
  const existing = await getDocs(query(collection(db, TEAMS)));
  const importedRefs = new Set(
    existing.docs.map((d) => (d.data() as Team).sourceRef).filter(Boolean)
  );

  // 3. Write the new ones.
  let imported = 0;
  let skipped = 0;
  const importedNames: string[] = [];

  for (const [mcId, t] of entries) {
    const sourceRef = `matchcontrol:${mcId}`;
    const name = (t.name || '').trim();
    if (!name) {
      skipped += 1;
      continue;
    }
    if (importedRefs.has(sourceRef)) {
      skipped += 1;
      continue;
    }

    const team: Omit<Team, 'id'> = {
      name,
      tag: (t.short || '').trim() || fallbackTag(name),
      game: IMPORT_GAME,
      region: IMPORT_REGION,
      captainId: adminUid,
      members: mapRoster(mcId, t.players),
      bio: 'Imported from STGR Match Control.',
      stats: { wins: 0, losses: 0, tournamentsPlayed: 0, trophies: 0 },
      sourceRef,
    };
    // Firestore rejects `undefined` values, so only set logoUrl when present.
    if (t.logo) team.logoUrl = t.logo;

    await addDoc(collection(db, TEAMS), {
      ...team,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    imported += 1;
    importedNames.push(name);
  }

  return { total: entries.length, imported, skipped, importedNames };
};
