import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiBarChart2, FiUsers, FiClock } from 'react-icons/fi';
import { listPublicTournaments } from '@/services/tournamentService';
import { listTeams } from '@/services/teamService';
import type { GameId, Tournament, Team } from '@/types';
import { getGame } from '@/utils/constants';
import { winRate } from '@/utils/helpers';
import TournamentCard from '@/components/tournaments/TournamentCard';
import Avatar from '@/components/ui/Avatar';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

interface PickBanItem {
  name: string;
  rate?: string;
}

interface Props {
  game: GameId;
  /** Label for the pick/ban panel e.g. "Operator Bans" or "Agent Picks". */
  pickBanTitle: string;
  pickBanItems: PickBanItem[];
  apiNote: string;
  hero?: ReactNode;
}

/**
 * Shared layout for a game-specific hub (R6, Valorant, …): featured
 * tournaments, standings/rankings, schedule and a game-data panel that
 * doubles as an integration placeholder for the official APIs.
 */
const GameHub = ({ game, pickBanTitle, pickBanItems, apiNote, hero }: Props) => {
  const meta = getGame(game);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    (async () => {
      const [all, tm] = await Promise.all([listPublicTournaments(100), listTeams(50)]);
      setTournaments(all.filter((t) => t.game === game));
      setTeams(tm.filter((t) => t.game === game));
    })();
  }, [game]);

  const upcoming = tournaments.filter((t) =>
    ['registration_open', 'registration_closed', 'live'].includes(t.status)
  );
  const rankedTeams = [...teams]
    .sort((a, b) => winRate(b.stats?.wins, b.stats?.losses) - winRate(a.stats?.wins, a.stats?.losses))
    .slice(0, 10);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className={`relative overflow-hidden border-b border-brand-border bg-gradient-to-br ${meta?.accent}`}>
        <div className="absolute inset-0 bg-brand-black/60" />
        <div className="container-app relative py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/80">Game Hub</p>
          <h1 className="heading-display mt-2 text-4xl font-bold text-white md:text-5xl">{meta?.name}</h1>
          {hero}
          <div className="mt-6 flex gap-3">
            <Link to={`/tournaments?game=${game}`}><Button>View Tournaments</Button></Link>
          </div>
        </div>
      </div>

      <div className="container-app grid grid-cols-1 gap-8 py-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {/* Schedule / featured */}
          <section>
            <SectionHeader title="Match Schedule" subtitle="Upcoming & live events" icon={<FiCalendar />} />
            {upcoming.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {upcoming.map((t) => <TournamentCard key={t.id} tournament={t} />)}
              </div>
            ) : (
              <EmptyState icon={<FiClock size={32} />} title="No scheduled events" description={`No ${meta?.short} tournaments are live right now.`} />
            )}
          </section>

          {/* Standings */}
          <section>
            <SectionHeader title="Tournament Standings" subtitle="Recent results" icon={<FiBarChart2 />} />
            {tournaments.filter((t) => t.status === 'completed').length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {tournaments.filter((t) => t.status === 'completed').slice(0, 4).map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-brand-gray">No completed tournaments yet.</p>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pick / ban panel */}
          <section className="card-surface p-6">
            <h2 className="heading-display mb-1 text-lg text-white">{pickBanTitle}</h2>
            <p className="mb-4 text-xs text-brand-gray">{apiNote}</p>
            <div className="space-y-2">
              {pickBanItems.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-dark px-3 py-2">
                  <span className="text-sm font-medium text-brand-light">{item.name}</span>
                  {item.rate && <span className="text-xs font-mono text-brand-red">{item.rate}</span>}
                </div>
              ))}
            </div>
          </section>

          {/* Team rankings */}
          <section className="card-surface p-6">
            <h2 className="heading-display mb-4 flex items-center gap-2 text-lg text-white"><FiUsers /> Team Rankings</h2>
            {rankedTeams.length ? (
              <div className="space-y-1">
                {rankedTeams.map((t, i) => (
                  <Link key={t.id} to={`/teams/${t.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-brand-dark">
                    <span className="heading-display w-5 text-center text-sm text-brand-gray">{i + 1}</span>
                    <Avatar src={t.logoUrl} name={t.name} size={30} square />
                    <span className="flex-1 truncate text-sm font-medium text-brand-light">{t.name}</span>
                    <span className="text-xs font-mono text-brand-gray">{winRate(t.stats?.wins, t.stats?.losses)}%</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-brand-gray">No ranked teams yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default GameHub;
