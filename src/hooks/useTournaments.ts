import { useState, useEffect, useCallback } from 'react';
import {
  listPublicTournaments,
  listTournaments,
  type TournamentFilter,
} from '@/services/tournamentService';
import type { Tournament } from '@/types';

/** Fetches tournaments with an optional filter and exposes loading/refetch. */
export const useTournaments = (filter?: TournamentFilter, publicOnly = true) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = filter
        ? await listTournaments(filter)
        : await listPublicTournaments();
      setTournaments(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filter), publicOnly]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tournaments, loading, error, refetch: fetch };
};
