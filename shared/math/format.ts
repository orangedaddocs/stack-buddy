import { format } from 'date-fns';

export function formatUSD(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (Math.abs(n) >= 10_000) {
    return `$${Math.round(n / 1000)}K`;
  }
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function formatBTC(n: number): string {
  if (!Number.isFinite(n)) return '— BTC';
  return `${n.toFixed(4)} BTC`;
}

export function formatPct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  // Render in UTC so callers passing UTC-anchored dates (e.g. "2027-07-01" or
  // "2027-07-01T00:00:00Z") get a stable label across timezones.
  const utc = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return format(utc, 'MMM d, yyyy');
}
