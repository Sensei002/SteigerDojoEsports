import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { Match } from '@/types';

interface SlotProps {
  name?: string;
  score?: number;
  winner: boolean;
  seed?: number;
}

const Slot = ({ name, score, winner, seed }: SlotProps) => (
  <div
    className={clsx(
      'flex items-center justify-between gap-2 px-3 py-2 text-sm',
      winner ? 'bg-brand-red/10 text-white' : 'text-brand-gray'
    )}
  >
    <span className="flex min-w-0 items-center gap-2">
      {seed != null && <span className="text-[10px] text-brand-gray/60">#{seed}</span>}
      <span className={clsx('truncate', winner && 'font-semibold')}>{name ?? 'TBD'}</span>
    </span>
    <span className={clsx('font-mono text-sm', winner && 'text-brand-red')}>{score ?? '-'}</span>
  </div>
);

const MatchBox = ({ match }: { match: Match }) => {
  const winA = match.winnerTeamId && match.winnerTeamId === match.teamA.teamId;
  const winB = match.winnerTeamId && match.winnerTeamId === match.teamB.teamId;
  return (
    <Link
      to={`/matches/${match.id}`}
      className="block w-52 overflow-hidden rounded-lg border border-brand-border bg-brand-panel shadow-card transition-colors hover:border-brand-red/60"
    >
      <div className="border-b border-brand-border/70 px-3 py-1 text-[10px] uppercase tracking-wider text-brand-gray">
        Match {match.matchNumber}
      </div>
      <Slot name={match.teamA.teamName} score={match.teamA.score} winner={!!winA} seed={match.teamA.seed} />
      <div className="h-px bg-brand-border" />
      <Slot name={match.teamB.teamName} score={match.teamB.score} winner={!!winB} seed={match.teamB.seed} />
    </Link>
  );
};

/**
 * Bracket visualization. Groups matches into columns by round so single/double
 * elimination brackets render left-to-right with connector spacing.
 */
const Bracket = ({ matches }: { matches: Match[] }) => {
  if (matches.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-brand-gray">
        The bracket has not been generated yet.
      </p>
    );
  }

  // Separate winners/losers for double elim presentation.
  const byBracket = (type: Match['bracketType']) =>
    matches.filter((m) =>
      type === 'winners'
        ? m.bracketType !== 'losers'
        : m.bracketType === 'losers'
    );

  const renderColumns = (list: Match[]) => {
    const rounds = [...new Set(list.map((m) => m.round))].sort((a, b) => a - b);
    return (
      <div className="flex gap-6">
        {rounds.map((round) => {
          const col = list.filter((m) => m.round === round);
          return (
            <div key={round} className="flex flex-col justify-around gap-4">
              <p className="heading-display text-center text-xs text-brand-gray">Round {round}</p>
              {col.map((m) => (
                <MatchBox key={m.id} match={m} />
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const losers = byBracket('losers');

  return (
    <div className="space-y-8 overflow-x-auto pb-4">
      <div>
        {losers.length > 0 && (
          <p className="heading-display mb-3 text-sm text-emerald-400">Winners Bracket</p>
        )}
        {renderColumns(byBracket('winners'))}
      </div>
      {losers.length > 0 && (
        <div>
          <p className="heading-display mb-3 text-sm text-amber-400">Losers Bracket</p>
          {renderColumns(losers)}
        </div>
      )}
    </div>
  );
};

export default Bracket;
