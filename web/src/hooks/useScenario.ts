import { useEffect, useState, useCallback } from 'react';
import type { Scenario } from '../../../shared/types.js';
import { api } from '../lib/api.js';

export function useScenario(slug: string) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getScenario(slug)
      .then((s) => { if (!cancelled) setScenario(s); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const save = useCallback(async (next: Scenario) => {
    await api.saveScenario(next);
    setScenario(next);
  }, []);

  return { scenario, setScenario, save, loading, error };
}
