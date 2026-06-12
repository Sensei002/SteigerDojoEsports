import type {
  GameId,
  TournamentFormat,
  TournamentStatus,
  Region,
  Platform,
  UserRole,
} from '@/types';

export interface GameMeta {
  id: GameId;
  name: string;
  short: string;
  /** Tailwind gradient classes used for game-themed accents */
  accent: string;
  defaultTeamSize: number;
}

export const GAMES: GameMeta[] = [
  { id: 'r6', name: 'Rainbow Six Siege', short: 'R6', accent: 'from-orange-500 to-yellow-500', defaultTeamSize: 5 },
  { id: 'valorant', name: 'Valorant', short: 'VAL', accent: 'from-rose-500 to-red-600', defaultTeamSize: 5 },
  { id: 'cs2', name: 'Counter-Strike 2', short: 'CS2', accent: 'from-amber-500 to-orange-600', defaultTeamSize: 5 },
  { id: 'apex', name: 'Apex Legends', short: 'APEX', accent: 'from-red-600 to-rose-700', defaultTeamSize: 3 },
  { id: 'pubg', name: 'PUBG', short: 'PUBG', accent: 'from-yellow-500 to-amber-600', defaultTeamSize: 4 },
  { id: 'lol', name: 'League of Legends', short: 'LoL', accent: 'from-blue-500 to-indigo-600', defaultTeamSize: 5 },
];

export const GAME_MAP: Record<GameId, GameMeta> = GAMES.reduce(
  (acc, g) => ({ ...acc, [g.id]: g }),
  {} as Record<GameId, GameMeta>
);

export const getGame = (id?: GameId): GameMeta | undefined =>
  id ? GAME_MAP[id] : undefined;

export const TOURNAMENT_FORMATS: { id: TournamentFormat; label: string }[] = [
  { id: 'single_elim', label: 'Single Elimination' },
  { id: 'double_elim', label: 'Double Elimination' },
  { id: 'swiss', label: 'Swiss' },
  { id: 'round_robin', label: 'Round Robin' },
  { id: 'group_playoffs', label: 'Group Stage + Playoffs' },
];

export const TOURNAMENT_STATUS_META: Record<
  TournamentStatus,
  { label: string; color: string }
> = {
  draft: { label: 'Draft', color: 'bg-brand-gray/20 text-brand-gray' },
  registration_open: { label: 'Registration Open', color: 'bg-emerald-500/20 text-emerald-400' },
  registration_closed: { label: 'Registration Closed', color: 'bg-amber-500/20 text-amber-400' },
  live: { label: 'Live', color: 'bg-brand-red/20 text-brand-redGlow' },
  completed: { label: 'Completed', color: 'bg-blue-500/20 text-blue-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-900/30 text-red-400' },
};

export const REGIONS: { id: Region; label: string }[] = [
  { id: 'eu', label: 'Europe' },
  { id: 'na', label: 'North America' },
  { id: 'sa', label: 'South America' },
  { id: 'asia', label: 'Asia' },
  { id: 'oce', label: 'Oceania' },
  { id: 'mena', label: 'MENA' },
  { id: 'global', label: 'Global' },
];

export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'pc', label: 'PC' },
  { id: 'console', label: 'Console' },
  { id: 'crossplay', label: 'Crossplay' },
];

export const ROLES: { id: UserRole; label: string }[] = [
  { id: 'admin', label: 'Admin' },
  { id: 'organizer', label: 'Tournament Organizer' },
  { id: 'captain', label: 'Team Captain' },
  { id: 'player', label: 'Player' },
];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  organizer: 'Organizer',
  captain: 'Captain',
  player: 'Player',
};

/** Roles allowed to create/manage tournaments & site content. */
export const STAFF_ROLES: UserRole[] = ['admin', 'organizer'];

export const PLACEHOLDER_LOGO = '/assets/logo.png';
export const BRAND_NAME = 'SteigerDojoEsports';
