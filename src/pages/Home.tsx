import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiZap,
  FiCalendar,
  FiCheckCircle,
  FiUsers,
  FiAward,
} from 'react-icons/fi';
import { listPublicTournaments } from '@/services/tournamentService';
import { listTeams } from '@/services/teamService';
import { listArticles } from '@/services/newsService';
import { listSponsors } from '@/services/sponsorService';
import type { Tournament, Team, NewsArticle, Sponsor } from '@/types';
import { getGame } from '@/utils/constants';
import { formatDate, truncate } from '@/utils/helpers';
import { useSiteSettings } from '@/contexts/SettingsContext';
import TournamentCard from '@/components/tournaments/TournamentCard';
import TeamCard from '@/components/teams/TeamCard';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import GameBadge from '@/components/ui/GameBadge';
import { ListSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

const Home = () => {
  const { settings } = useSiteSettings();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [t, tm, n, s] = await Promise.all([
          listPublicTournaments(50),
          listTeams(8),
          listArticles({ publishedOnly: true, max: 4 }),
          listSponsors(),
        ]);
        setTournaments(t);
        setTeams(tm);
        setNews(n);
        setSponsors(s);
      } catch (e) {
        // Firestore unreachable (e.g. unconfigured Firebase) — render empty
        // states instead of hanging on skeletons.
        console.error('Failed to load home data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const live = tournaments.filter((t) => t.status === 'live');
  const upcoming = tournaments.filter((t) =>
    ['registration_open', 'registration_closed'].includes(t.status)
  );
  const completed = tournaments.filter((t) => t.status === 'completed');
  const featured = tournaments.filter((t) => t.featured);
  const banners = (featured.length ? featured : upcoming).slice(0, 5);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % banners.length), 6000);
    return () => clearInterval(id);
  }, [banners.length]);

  const stats = [
    { label: 'Tournaments', value: tournaments.length, icon: FiAward },
    { label: 'Active Teams', value: teams.length, icon: FiUsers },
    { label: 'Live Now', value: live.length, icon: FiZap },
    { label: 'Completed', value: completed.length, icon: FiCheckCircle },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero / Banner slider */}
      <section className="relative overflow-hidden border-b border-brand-border">
        <div className="container-app py-10 lg:py-16">
          {loading ? (
            <div className="h-72 animate-pulse rounded-2xl bg-brand-panel" />
          ) : banners.length > 0 ? (
            <div className="relative h-80 overflow-hidden rounded-2xl border border-brand-border md:h-96">
              {banners.map((t, i) => {
                const game = getGame(t.game);
                return (
                  <div
                    key={t.id}
                    className={`absolute inset-0 transition-opacity duration-700 ${i === slide ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                  >
                    {t.bannerUrl ? (
                      <img src={t.bannerUrl} alt={t.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${game?.accent}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/80 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-center gap-4 p-8 md:p-14">
                      <div className="flex items-center gap-2">
                        <GameBadge game={t.game} />
                        <span className="rounded bg-brand-red/20 px-2 py-0.5 text-xs font-semibold uppercase text-brand-redGlow">
                          {t.featured ? 'Featured' : 'Upcoming'}
                        </span>
                      </div>
                      <h1 className="heading-display max-w-2xl text-3xl font-bold text-white md:text-5xl">
                        {t.name}
                      </h1>
                      {t.prizePool && (
                        <p className="text-lg font-semibold text-amber-400">Prize Pool: {t.prizePool}</p>
                      )}
                      <p className="max-w-xl text-sm text-brand-gray">{truncate(t.description, 140)}</p>
                      <div className="flex gap-3">
                        <Link to={`/tournaments/${t.id}`}>
                          <Button size="lg" leftIcon={<FiZap />}>Join Now</Button>
                        </Link>
                        <Link to="/tournaments">
                          <Button size="lg" variant="outline">Browse all</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

              {banners.length > 1 && (
                <>
                  <button
                    onClick={() => setSlide((s) => (s - 1 + banners.length) % banners.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-brand-red"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setSlide((s) => (s + 1) % banners.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-brand-red"
                  >
                    <FiChevronRight size={20} />
                  </button>
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                    {banners.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSlide(i)}
                        className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-brand-red' : 'w-1.5 bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-panel to-brand-dark p-12 text-center md:p-20">
              <h1 className="heading-display text-4xl font-bold text-white md:text-6xl">
                {settings.heroTitle}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-brand-gray">
                {settings.heroSubtitle}
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Link to="/register"><Button size="lg" leftIcon={<FiZap />}>Get Started</Button></Link>
                <Link to="/tournaments"><Button size="lg" variant="outline">Browse Tournaments</Button></Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Statistics */}
      <section className="border-b border-brand-border bg-brand-dark/50">
        <div className="container-app grid grid-cols-2 gap-4 py-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                <s.icon size={22} />
              </div>
              <div>
                <p className="heading-display text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs uppercase tracking-wide text-brand-gray">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="container-app space-y-16 py-14">
        {/* Live */}
        {(loading || live.length > 0) && (
          <section>
            <SectionHeader title="Live Tournaments" subtitle="Happening right now" icon={<FiZap />} />
            {loading ? <ListSkeleton /> : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {live.map((t) => <TournamentCard key={t.id} tournament={t} />)}
              </div>
            )}
          </section>
        )}

        {/* Upcoming */}
        <section>
          <SectionHeader
            title="Upcoming Tournaments"
            subtitle="Register before they fill up"
            icon={<FiCalendar />}
            action={<Link to="/tournaments"><Button variant="ghost" size="sm">View all <FiArrowRight /></Button></Link>}
          />
          {loading ? <ListSkeleton /> : upcoming.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.slice(0, 6).map((t) => <TournamentCard key={t.id} tournament={t} />)}
            </div>
          ) : (
            <EmptyState title="No upcoming tournaments" description="Check back soon for new competitions." />
          )}
        </section>

        {/* Featured Teams */}
        <section>
          <SectionHeader
            title="Featured Teams"
            subtitle="Top competitive rosters"
            icon={<FiUsers />}
            action={<Link to="/teams"><Button variant="ghost" size="sm">All teams <FiArrowRight /></Button></Link>}
          />
          {loading ? <ListSkeleton /> : teams.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {teams.slice(0, 6).map((t) => <TeamCard key={t.id} team={t} />)}
            </div>
          ) : (
            <EmptyState title="No teams yet" description="Be the first to create a team." action={<Link to="/teams/create"><Button size="sm">Create Team</Button></Link>} />
          )}
        </section>

        {/* Latest News */}
        {(loading || news.length > 0) && (
          <section>
            <SectionHeader
              title="Latest News"
              icon={<FiAward />}
              action={<Link to="/news"><Button variant="ghost" size="sm">All news <FiArrowRight /></Button></Link>}
            />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {news.map((a) => (
                <Link key={a.id} to={`/news/${a.id}`} className="group overflow-hidden rounded-xl border border-brand-border bg-brand-panel transition-colors hover:border-brand-red/50">
                  <div className="h-32 overflow-hidden bg-brand-dark">
                    {a.coverUrl ? (
                      <img src={a.coverUrl} alt={a.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-brand-red/30 to-brand-dark" />
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-red">{a.category}</span>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-white group-hover:text-brand-red">{a.title}</h3>
                    <p className="mt-1 text-xs text-brand-gray">{formatDate(a.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <section>
            <SectionHeader title="Completed Tournaments" subtitle="Recent results" icon={<FiCheckCircle />} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {completed.slice(0, 3).map((t) => <TournamentCard key={t.id} tournament={t} />)}
            </div>
          </section>
        )}

        {/* Sponsors */}
        {sponsors.length > 0 && (
          <section>
            <SectionHeader title="Our Sponsors" subtitle="Powering the competition" />
            <div className="flex flex-wrap items-center justify-center gap-8 rounded-xl border border-brand-border bg-brand-dark/40 p-8">
              {sponsors.map((s) => (
                <a key={s.id} href={s.url ?? '#'} target="_blank" rel="noopener noreferrer" className="opacity-70 transition-opacity hover:opacity-100">
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt={s.name} className="h-10 object-contain" />
                  ) : (
                    <span className="heading-display text-lg text-brand-gray">{s.name}</span>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Home;
