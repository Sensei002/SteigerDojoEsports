import type { Match, MatchStatus, Registration } from '@/types';

/**
 * Pure bracket-generation utilities. These build the match graph in memory;
 * persistence is handled by bracketService. Kept framework-free for testability.
 */

export interface SeededTeam {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  seed: number;
}

/** Next power of two >= n */
export const nextPowerOfTwo = (n: number): number => {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(p, 2);
};

/**
 * Standard seeding order for a bracket of `size` slots (power of two).
 * Produces the classic 1 v 16, 8 v 9 ... ordering so top seeds meet late.
 */
export const seedOrder = (size: number): number[] => {
  let rounds = Math.log2(size);
  let matches: number[] = [1, 2];
  for (let r = 1; r < rounds; r++) {
    const next: number[] = [];
    const sum = matches.length * 2 + 1;
    for (const m of matches) {
      next.push(m);
      next.push(sum - m);
    }
    matches = next;
  }
  return matches;
};

/** Auto-seed registrations by their existing seed, else registration order. */
export const autoSeed = (registrations: Registration[]): SeededTeam[] =>
  [...registrations]
    .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
    .map((r, i) => ({
      teamId: r.teamId,
      teamName: r.teamName,
      teamLogoUrl: r.teamLogoUrl,
      seed: r.seed ?? i + 1,
    }));

type DraftMatch = Omit<Match, 'id' | 'tournamentId'> & { localId: string };

/**
 * Generate single-elimination matches. Byes are handled by leaving a team slot
 * empty; the present team auto-advances when scores are applied.
 */
export const generateSingleElimination = (teams: SeededTeam[]): DraftMatch[] => {
  const size = nextPowerOfTwo(teams.length);
  const order = seedOrder(size);
  const rounds = Math.log2(size);

  // Slot teams into round 1 according to seed order.
  const slots: (SeededTeam | null)[] = order.map((seedNum) => teams[seedNum - 1] ?? null);

  const matches: DraftMatch[] = [];
  let matchCounter = 0;

  // Round 1
  let prevRoundIds: string[] = [];
  for (let i = 0; i < slots.length; i += 2) {
    const localId = `w-1-${matchCounter}`;
    const a = slots[i];
    const b = slots[i + 1];
    matches.push({
      localId,
      round: 1,
      matchNumber: matchCounter + 1,
      bracketType: 'winners',
      teamA: a ? { teamId: a.teamId, teamName: a.teamName, teamLogoUrl: a.teamLogoUrl, seed: a.seed } : {},
      teamB: b ? { teamId: b.teamId, teamName: b.teamName, teamLogoUrl: b.teamLogoUrl, seed: b.seed } : {},
      status: 'pending' as MatchStatus,
      nextMatchId: null,
    });
    prevRoundIds.push(localId);
    matchCounter++;
  }

  // Subsequent rounds
  for (let r = 2; r <= rounds; r++) {
    const roundIds: string[] = [];
    for (let i = 0; i < prevRoundIds.length; i += 2) {
      const localId = `w-${r}-${matchCounter}`;
      matches.push({
        localId,
        round: r,
        matchNumber: matchCounter + 1,
        bracketType: r === rounds ? 'grand_final' : 'winners',
        teamA: {},
        teamB: {},
        status: 'pending',
        nextMatchId: null,
      });
      // Wire the two feeding matches to this one.
      const m1 = matches.find((m) => m.localId === prevRoundIds[i]);
      const m2 = matches.find((m) => m.localId === prevRoundIds[i + 1]);
      if (m1) m1.nextMatchId = localId;
      if (m2) m2.nextMatchId = localId;
      roundIds.push(localId);
      matchCounter++;
    }
    prevRoundIds = roundIds;
  }

  return matches;
};

/**
 * Generate a (simplified) double-elimination structure: a full winners bracket
 * plus a losers bracket and a grand final. Loser routing is wired where the
 * shape is unambiguous; complex minor-round interleaving is left for the
 * organizer to confirm — sufficient for visualization and manual advancement.
 */
export const generateDoubleElimination = (teams: SeededTeam[]): DraftMatch[] => {
  const winners = generateSingleElimination(teams).map((m) => ({ ...m }));
  const size = nextPowerOfTwo(teams.length);
  const wRounds = Math.log2(size);

  const matches: DraftMatch[] = [...winners];
  let counter = winners.length;

  // Losers bracket has 2*(wRounds-1) rounds. We create placeholder matches so
  // the bracket can be visualized and winners advanced manually.
  let losersInRound = size / 2; // teams dropping from WB round 1
  let prevLosersIds: string[] = [];
  let lbRound = 1;
  while (losersInRound >= 1) {
    const count = Math.max(1, Math.floor(losersInRound / 2));
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const localId = `l-${lbRound}-${counter}`;
      matches.push({
        localId,
        round: wRounds + lbRound,
        matchNumber: counter + 1,
        bracketType: 'losers',
        teamA: {},
        teamB: {},
        status: 'pending',
        nextMatchId: null,
      });
      ids.push(localId);
      counter++;
    }
    prevLosersIds.forEach((pid, idx) => {
      const m = matches.find((x) => x.localId === pid);
      if (m) m.nextMatchId = ids[Math.floor(idx / 2)] ?? null;
    });
    prevLosersIds = ids;
    if (losersInRound === 1) break;
    losersInRound = Math.floor(losersInRound / 2);
    lbRound++;
  }

  // Grand final
  matches.push({
    localId: `gf-${counter}`,
    round: wRounds + lbRound + 1,
    matchNumber: counter + 1,
    bracketType: 'grand_final',
    teamA: {},
    teamB: {},
    status: 'pending',
    nextMatchId: null,
  });

  return matches;
};

/** Round-robin schedule (circle method). Each team plays every other once. */
export const generateRoundRobin = (teams: SeededTeam[]): DraftMatch[] => {
  const list = [...teams];
  if (list.length % 2 !== 0) {
    list.push({ teamId: '', teamName: 'BYE', seed: 0 }); // ghost team for byes
  }
  const n = list.length;
  const rounds = n - 1;
  const half = n / 2;
  const matches: DraftMatch[] = [];
  let counter = 0;
  const rotation = [...list];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a.teamId && b.teamId) {
        matches.push({
          localId: `rr-${r}-${counter}`,
          round: r + 1,
          matchNumber: counter + 1,
          bracketType: 'winners',
          teamA: { teamId: a.teamId, teamName: a.teamName, teamLogoUrl: a.teamLogoUrl, seed: a.seed },
          teamB: { teamId: b.teamId, teamName: b.teamName, teamLogoUrl: b.teamLogoUrl, seed: b.seed },
          status: 'pending',
          nextMatchId: null,
        });
        counter++;
      }
    }
    // rotate, keeping first fixed
    rotation.splice(1, 0, rotation.pop()!);
  }
  return matches;
};

export type { DraftMatch };
