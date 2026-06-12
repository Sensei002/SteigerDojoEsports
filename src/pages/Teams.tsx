import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiPlus, FiFilter } from 'react-icons/fi';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import { GAMES } from '@/utils/constants';
import type { GameId } from '@/types';
import TeamCard from '@/components/teams/TeamCard';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import { ListSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import clsx from 'clsx';

const Teams = () => {
  const { teams, loading } = useTeams(100);
  const { isAuthenticated } = useAuth();
  const [game, setGame] = useState<GameId | 'all'>('all');

  const filtered = game === 'all' ? teams : teams.filter((t) => t.game === game);

  return (
    <div className="container-app animate-fade-in py-10">
      <SectionHeader
        title="Teams"
        subtitle="Browse competitive rosters"
        icon={<FiUsers />}
        action={
          isAuthenticated && (
            <Link to="/teams/create"><Button leftIcon={<FiPlus />}>Create Team</Button></Link>
          )
        }
      />

      <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-1">
        <FiFilter className="shrink-0 text-brand-gray" size={16} />
        <button onClick={() => setGame('all')} className={clsx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase transition-colors', game === 'all' ? 'bg-brand-red text-white' : 'border border-brand-border text-brand-gray hover:text-white')}>All</button>
        {GAMES.map((g) => (
          <button key={g.id} onClick={() => setGame(g.id)} className={clsx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase transition-colors', game === g.id ? 'bg-brand-red text-white' : 'border border-brand-border text-brand-gray hover:text-white')}>{g.short}</button>
        ))}
      </div>

      {loading ? (
        <ListSkeleton count={6} />
      ) : filtered.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => <TeamCard key={t.id} team={t} />)}
        </div>
      ) : (
        <EmptyState
          icon={<FiUsers size={36} />}
          title="No teams found"
          description="Create the first team for this game."
          action={isAuthenticated && <Link to="/teams/create"><Button size="sm">Create Team</Button></Link>}
        />
      )}
    </div>
  );
};

export default Teams;
