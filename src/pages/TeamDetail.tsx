import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiUsers, FiUserPlus, FiLogOut, FiStar, FiAward, FiTrash2,
} from 'react-icons/fi';
import {
  getTeam, removeMember, transferCaptaincy, createInvite,
} from '@/services/teamService';
import { searchUsers } from '@/services/userService';
import { pushNotification } from '@/services/notificationService';
import { getTeamRegistrations } from '@/services/registrationService';
import type { Team, AppUser, TeamMember, Registration } from '@/types';
import { REGIONS } from '@/utils/constants';
import { winRate } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import GameBadge from '@/components/ui/GameBadge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';

const TeamDetail = () => {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AppUser[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const [tm, rr] = await Promise.all([getTeam(id), getTeamRegistrations(id)]);
    setTeam(tm);
    setRegs(rr);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner /></div>;
  if (!team) return <div className="container-app py-20"><EmptyState title="Team not found" /></div>;

  const region = REGIONS.find((r) => r.id === team.region);
  const isCaptain = user?.uid === team.captainId;
  const isMember = team.members.some((m) => m.uid === user?.uid);
  const wr = winRate(team.stats?.wins, team.stats?.losses);

  const doSearch = async (term: string) => {
    setSearch(term);
    if (term.length < 2) return setResults([]);
    setResults(await searchUsers(term));
  };

  const invite = async (target: AppUser) => {
    if (!user) return;
    setBusy(true);
    try {
      await createInvite({
        teamId: team.id,
        teamName: team.name,
        teamLogoUrl: team.logoUrl,
        invitedUserId: target.uid,
        invitedUsername: target.username,
        invitedBy: user.username,
      });
      await pushNotification(
        target.uid, 'team_invite', 'Team Invitation',
        `${user.username} invited you to join ${team.name}.`, `/teams/${team.id}`
      );
      success(`Invite sent to ${target.username}.`);
      setInviteOpen(false);
      setSearch(''); setResults([]);
    } catch (e) {
      error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!user) return;
    const me = team.members.find((m) => m.uid === user.uid);
    if (!me) return;
    if (isCaptain && team.members.length > 1)
      return error('Transfer captaincy before leaving the team.');
    await removeMember(team.id, me);
    await refreshUser();
    success('You left the team.');
    await load();
  };

  const promote = async (member: TeamMember) => {
    if (!confirm(`Make ${member.username} the new captain?`)) return;
    await transferCaptaincy(team, member.uid);
    success(`${member.username} is now captain.`);
    await load();
  };

  const kick = async (member: TeamMember) => {
    if (!confirm(`Remove ${member.username} from the team?`)) return;
    await removeMember(team.id, member);
    success(`${member.username} removed.`);
    await load();
  };

  return (
    <div className="container-app animate-fade-in py-10">
      {/* Header */}
      <div className="card-surface mb-6 flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-start">
        <Avatar src={team.logoUrl} name={team.name} size={96} square />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="heading-display text-2xl text-white">{team.name}</h1>
            <span className="text-sm font-bold text-brand-gray">[{team.tag}]</span>
            <GameBadge game={team.game} />
            <Badge>{region?.label}</Badge>
          </div>
          {team.bio && <p className="mt-2 text-sm text-brand-gray">{team.bio}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-6 sm:justify-start">
            {[
              { label: 'Win Rate', value: `${wr}%` },
              { label: 'Wins', value: team.stats?.wins ?? 0 },
              { label: 'Losses', value: team.stats?.losses ?? 0 },
              { label: 'Trophies', value: team.stats?.trophies ?? 0 },
              { label: 'Players', value: team.members.length },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="heading-display text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-brand-gray">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {isCaptain && <Button size="sm" leftIcon={<FiUserPlus />} onClick={() => setInviteOpen(true)}>Invite</Button>}
          {isMember && <Button size="sm" variant="danger" leftIcon={<FiLogOut />} onClick={leave}>Leave</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Roster */}
        <section className="card-surface p-6 lg:col-span-2">
          <h2 className="heading-display mb-4 flex items-center gap-2 text-lg text-white"><FiUsers /> Roster</h2>
          <div className="space-y-2">
            {team.members.map((m) => (
              <div key={m.uid} className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-dark p-3">
                <Avatar src={m.avatarUrl} name={m.username} size={40} />
                <Link to={`/profile/${m.uid}`} className="flex-1 font-medium text-brand-light hover:text-brand-red">
                  {m.username}
                </Link>
                {m.role === 'captain' ? (
                  <Badge className="bg-amber-500/20 text-amber-400"><FiStar size={11} /> Captain</Badge>
                ) : (
                  <Badge>{m.role}</Badge>
                )}
                {isCaptain && m.uid !== team.captainId && (
                  <div className="flex gap-1">
                    <button onClick={() => promote(m)} title="Make captain" className="rounded p-1.5 text-brand-gray hover:bg-brand-panel hover:text-amber-400"><FiStar size={15} /></button>
                    <button onClick={() => kick(m)} title="Remove" className="rounded p-1.5 text-brand-gray hover:bg-brand-panel hover:text-brand-red"><FiTrash2 size={15} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Tournament history */}
        <section className="card-surface h-fit p-6">
          <h2 className="heading-display mb-4 flex items-center gap-2 text-lg text-white"><FiAward /> Tournaments</h2>
          {regs.length === 0 ? (
            <p className="text-sm text-brand-gray">No tournaments yet.</p>
          ) : (
            <div className="space-y-2">
              {regs.map((r) => (
                <Link key={r.id} to={`/tournaments/${r.tournamentId}`} className="block rounded-lg border border-brand-border bg-brand-dark p-3 text-sm transition-colors hover:border-brand-red/50">
                  <p className="font-medium text-brand-light">Tournament entry</p>
                  <p className="text-xs capitalize text-brand-gray">{r.status.replace('_', ' ')}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite players">
        <Input placeholder="Search by username…" value={search} onChange={(e) => doSearch(e.target.value)} autoFocus />
        <div className="mt-4 space-y-2">
          {results.map((u) => (
            <div key={u.uid} className="flex items-center gap-3 rounded-lg border border-brand-border p-2.5">
              <Avatar src={u.avatarUrl} name={u.username} size={34} />
              <span className="flex-1 text-sm font-medium text-brand-light">{u.username}</span>
              <Button size="sm" loading={busy} disabled={!!u.teamId} onClick={() => invite(u)}>
                {u.teamId ? 'In a team' : 'Invite'}
              </Button>
            </div>
          ))}
          {search.length >= 2 && results.length === 0 && (
            <p className="py-4 text-center text-sm text-brand-gray">No players found.</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TeamDetail;
