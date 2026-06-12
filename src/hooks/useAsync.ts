import { useState, useCallback } from 'react';

/**
 * Generic async-action hook: wraps a promise-returning fn with loading + error
 * state. Useful for form submits and one-off mutations.
 */
export const useAsync = <Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: Args): Promise<Result | undefined> => {
      setLoading(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (e) {
        setError((e as Error).message ?? 'Something went wrong');
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  return { run, loading, error };
};
