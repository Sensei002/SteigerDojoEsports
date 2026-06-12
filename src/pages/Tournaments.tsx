import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiAward, FiPlus, FiFilter } from 'react-icons/fi';
import { listPublicTournaments } from '@/services/tournamentService';
import type { Tournament, GameId, TournamentStatus } from '@/types';
import { GAMES, TOURNAMENT_STATUS_META } from '@/utils/constants';
import { useAuth } from '@/contexts/AuthContext';
import TournamentCard from '@/components/tournaments/TournamentCard';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import { ListSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import clsx from 'clsx';

const STATUS_FILTERS: (TournamentStatus | 'all')[] = [
  'all', 'registration_open', 'live', 'completed',
];

const Tournaments = () => {
  const [params, setParams] = useSearchParams();
  const { isStaff } = useAuth();
  const [all, setAll] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const gameFilter = (params.get('game') as GameId | null) ?? 'all';
  const statusFilter = (params.get('status') as TournamentStatus | 'all') ?? 'all';

  useEffect(() => {
    (async () => {
      setLoading(true);
      setAll(await listPublicTournaments(100));
      setLoading(false);
    })();
  }, []);

  const filtered = all.filter(
    (t) =>
      (gameFilter === 'all' || t.game === gameFilter) &&
      (statusFilter === 'all' || t.status === statusFilter)
  );

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next);
  };

  return (
    <div className="container-app animate-fade-in py-10">
      <SectionHeader
        title="Tournaments"
        subtitle="Find your next competition"
        icon={<FiAward />}
        action={
          isStaff && (
            <Link to="/tournaments/create">
              <Button leftIcon={<FiPlus />}>Create Tournament</Button>
            </Link>
          )
        }
      />

      {/* Filters */}
      <div className="mb-8 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <FiFilter className="shrink-0 text-brand-gray" size={16} />
          <button
            onClick={() => setFilter('game', 'all')}
            className={clsx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors', gameFilter === 'all' ? 'bg-brand-red text-white' : 'border border-brand-border text-brand-gray hover:text-white')}
          >
            All Games
          </button>
          {GAMES.map((g) => (
            <button
              key={g.id}
              onClick={() => setFilter('game', g.id)}
              className={clsx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors', gameFilter === g.id ? 'bg-brand-red text-white' : 'border border-brand-border text-brand-gray hover:text-white')}
            >
              {g.short}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter('status', s)}
              className={clsx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors', statusFilter === s ? 'bg-brand-panel text-white ring-1 ring-brand-red/60' : 'border border-brand-border text-brand-gray hover:text-white')}
            >
              {s === 'all' ? 'All Status' : TOURNAMENT_STATUS_META[s as TournamentStatus].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ListSkeleton count={6} />
      ) : filtered.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      ) : (
        <EmptyState
          title="No tournaments found"
          description="Try adjusting your filters or check back later."
        />
      )}
    </div>
  );
};

export default Tournaments;
