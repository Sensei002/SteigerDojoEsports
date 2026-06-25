import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiEdit2, FiMapPin, FiUsers, FiAward, FiCheck, FiX, FiMail,
} from 'react-icons/fi';
import { getUser, updateUserProfile } from '@/services/userService';
import { uploadAvatar } from '@/services/storageService';
import { getUserInvites, respondToInvite } from '@/services/teamService';
import type { AppUser, TeamInvite, TeamMember } from '@/types';
import { GAMES, REGIONS, ROLE_LABEL } from '@/utils/constants';
import { winRate } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import GameBadge from '@/components/ui/GameBadge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import ImageUpload from '@/components/ui/ImageUpload';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import clsx from 'clsx';

const Profile = () => {
  const { id } = useParams();
  const { user: me, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [profile, setProfile] = useState<AppUser | null>(null);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const isOwn = me?.uid === id;

  const [form, setForm] = useState({ bio: '', country: '', mainGames: [] as string[] });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    const p = await getUser(id);
    setProfile(p);
    if (p) setForm({ bio: p.bio ?? '', country: p.country ?? '', mainGames: p.mainGames ?? [] });
    if (isOwn) setInvites(await getUserInvites(id));
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id, me]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner /></div>;
  if (!profile) return <div className="container-app py-20"><EmptyState title="Player not found" /></div>;

  const wr = winRate(profile.stats?.wins, profile.stats?.losses);
  const region = REGIONS.find((r) => r.id === profile.country);

  const toggleGame = (g: string) =>
    setForm((f) => ({
      ...f,
      mainGames: f.mainGames.includes(g) ? f.mainGames.filter((x) => x !== g) : [...f.mainGames, g],
    }));

  const save = async () => {
    if (!me) return;
    setSaving(true);
    try {
      let avatarUrl = profile.avatarUrl;
      if (avatarFile) avatarUrl = await uploadAvatar(me.uid, avatarFile);
      await updateUserProfile(me.uid, {
        bio: form.bio, country: form.country,
        mainGames: form.mainGames as AppUser['mainGames'], avatarUrl,
      });
      await refreshUser();
      await load();
      success('Profile updated.');
      setEditOpen(false);
    } catch (e) { error((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleInvite = async (inv: TeamInvite, accept: boolean) => {
    if (!me) return;
    if (accept && me.teamId) return error('Leave your current team before joining another.');
    // Only include avatarUrl when set — Firestore rejects `undefined`, even
    // nested inside the team's members array.
    const member: TeamMember = {
      uid: me.uid,
      username: me.username,
      role: 'player',
      ...(me.avatarUrl ? { avatarUrl: me.avatarUrl } : {}),
    };
    await respondToInvite(inv, accept, member);
    await refreshUser();
    success(accept ? `Joined ${inv.teamName}!` : 'Invite declined.');
    await load();
  };

  return (
    <div className="container-app max-w-4xl animate-fade-in py-10">
      {/* Header */}
      <div className="card-surface mb-6 flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-start">
        <Avatar src={profile.avatarUrl} name={profile.username} size={104} />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="heading-display text-2xl text-white">{profile.username}</h1>
            <Badge className="bg-brand-red/20 text-brand-redGlow">{ROLE_LABEL[profile.role]}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-sm text-brand-gray sm:justify-start">
            {region && <span className="flex items-center gap-1"><FiMapPin size={13} /> {region.label}</span>}
          </div>
          {profile.bio && <p className="mt-2 text-sm text-brand-gray">{profile.bio}</p>}
          {profile.mainGames && profile.mainGames.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {profile.mainGames.map((g) => <GameBadge key={g} game={g} />)}
            </div>
          )}
        </div>
        {isOwn && <Button size="sm" variant="outline" leftIcon={<FiEdit2 />} onClick={() => setEditOpen(true)}>Edit</Button>}
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Win Rate', value: `${wr}%` },
          { label: 'Wins', value: profile.stats?.wins ?? 0 },
          { label: 'Losses', value: profile.stats?.losses ?? 0 },
          { label: 'Tournaments', value: profile.stats?.tournamentsPlayed ?? 0 },
        ].map((s) => (
          <div key={s.label} className="card-surface p-5 text-center">
            <p className="heading-display text-3xl font-bold text-brand-red">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-brand-gray">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Team */}
        <section className="card-surface p-6">
          <h2 className="heading-display mb-4 flex items-center gap-2 text-lg text-white"><FiUsers /> Team</h2>
          {profile.teamId ? (
            <Link to={`/teams/${profile.teamId}`}>
              <Button variant="secondary" size="sm">View team</Button>
            </Link>
          ) : (
            <p className="text-sm text-brand-gray">Not in a team yet.{isOwn && <> <Link to="/teams/create" className="text-brand-red hover:underline">Create one</Link></>}</p>
          )}
        </section>

        {/* Achievements */}
        <section className="card-surface p-6">
          <h2 className="heading-display mb-4 flex items-center gap-2 text-lg text-white"><FiAward /> Achievements</h2>
          {profile.achievements && profile.achievements.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.achievements.map((a) => (
                <Badge key={a.id} className="bg-amber-500/20 text-amber-400">🏆 {a.title}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-gray">No achievements yet. Compete to earn some!</p>
          )}
        </section>
      </div>

      {/* Pending invites (own profile only) */}
      {isOwn && invites.length > 0 && (
        <section className="card-surface mt-6 p-6">
          <h2 className="heading-display mb-4 flex items-center gap-2 text-lg text-white"><FiMail /> Team Invites</h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-dark p-3">
                <Avatar src={inv.teamLogoUrl} name={inv.teamName} size={36} square />
                <p className="flex-1 text-sm text-brand-light"><strong>{inv.invitedBy}</strong> invited you to <strong>{inv.teamName}</strong></p>
                <button onClick={() => handleInvite(inv, true)} className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400 hover:bg-emerald-500/30"><FiCheck size={16} /></button>
                <button onClick={() => handleInvite(inv, false)} className="rounded-lg bg-brand-red/20 p-2 text-brand-red hover:bg-brand-red/30"><FiX size={16} /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        footer={<><Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <ImageUpload rounded preview={profile.avatarUrl} onFile={setAvatarFile} label="Avatar" />
          </div>
          <Select label="Country / Region" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} options={[{ value: '', label: 'Select…' }, ...REGIONS.map((r) => ({ value: r.id, label: r.label }))]} />
          <Textarea label="Bio" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Tell us about yourself…" />
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-gray">Main Games</p>
            <div className="flex flex-wrap gap-2">
              {GAMES.map((g) => (
                <button key={g.id} type="button" onClick={() => toggleGame(g.id)} className={clsx('rounded-full px-3 py-1.5 text-xs font-semibold transition-colors', form.mainGames.includes(g.id) ? 'bg-brand-red text-white' : 'border border-brand-border text-brand-gray hover:text-white')}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
