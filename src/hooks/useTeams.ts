import { useState, useEffect, useCallback } from 'react';
import { listTeams } from '@/services/teamService';
import type { Team } from '@/types';

export const useTeams = (max = 50) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      setTeams(await listTeams(max));
    } finally {
      setLoading(false);
    }
  }, [max]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { teams, loading, refetch: fetch };
};
