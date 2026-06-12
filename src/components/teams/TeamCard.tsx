import { Link } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';
import type { Team } from '@/types';
import { REGIONS } from '@/utils/constants';
import { winRate } from '@/utils/helpers';
import Avatar from '@/components/ui/Avatar';
import GameBadge from '@/components/ui/GameBadge';

const TeamCard = ({ team }: { team: Team }) => {
  const region = REGIONS.find((r) => r.id === team.region);
  const wr = winRate(team.stats?.wins, team.stats?.losses);

  return (
    <Link
      to={`/teams/${team.id}`}
      className="group flex items-center gap-4 rounded-xl border border-brand-border bg-brand-panel p-4 shadow-card transition-all hover:border-brand-red/50 hover:shadow-glow"
    >
      <Avatar src={team.logoUrl} name={team.name} size={56} square />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="heading-display truncate text-base text-white group-hover:text-brand-red">
            {team.name}
          </h3>
          <span className="text-xs font-bold text-brand-gray">[{team.tag}]</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <GameBadge game={team.game} />
          <span className="text-xs text-brand-gray">{region?.label}</span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-brand-gray">
          <span className="flex items-center gap-1"><FiUsers size={12} /> {team.members.length}</span>
          <span>WR {wr}%</span>
          <span className="text-emerald-400">{team.stats?.wins ?? 0}W</span>
          <span className="text-brand-red">{team.stats?.losses ?? 0}L</span>
        </div>
      </div>
    </Link>
  );
};

export default TeamCard;
