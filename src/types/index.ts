import type { Timestamp } from 'firebase/firestore';

/**
 * Central type definitions for every Firestore entity in SteigerDojoEsports.
 * Firestore timestamps are typed as `Timestamp` on read; when writing we use
 * serverTimestamp() which is compatible.
 */

// ----------------------------- Enums / Unions -----------------------------

export type UserRole = 'admin' | 'organizer' | 'captain' | 'player';

export type GameId =
  | 'r6'
  | 'valorant'
  | 'cs2'
  | 'apex'
  | 'pubg'
  | 'lol';

export type TournamentFormat =
  | 'single_elim'
  | 'double_elim'
  | 'swiss'
  | 'round_robin'
  | 'group_playoffs';

export type TournamentStatus =
  | 'draft'
  | 'registration_open'
  | 'registration_closed'
  | 'live'
  | 'completed'
  | 'cancelled';

export type Platform = 'pc' | 'console' | 'crossplay';

export type Region =
  | 'eu'
  | 'na'
  | 'sa'
  | 'asia'
  | 'oce'
  | 'mena'
  | 'global';

export type MatchStatus =
  | 'pending'
  | 'ready'
  | 'live'
  | 'reported'
  | 'completed'
  | 'disputed';

export type RegistrationStatus =
  | 'pending'
  | 'checked_in'
  | 'confirmed'
  | 'rejected'
  | 'withdrawn';

export type NotificationType =
  | 'team_invite'
  | 'tournament'
  | 'match'
  | 'announcement';

// ------------------------------- Entities --------------------------------

export interface AppUser {
  uid: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: UserRole;
  country?: string;
  bio?: string;
  mainGames?: GameId[];
  teamId?: string | null;
  stats?: PlayerStats;
  achievements?: Achievement[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  tournamentsPlayed: number;
}

export interface Achievement {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  earnedAt?: Timestamp;
}

export interface TeamMember {
  uid: string;
  username: string;
  avatarUrl?: string;
  role: 'captain' | 'player' | 'substitute';
  joinedAt?: Timestamp;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  logoUrl?: string;
  game: GameId;
  region: Region;
  captainId: string;
  members: TeamMember[];
  bio?: string;
  stats?: TeamStats;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TeamStats {
  wins: number;
  losses: number;
  tournamentsPlayed: number;
  trophies: number;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  invitedUserId: string;
  invitedUsername: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: Timestamp;
}

export interface Tournament {
  id: string;
  name: string;
  game: GameId;
  bannerUrl?: string;
  description: string;
  rules?: string;
  format: TournamentFormat;
  prizePool?: string;
  registrationOpen?: Timestamp;
  registrationClose?: Timestamp;
  startDate?: Timestamp;
  checkInTime?: Timestamp;
  teamSize: number;
  maxTeams: number;
  region: Region;
  platform: Platform;
  status: TournamentStatus;
  organizerId: string;
  featured?: boolean;
  registeredTeams?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Registration {
  id: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  teamLogoUrl?: string;
  roster: TeamMember[];
  seed?: number;
  status: RegistrationStatus;
  submittedBy: string;
  createdAt?: Timestamp;
}

export interface MatchTeamSlot {
  teamId?: string;
  teamName?: string;
  teamLogoUrl?: string;
  score?: number;
  seed?: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  bracketId?: string;
  round: number;
  matchNumber: number;
  bracketType?: 'winners' | 'losers' | 'grand_final';
  teamA: MatchTeamSlot;
  teamB: MatchTeamSlot;
  winnerTeamId?: string | null;
  status: MatchStatus;
  scheduledAt?: Timestamp;
  // Indices linking to the next match in the bracket graph
  nextMatchId?: string | null;
  nextLoserMatchId?: string | null;
  bestOf?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MatchMessage {
  id: string;
  matchId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  text: string;
  createdAt?: Timestamp;
}

export interface Bracket {
  id: string;
  tournamentId: string;
  format: TournamentFormat;
  rounds: number;
  matchIds: string[];
  generatedAt?: Timestamp;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl?: string;
  category: string;
  authorId: string;
  authorName: string;
  featured?: boolean;
  published: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string;
  url?: string;
  tier?: 'platinum' | 'gold' | 'silver' | 'partner';
  createdAt?: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt?: Timestamp;
}
