import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';
import { createTeam, updateTeam } from '@/services/teamService';
import { uploadTeamLogo } from '@/services/storageService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { GAMES, REGIONS } from '@/utils/constants';
import type { GameId, Region, TeamMember } from '@/types';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/ui/ImageUpload';
import SectionHeader from '@/components/ui/SectionHeader';

const CreateTeam = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [game, setGame] = useState<GameId>('r6');
  const [region, setRegion] = useState<Region>('eu');
  const [bio, setBio] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!name.trim() || !tag.trim()) return error('Team name and tag are required.');
    if (user.teamId) return error('You are already in a team. Leave it before creating a new one.');
    setLoading(true);
    try {
      const captain: TeamMember = {
        uid: user.uid,
        username: user.username,
        role: 'captain',
        // Only include avatarUrl when set — Firestore rejects `undefined`,
        // even nested inside the members array.
        ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
      };
      const teamId = await createTeam({
        name, tag: tag.toUpperCase(), game, region, bio,
        captainId: user.uid,
        members: [captain],
      });
      if (logoFile) {
        const logoUrl = await uploadTeamLogo(teamId, logoFile);
        await updateTeam(teamId, { logoUrl });
      }
      await refreshUser();
      success('Team created!');
      navigate(`/teams/${teamId}`);
    } catch (e) {
      error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-app max-w-2xl animate-fade-in py-10">
      <SectionHeader title="Create Team" icon={<FiUsers />} />
      <div className="card-surface space-y-5 p-6">
        <div className="flex items-center gap-5">
          <ImageUpload rounded label="Logo" onFile={setLogoFile} />
          <div className="flex-1 space-y-4">
            <Input label="Team Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shadow Dojo" />
            <Input label="Tag" maxLength={5} value={tag} onChange={(e) => setTag(e.target.value)} placeholder="SHD" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Game" value={game} onChange={(e) => setGame(e.target.value as GameId)} options={GAMES.map((g) => ({ value: g.id, label: g.name }))} />
          <Select label="Region" value={region} onChange={(e) => setRegion(e.target.value as Region)} options={REGIONS.map((r) => ({ value: r.id, label: r.label }))} />
        </div>
        <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about your team…" />
        <Button loading={loading} onClick={submit}>Create Team</Button>
      </div>
    </div>
  );
};

export default CreateTeam;
