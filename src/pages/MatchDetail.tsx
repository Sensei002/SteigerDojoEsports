import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiSend, FiClock } from 'react-icons/fi';
import {
  getMatch, reportScore, forceResult, setMatchStatus,
  sendMatchMessage, subscribeToMatchChat,
} from '@/services/matchService';
import { getTournament } from '@/services/tournamentService';
import type { Match, MatchMessage, Tournament } from '@/types';
import { formatDateTime, fromNow } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import clsx from 'clsx';

const MatchDetail = () => {
  const { id } = useParams();
  const { user, isStaff } = useAuth();
  const { success, error } = useToast();

  const [match, setMatch] = useState<Match | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [messages, setMessages] = useState<MatchMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [chat, setChat] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!id) return;
    const m = await getMatch(id);
    setMatch(m);
    if (m) {
      setScoreA(m.teamA.score ?? 0);
      setScoreB(m.teamB.score ?? 0);
      setTournament(await getTournament(m.tournamentId));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (!id) return;
    return subscribeToMatchChat(id, setMessages);
  }, [id]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner /></div>;
  if (!match) return <div className="container-app py-20"><EmptyState title="Match not found" /></div>;

  const canReport = isStaff ||
    (user && [match.teamA.teamId, match.teamB.teamId].includes(user.teamId ?? ''));
  const winA = match.winnerTeamId === match.teamA.teamId;
  const winB = match.winnerTeamId === match.teamB.teamId;

  const submitScore = async (finalize: boolean) => {
    try {
      await reportScore(match, Number(scoreA), Number(scoreB), finalize);
      success(finalize ? 'Result finalized.' : 'Score reported.');
      await load();
    } catch (e) { error((e as Error).message); }
  };

  const force = async (teamId?: string) => {
    if (!teamId) return;
    await forceResult(match, teamId);
    success('Result forced.');
    await load();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chat.trim() || !user) return;
    await sendMatchMessage({
      matchId: match.id, userId: user.uid, username: user.username,
      avatarUrl: user.avatarUrl, text: chat.trim(),
    });
    setChat('');
  };

  const TeamSide = ({ slot, win }: { slot: Match['teamA']; win: boolean }) => (
    <div className={clsx('flex flex-1 flex-col items-center gap-3 rounded-xl border p-6', win ? 'border-brand-red bg-brand-red/10' : 'border-brand-border bg-brand-dark')}>
      <Avatar src={slot.teamLogoUrl} name={slot.teamName ?? 'TBD'} size={72} square />
      <p className="heading-display text-center text-lg text-white">{slot.teamName ?? 'TBD'}</p>
      <p className="heading-display text-4xl font-bold text-brand-red">{slot.score ?? 0}</p>
      {win && <Badge className="bg-brand-red/20 text-brand-redGlow">Winner</Badge>}
    </div>
  );

  return (
    <div className="container-app max-w-5xl animate-fade-in py-10">
      {tournament && (
        <Link to={`/tournaments/${tournament.id}`} className="text-sm text-brand-red hover:underline">
          ← {tournament.name}
        </Link>
      )}

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Scoreboard */}
          <div className="card-surface p-6">
            <div className="mb-4 flex items-center justify-between text-xs text-brand-gray">
              <Badge className="capitalize">{match.status}</Badge>
              <span className="flex items-center gap-1"><FiClock size={12} /> {formatDateTime(match.scheduledAt) }</span>
            </div>
            <div className="flex items-stretch gap-3">
              <TeamSide slot={match.teamA} win={winA} />
              <div className="flex items-center heading-display text-2xl text-brand-gray">VS</div>
              <TeamSide slot={match.teamB} win={winB} />
            </div>
          </div>

          {/* Reporting */}
          {canReport && match.status !== 'completed' && (
            <div className="card-surface p-6">
              <h3 className="heading-display mb-4 text-lg text-white">Report Score</h3>
              <div className="flex items-end gap-4">
                <Input label={match.teamA.teamName ?? 'Team A'} type="number" min={0} value={scoreA} onChange={(e) => setScoreA(Number(e.target.value))} />
                <span className="pb-3 text-brand-gray">—</span>
                <Input label={match.teamB.teamName ?? 'Team B'} type="number" min={0} value={scoreB} onChange={(e) => setScoreB(Number(e.target.value))} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => submitScore(false)}>Report</Button>
                <Button onClick={() => submitScore(true)}>Finalize Result</Button>
              </div>
            </div>
          )}

          {/* Admin controls */}
          {isStaff && match.status !== 'completed' && (
            <div className="card-surface p-6">
              <h3 className="heading-display mb-3 text-lg text-white">Admin Controls</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => force(match.teamA.teamId)}>Force {match.teamA.teamName}</Button>
                <Button size="sm" variant="outline" onClick={() => force(match.teamB.teamId)}>Force {match.teamB.teamName}</Button>
                <Button size="sm" variant="danger" onClick={async () => { await setMatchStatus(match.id, 'disputed'); await load(); }}>Mark Disputed</Button>
              </div>
            </div>
          )}
        </div>

        {/* Match chat */}
        <div className="card-surface flex h-[32rem] flex-col p-0 lg:col-span-1">
          <div className="border-b border-brand-border px-4 py-3">
            <h3 className="heading-display text-sm text-white">Match Chat</h3>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-brand-gray">No messages yet.</p>
            ) : messages.map((m) => (
              <div key={m.id} className="flex gap-2">
                <Avatar src={m.avatarUrl} name={m.username} size={28} />
                <div className="min-w-0">
                  <p className="text-xs"><span className="font-semibold text-brand-light">{m.username}</span> <span className="text-brand-gray/60">{fromNow(m.createdAt)}</span></p>
                  <p className="break-words text-sm text-brand-gray">{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          {user ? (
            <form onSubmit={send} className="flex gap-2 border-t border-brand-border p-3">
              <input value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Message…" className="input-base" />
              <Button type="submit" size="sm"><FiSend /></Button>
            </form>
          ) : (
            <p className="border-t border-brand-border p-3 text-center text-xs text-brand-gray">
              <Link to="/login" className="text-brand-red hover:underline">Sign in</Link> to chat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;
