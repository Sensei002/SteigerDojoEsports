import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiAward, FiActivity, FiGrid, FiFileText, FiStar,
  FiTrash2, FiPlus, FiSend, FiShield,
} from 'react-icons/fi';
import { listUsers, setUserRole } from '@/services/userService';
import { listTeams, deleteTeam } from '@/services/teamService';
import { listTournaments, deleteTournament } from '@/services/tournamentService';
import { listArticles, createArticle, deleteArticle } from '@/services/newsService';
import { listSponsors, createSponsor, deleteSponsor } from '@/services/sponsorService';
import { broadcast } from '@/services/notificationService';
import { uploadNewsCover } from '@/services/storageService';
import type { AppUser, Team, Tournament, NewsArticle, Sponsor, UserRole } from '@/types';
import { ROLES, ROLE_LABEL, getGame } from '@/utils/constants';
import { truncate } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ImageUpload from '@/components/ui/ImageUpload';
import clsx from 'clsx';

type Tab = 'overview' | 'users' | 'teams' | 'tournaments' | 'news' | 'sponsors';

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const [newsOpen, setNewsOpen] = useState(false);
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);

  const load = async () => {
    const [u, tm, tn, n, s] = await Promise.all([
      listUsers(200), listTeams(200), listTournaments({ max: 200 }),
      listArticles({ max: 100 }), listSponsors(),
    ]);
    setUsers(u); setTeams(tm); setTournaments(tn); setNews(n); setSponsors(s);
  };

  useEffect(() => { load(); }, []);

  const activeMatches = tournaments.filter((t) => t.status === 'live').length;
  const stats = [
    { label: 'Total Users', value: users.length, icon: FiUsers },
    { label: 'Total Teams', value: teams.length, icon: FiShield },
    { label: 'Tournaments', value: tournaments.length, icon: FiAward },
    { label: 'Live Tournaments', value: activeMatches, icon: FiActivity },
  ];

  const tabs: { id: Tab; label: string; icon: typeof FiGrid }[] = [
    { id: 'overview', label: 'Overview', icon: FiGrid },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'teams', label: 'Teams', icon: FiShield },
    { id: 'tournaments', label: 'Tournaments', icon: FiAward },
    { id: 'news', label: 'News', icon: FiFileText },
    { id: 'sponsors', label: 'Sponsors', icon: FiStar },
  ];

  const changeRole = async (uid: string, role: UserRole) => {
    await setUserRole(uid, role);
    success('Role updated.');
    await load();
  };

  const removeTeam = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    await deleteTeam(id); success('Team deleted.'); await load();
  };
  const removeTournament = async (id: string) => {
    if (!confirm('Delete this tournament?')) return;
    await deleteTournament(id); success('Tournament deleted.'); await load();
  };
  const removeArticle = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    await deleteArticle(id); success('Article deleted.'); await load();
  };
  const removeSponsor = async (id: string) => {
    await deleteSponsor(id); success('Sponsor removed.'); await load();
  };

  return (
    <div className="container-app animate-fade-in py-10">
      <SectionHeader title="Admin Dashboard" subtitle={`Signed in as ${user?.username}`} icon={<FiGrid />}
        action={<Button variant="secondary" leftIcon={<FiSend />} onClick={() => setAnnounceOpen(true)}>Announce</Button>} />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={clsx('flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors', tab === t.id ? 'bg-brand-red text-white' : 'border border-brand-border text-brand-gray hover:text-white')}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card-surface p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red"><s.icon size={20} /></div>
              <p className="heading-display text-3xl font-bold text-white">{s.value}</p>
              <p className="text-xs uppercase tracking-wide text-brand-gray">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-brand-border text-left text-xs uppercase text-brand-gray">
              <tr><th className="p-3">Player</th><th className="p-3">Email</th><th className="p-3">Role</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-b border-brand-border/50">
                  <td className="p-3"><Link to={`/profile/${u.uid}`} className="flex items-center gap-2 font-medium text-brand-light hover:text-brand-red"><Avatar src={u.avatarUrl} name={u.username} size={28} /> {u.username}</Link></td>
                  <td className="p-3 text-brand-gray">{u.email}</td>
                  <td className="p-3">
                    {isAdmin ? (
                      <select value={u.role} onChange={(e) => changeRole(u.uid, e.target.value as UserRole)} className="rounded-lg border border-brand-border bg-brand-dark px-2 py-1 text-xs text-brand-light">
                        {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    ) : <Badge>{ROLE_LABEL[u.role]}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'teams' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-panel p-3">
              <Avatar src={t.logoUrl} name={t.name} size={36} square />
              <Link to={`/teams/${t.id}`} className="flex-1 truncate font-medium text-brand-light hover:text-brand-red">{t.name}</Link>
              <button onClick={() => removeTeam(t.id)} className="text-brand-gray hover:text-brand-red"><FiTrash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'tournaments' && (
        <div className="space-y-2">
          <div className="mb-4 flex justify-end">
            <Link to="/tournaments/create"><Button size="sm" leftIcon={<FiPlus />}>New Tournament</Button></Link>
          </div>
          {tournaments.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-panel p-3">
              <span className="text-xs uppercase text-brand-gray">{getGame(t.game)?.short}</span>
              <Link to={`/tournaments/${t.id}`} className="flex-1 truncate font-medium text-brand-light hover:text-brand-red">{t.name}</Link>
              <Badge>{t.status.replace('_', ' ')}</Badge>
              <Link to={`/tournaments/${t.id}/edit`} className="text-brand-gray hover:text-white text-xs">Edit</Link>
              <button onClick={() => removeTournament(t.id)} className="text-brand-gray hover:text-brand-red"><FiTrash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'news' && (
        <div className="space-y-2">
          <div className="mb-4 flex justify-end">
            <Button size="sm" leftIcon={<FiPlus />} onClick={() => setNewsOpen(true)}>New Article</Button>
          </div>
          {news.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-panel p-3">
              <Link to={`/news/${a.id}`} className="flex-1 truncate font-medium text-brand-light hover:text-brand-red">{a.title}</Link>
              <Badge>{a.published ? 'Published' : 'Draft'}</Badge>
              <button onClick={() => removeArticle(a.id)} className="text-brand-gray hover:text-brand-red"><FiTrash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'sponsors' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button size="sm" leftIcon={<FiPlus />} onClick={() => setSponsorOpen(true)}>Add Sponsor</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sponsors.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-panel p-3">
                {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="h-8 w-8 rounded object-contain" /> : <Avatar name={s.name} size={32} square />}
                <span className="flex-1 truncate font-medium text-brand-light">{s.name}</span>
                <button onClick={() => removeSponsor(s.id)} className="text-brand-gray hover:text-brand-red"><FiTrash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <NewsModal open={newsOpen} onClose={() => setNewsOpen(false)} authorId={user!.uid} authorName={user!.username} onSaved={load} />
      <SponsorModal open={sponsorOpen} onClose={() => setSponsorOpen(false)} onSaved={load} />
      <AnnounceModal open={announceOpen} onClose={() => setAnnounceOpen(false)} userIds={users.map((u) => u.uid)} />
    </div>
  );
};

// ---------------------------- Sub-modals ---------------------------------

const NewsModal = ({ open, onClose, authorId, authorName, onSaved }: { open: boolean; onClose: () => void; authorId: string; authorName: string; onSaved: () => void }) => {
  const { success, error } = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (published: boolean) => {
    if (!title.trim()) return error('Title is required.');
    setBusy(true);
    try {
      let coverUrl: string | undefined;
      if (cover) coverUrl = await uploadNewsCover(cover);
      await createArticle({ title, category, excerpt, content, coverUrl, authorId, authorName, published, featured: false });
      success(published ? 'Article published.' : 'Draft saved.');
      setTitle(''); setExcerpt(''); setContent(''); setCover(null);
      onSaved(); onClose();
    } catch (e) { error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Article" size="lg"
      footer={<><Button variant="ghost" onClick={() => save(false)} loading={busy}>Save Draft</Button><Button onClick={() => save(true)} loading={busy}>Publish</Button></>}>
      <div className="space-y-4">
        <ImageUpload label="Cover image" onFile={setCover} />
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Textarea label="Excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <Textarea label="Content" rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
    </Modal>
  );
};

const SponsorModal = ({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) => {
  const { success, error } = useToast();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return error('Name is required.');
    setBusy(true);
    try {
      await createSponsor({ name, url, tier: 'partner' });
      success('Sponsor added.');
      setName(''); setUrl('');
      onSaved(); onClose();
    } catch (e) { error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Sponsor"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Add</Button></>}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Website URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </div>
    </Modal>
  );
};

const AnnounceModal = ({ open, onClose, userIds }: { open: boolean; onClose: () => void; userIds: string[] }) => {
  const { success, error } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) return error('Title and message are required.');
    setBusy(true);
    try {
      await broadcast(userIds, title, message);
      success(`Announcement sent to ${userIds.length} users.`);
      setTitle(''); setMessage('');
      onClose();
    } catch (e) { error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Send Announcement"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={send} loading={busy} leftIcon={<FiSend />}>Send</Button></>}>
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
    </Modal>
  );
};

export default AdminDashboard;
