import { getGame } from '@/utils/constants';
import type { GameId } from '@/types';
import clsx from 'clsx';

interface Props {
  game: GameId;
  className?: string;
}

const GameBadge = ({ game, className }: Props) => {
  const meta = getGame(game);
  if (!meta) return null;
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r',
        meta.accent,
        className
      )}
    >
      {meta.short}
    </span>
  );
};

export default GameBadge;
