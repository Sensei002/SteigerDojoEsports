import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiUsers, FiCalendar, FiAward, FiMapPin, FiMonitor, FiEdit2,
  FiTrash2, FiZap, FiClock, FiCheckCircle, FiRadio,
} from 'react-icons/fi';
import {
  getTournament, deleteTournament, setStatus,
} from '@/services/tournamentService';
import {
  getRegistrations, registerTeam, checkEligibility, checkIn,
} from '@/services/registrationService';
import { getTeam } from '@/services/teamService';
import { getTournamentMatches } from '@/services/matchService';
import { generateBracket } from '@/services/bracketService';
import type { Tournament, Registration, Match, Team } from '@/types';
import {
  getGame, TOURNAMENT_STATUS_META, TOURNAMENT_FORMATS, REGIONS, PLATFORMS,
} from '@/utils/constants';
import { formatDateTime } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import GameBadge from '@/components/ui/GameBadge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Bracket from '@/components/brackets/Bracket';
import clsx from 'clsx';

type Tab = 'overview' | 'participants' | 'bracket';

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isStaff } = useAuth();
  const { success, error } = useToast();

  const [t, setT] = useState<Tournament | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [regModal, setRegModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const [tt, rr, mm] = await Promise.all([
      getTournament(id),
      getRegistrations(id),
      getTournamentMatches(id),
    ]);
    setT(tt);
    setRegs(rr.filter((r) => r.status !== 'withdrawn'));
    setMatches(mm);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner /></div>;
  if (!t) return <div className="container-app py-20"><EmptyState title="Tournament not found" /></div>;

  const game = getGame(t.game);
  const status = TOURNAMENT_STATUS_META[t.status];
  const format = TOURNAMENT_FORMATS.find((f) => f.id === t.format);
  const isOrganizer = isStaff || user?.uid === t.organizerId;
  const myReg = regs.find((r) => user && r.roster.some((m) => m.uid === user.uid));

  const handleRegister = async () => {
    if (!user) return navigate('/login');
    if (!user.teamId) return error('You must be in a team to register. Create or join one first.');
    setBusy(true);
    try {
      const team = await getTeam(user.teamId);
      if (!team) return error('Your team could not be found.');
      const elig = checkEligibility(t, team, regs);
      if (!elig.eligible) { error(elig.reasons[0]); return; }
      await registerTeam({
        tournamentId: t.id,
        teamId: team.id,
        teamName: team.name,
        teamTag: team.tag,
        teamLogoUrl: team.logoUrl,
        roster: team.members,
        submittedBy: user.uid,
      });
      success('Team registered!');
      setRegModal(false);
      await load();
    } catch (e) {
      error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    try {
      await generateBracket(t);
      success('Bracket generated!');
      await load();
      setTab('bracket');
    } catch (e) {
      error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this tournament? This cannot be undone.')) return;
    await deleteTournament(t.id);
    success('Tournament deleted.');
    navigate('/tournaments');
  };

  const handleCheckIn = async () => {
    if (!myReg) return;
    await checkIn(myReg.id);
    success('Checked in!');
    await load();
  };

  const infoRows = [
    { icon: FiAward, label: 'Prize Pool', value: t.prizePool || '—' },
    { icon: FiUsers, label: 'Team Size', value: `${t.teamSize} players` },
    { icon: FiMapPin, label: 'Region', value: REGIONS.find((r) => r.id === t.region)?.label },
    { icon: FiMonitor, label: 'Platform', value: PLATFORMS.find((p) => p.id === t.platform)?.label },
    { icon: FiZap, label: 'Format', value: format?.label },
    { icon: FiCalendar, label: 'Starts', value: formatDateTime(t.startDate) },
    { icon: FiClock, label: 'Registration Closes', value: formatDateTime(t.registrationClose) },
    { icon: FiCheckCircle, label: 'Check-in', value: formatDateTime(t.checkInTime) },
  ];

  return (
    <div className="animate-fade-in">
      {/* Banner */}
      <div className="relative h-56 w-full overflow-hidden md:h-72">
        {t.bannerUrl ? (
          <img src={t.bannerUrl} alt={t.name} className="h-full w-full object-cover" />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${game?.accent}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/60 to-transparent" />
        <div className="container-app absolute inset-x-0 bottom-0 pb-6">
          <div className="flex items-center gap-2">
            <GameBadge game={t.game} />
            <Badge className={status.color}>{status.label}</Badge>
          </div>
          <h1 className="heading-display mt-2 text-3xl font-bold text-white md:text-4xl">{t.name}</h1>
        </div>
      </div>

      <div className="container-app py-8">
        {/* Action bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 rounded-lg border border-brand-border bg-brand-panel p-1">
            {(['overview', 'participants', 'bracket'] as Tab[]).map((tb) => (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={clsx('rounded-md px-4 py-2 text-sm font-semibold capitalize transition-colors', tab === tb ? 'bg-brand-red text-white' : 'text-brand-gray hover:text-white')}
              >
                {tb}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {t.status === 'registration_open' && !myReg && (
              <Button leftIcon={<FiZap />} onClick={() => setRegModal(true)}>Register Team</Button>
            )}
            {myReg && myReg.status !== 'checked_in' && (
              <Button variant="secondary" onClick={handleCheckIn}>Check In</Button>
            )}
            {myReg?.status === 'checked_in' && <Badge className="bg-emerald-500/20 text-emerald-400">Checked In</Badge>}
            {isOrganizer && (
              <>
                {regs.length >= 2 && t.status !== 'completed' && (
                  <Button variant="secondary" loading={busy} onClick={handleGenerate}>
                    {matches.length ? 'Regenerate Bracket' : 'Generate Bracket'}
                  </Button>
                )}
                {t.status === 'registration_open' && (
                  <Button variant="outline" onClick={async () => { await setStatus(t.id, 'registration_closed'); await load(); }}>Close Reg</Button>
                )}
                <a href={`${import.meta.env.BASE_URL}matchcontrol/control.html?room=${t.id}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" leftIcon={<FiRadio />}>Match Control</Button>
                </a>
                <Link to={`/tournaments/${t.id}/edit`}><Button variant="outline" leftIcon={<FiEdit2 />}>Edit</Button></Link>
                <Button variant="danger" leftIcon={<FiTrash2 />} onClick={handleDelete}>Delete</Button>
              </>
            )}
          </div>
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="card-surface p-6">
                <h2 className="heading-display mb-3 text-lg text-white">About</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-brand-gray">{t.description || 'No description provided.'}</p>
              </section>
              {t.rules && (
                <section className="card-surface p-6">
                  <h2 className="heading-display mb-3 text-lg text-white">Rules</h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-brand-gray">{t.rules}</p>
                </section>
              )}
            </div>
            <aside className="card-surface h-fit p-6">
              <h2 className="heading-display mb-4 text-lg text-white">Details</h2>
              <div className="space-y-3">
                {infoRows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-brand-gray"><r.icon size={14} /> {r.label}</span>
                    <span className="text-right font-medium text-brand-light">{r.value}</span>
                  </div>
                ))}
                <div className="mt-2 border-t border-brand-border pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-gray">Teams</span>
                    <span className="font-semibold text-white">{regs.length}/{t.maxTeams}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-dark">
                    <div className="h-full bg-brand-red" style={{ width: `${Math.min(100, (regs.length / t.maxTeams) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {tab === 'participants' && (
          <div>
            {regs.length === 0 ? (
              <EmptyState icon={<FiUsers size={36} />} title="No teams registered yet" description="Be the first to sign up!" />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {regs.map((r, i) => (
                  <Link key={r.id} to={`/teams/${r.teamId}`} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-panel p-4 transition-colors hover:border-brand-red/50">
                    <span className="heading-display w-6 text-center text-brand-gray">{r.seed ?? i + 1}</span>
                    <Avatar src={r.teamLogoUrl} name={r.teamName} size={40} square />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{r.teamName}</p>
                      <p className="text-xs text-brand-gray">[{r.teamTag}] · {r.roster.length} players</p>
                    </div>
                    {r.status === 'checked_in' && <FiCheckCircle className="ml-auto text-emerald-400" />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'bracket' && (
          <div className="card-surface p-6">
            <Bracket matches={matches} />
          </div>
        )}
      </div>

      <Modal
        open={regModal}
        onClose={() => setRegModal(false)}
        title="Register your team"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRegModal(false)}>Cancel</Button>
            <Button loading={busy} onClick={handleRegister}>Confirm Registration</Button>
          </>
        }
      >
        <p className="text-sm text-brand-gray">
          You'll register your current team for <strong className="text-white">{t.name}</strong>.
          Make sure your roster has at least <strong className="text-white">{t.teamSize}</strong> players
          and check in before the deadline.
        </p>
      </Modal>
    </div>
  );
};

export default TournamentDetail;
