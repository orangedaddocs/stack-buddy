import { useEffect, useState, useCallback } from 'react';

const COINGECKO = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

export type BtcPriceState = {
  price: number | null;
  updatedAt: Date | null;
  stale: boolean;
  refreshing: boolean;
  error: string | null;
};

const STALE_AFTER_MS = 14 * 60 * 1000; // 14 min

export function useBtcPrice(autoRefreshMs = 5 * 60 * 1000): BtcPriceState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<BtcPriceState>({
    price: null,
    updatedAt: null,
    stale: false,
    refreshing: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, refreshing: true }));
    try {
      const res = await fetch(COINGECKO);
      if (!res.ok) throw new Error(`coingecko ${res.status}`);
      const data = await res.json();
      const price = Number(data?.bitcoin?.usd);
      if (!Number.isFinite(price)) throw new Error('coingecko: malformed price');
      setState({ price, updatedAt: new Date(), stale: false, refreshing: false, error: null });
    } catch (e) {
      setState((s) => ({
        ...s,
        refreshing: false,
        stale: true,
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, autoRefreshMs);
    const stale = setInterval(() => {
      setState((s) =>
        s.updatedAt && Date.now() - s.updatedAt.getTime() > STALE_AFTER_MS
          ? { ...s, stale: true }
          : s,
      );
    }, 30 * 1000);
    return () => {
      clearInterval(id);
      clearInterval(stale);
    };
  }, [autoRefreshMs, refresh]);

  return { ...state, refresh };
}
