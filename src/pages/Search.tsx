import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { searchUsers } from '@/services/userService';
import { searchTeams } from '@/services/teamService';
import { searchTournaments } from '@/services/tournamentService';
import type { AppUser, Team, Tournament } from '@/types';
import TournamentCard from '@/components/tournaments/TournamentCard';
import TeamCard from '@/components/teams/TeamCard';
import Avatar from '@/components/ui/Avatar';
import SectionHeader from '@/components/ui/SectionHeader';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';

const Search = () => {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';

  const [players, setPlayers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    (async () => {
      setLoading(true);
      const [p, t, tn] = await Promise.all([
        searchUsers(q), searchTeams(q), searchTournaments(q),
      ]);
      setPlayers(p); setTeams(t); setTournaments(tn);
      setLoading(false);
    })();
  }, [q]);

  const total = players.length + teams.length + tournaments.length;

  return (
    <div className="container-app animate-fade-in py-10">
      <SectionHeader title={`Search results`} subtitle={q ? `for "${q}"` : 'Enter a search term'} icon={<FiSearch />} />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : !q ? (
        <EmptyState icon={<FiSearch size={36} />} title="Search SteigerDojoEsports" description="Find players, teams and tournaments." />
      ) : total === 0 ? (
        <EmptyState icon={<FiSearch size={36} />} title="No results" description={`Nothing matched "${q}".`} />
      ) : (
        <div className="space-y-10">
          {tournaments.length > 0 && (
            <section>
              <h2 className="heading-display mb-4 text-lg text-white">Tournaments</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((t) => <TournamentCard key={t.id} tournament={t} />)}
              </div>
            </section>
          )}
          {teams.length > 0 && (
            <section>
              <h2 className="heading-display mb-4 text-lg text-white">Teams</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {teams.map((t) => <TeamCard key={t.id} team={t} />)}
              </div>
            </section>
          )}
          {players.length > 0 && (
            <section>
              <h2 className="heading-display mb-4 text-lg text-white">Players</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {players.map((p) => (
                  <Link key={p.uid} to={`/profile/${p.uid}`} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-panel p-3 transition-colors hover:border-brand-red/50">
                    <Avatar src={p.avatarUrl} name={p.username} size={40} />
                    <span className="font-medium text-brand-light">{p.username}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
