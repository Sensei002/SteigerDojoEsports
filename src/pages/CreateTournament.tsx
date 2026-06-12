import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave } from 'react-icons/fi';
import {
  createTournament,
  getTournament,
  updateTournament,
} from '@/services/tournamentService';
import { uploadTournamentBanner } from '@/services/storageService';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  GAMES,
  TOURNAMENT_FORMATS,
  REGIONS,
  PLATFORMS,
  getGame,
} from '@/utils/constants';
import type { Tournament, GameId, TournamentFormat, Region, Platform } from '@/types';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/ui/ImageUpload';
import SectionHeader from '@/components/ui/SectionHeader';

const emptyForm = {
  name: '',
  game: 'r6' as GameId,
  description: '',
  rules: '',
  format: 'single_elim' as TournamentFormat,
  prizePool: '',
  registrationOpen: '',
  registrationClose: '',
  startDate: '',
  checkInTime: '',
  teamSize: 5,
  maxTeams: 16,
  region: 'eu' as Region,
  platform: 'pc' as Platform,
};

const toTs = (s: string) => (s ? Timestamp.fromDate(new Date(s)) : undefined);

const CreateTournament = () => {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const t = await getTournament(id!);
      if (!t) return;
      setBannerUrl(t.bannerUrl);
      setForm({
        ...emptyForm,
        ...t,
        registrationOpen: '',
        registrationClose: '',
        startDate: '',
        checkInTime: '',
      });
    })();
  }, [id, editing]);

  const update = (k: keyof typeof form, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onGameChange = (g: GameId) => {
    update('game', g);
    update('teamSize', getGame(g)?.defaultTeamSize ?? 5);
  };

  const submit = async (publish: boolean) => {
    if (!form.name.trim()) return error('Tournament name is required.');
    setLoading(true);
    try {
      let banner = bannerUrl;
      if (bannerFile) banner = await uploadTournamentBanner(bannerFile);

      const payload: Omit<Tournament, 'id'> = {
        name: form.name,
        game: form.game,
        bannerUrl: banner,
        description: form.description,
        rules: form.rules,
        format: form.format,
        prizePool: form.prizePool,
        registrationOpen: toTs(form.registrationOpen),
        registrationClose: toTs(form.registrationClose),
        startDate: toTs(form.startDate),
        checkInTime: toTs(form.checkInTime),
        teamSize: Number(form.teamSize),
        maxTeams: Number(form.maxTeams),
        region: form.region,
        platform: form.platform,
        status: publish ? 'registration_open' : 'draft',
        organizerId: user!.uid,
      };

      if (editing) {
        await updateTournament(id!, payload);
        success('Tournament updated.');
        navigate(`/tournaments/${id}`);
      } else {
        const newId = await createTournament(payload);
        success(publish ? 'Tournament published!' : 'Draft saved.');
        navigate(`/tournaments/${newId}`);
      }
    } catch (e) {
      error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-app max-w-3xl animate-fade-in py-10">
      <SectionHeader title={editing ? 'Edit Tournament' : 'Create Tournament'} />

      <div className="card-surface space-y-5 p-6">
        <ImageUpload
          label="Upload banner (16:9 recommended)"
          preview={bannerUrl}
          onFile={(f) => setBannerFile(f)}
        />

        <Input label="Tournament Name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Spring Showdown 2026" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Game" value={form.game} onChange={(e) => onGameChange(e.target.value as GameId)} options={GAMES.map((g) => ({ value: g.id, label: g.name }))} />
          <Select label="Format" value={form.format} onChange={(e) => update('format', e.target.value)} options={TOURNAMENT_FORMATS.map((f) => ({ value: f.id, label: f.label }))} />
        </div>

        <Textarea label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe your tournament…" />
        <Textarea label="Rules" value={form.rules} onChange={(e) => update('rules', e.target.value)} placeholder="Tournament rules and code of conduct…" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Prize Pool" value={form.prizePool} onChange={(e) => update('prizePool', e.target.value)} placeholder="$5,000" />
          <Select label="Region" value={form.region} onChange={(e) => update('region', e.target.value)} options={REGIONS.map((r) => ({ value: r.id, label: r.label }))} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Platform" value={form.platform} onChange={(e) => update('platform', e.target.value)} options={PLATFORMS.map((p) => ({ value: p.id, label: p.label }))} />
          <Input label="Team Size" type="number" min={1} value={form.teamSize} onChange={(e) => update('teamSize', e.target.value)} />
          <Input label="Max Teams" type="number" min={2} value={form.maxTeams} onChange={(e) => update('maxTeams', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Registration Opens" type="datetime-local" value={form.registrationOpen} onChange={(e) => update('registrationOpen', e.target.value)} />
          <Input label="Registration Closes" type="datetime-local" value={form.registrationClose} onChange={(e) => update('registrationClose', e.target.value)} />
          <Input label="Start Date" type="datetime-local" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
          <Input label="Check-in Time" type="datetime-local" value={form.checkInTime} onChange={(e) => update('checkInTime', e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button leftIcon={<FiSave />} loading={loading} onClick={() => submit(true)}>
            {editing ? 'Save & Publish' : 'Publish'}
          </Button>
          <Button variant="secondary" loading={loading} onClick={() => submit(false)}>
            Save as Draft
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateTournament;
