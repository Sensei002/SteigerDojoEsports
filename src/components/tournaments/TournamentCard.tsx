import { Link } from 'react-router-dom';
import { FiUsers, FiCalendar, FiAward, FiMapPin } from 'react-icons/fi';
import type { Tournament } from '@/types';
import { getGame, TOURNAMENT_STATUS_META, REGIONS } from '@/utils/constants';
import { formatDate } from '@/utils/helpers';
import Badge from '@/components/ui/Badge';
import GameBadge from '@/components/ui/GameBadge';

const TournamentCard = ({ tournament: t }: { tournament: Tournament }) => {
  const game = getGame(t.game);
  const status = TOURNAMENT_STATUS_META[t.status];
  const region = REGIONS.find((r) => r.id === t.region);

  return (
    <Link
      to={`/tournaments/${t.id}`}
      className="group block overflow-hidden rounded-xl border border-brand-border bg-brand-panel shadow-card transition-all duration-200 hover:border-brand-red/50 hover:shadow-glow"
    >
      <div className="relative h-36 overflow-hidden">
        {t.bannerUrl ? (
          <img
            src={t.bannerUrl}
            alt={t.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${game?.accent ?? 'from-brand-panel to-brand-dark'}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-panel via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <GameBadge game={t.game} />
        </div>
        <div className="absolute right-3 top-3">
          <Badge className={status.color}>{status.label}</Badge>
        </div>
      </div>

      <div className="p-4">
        <h3 className="heading-display truncate text-base text-white group-hover:text-brand-red">
          {t.name}
        </h3>
        {t.prizePool && (
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-amber-400">
            <FiAward size={14} /> {t.prizePool}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-brand-gray">
          <span className="flex items-center gap-1.5">
            <FiUsers size={13} /> {t.registeredTeams ?? 0}/{t.maxTeams} teams
          </span>
          <span className="flex items-center gap-1.5">
            <FiMapPin size={13} /> {region?.label ?? t.region}
          </span>
          <span className="col-span-2 flex items-center gap-1.5">
            <FiCalendar size={13} /> {formatDate(t.startDate)}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default TournamentCard;
