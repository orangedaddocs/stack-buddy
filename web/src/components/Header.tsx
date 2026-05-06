import { useBtcPrice } from '../hooks/useBtcPrice.js';
import { b1mPrice } from '../../../shared/math/powerLaw.js';

// Tab key — single source of truth for which pillar is active. PillarStrip
// imports this and exports the canonical PILLARS metadata array.
export type Tab = 'simple' | 'plan' | 'models' | 'ai';

// Header is brand block + BTC spot card, always on a single row at every
// viewport. On mobile the BTC card collapses to a bare-minimum "₿ $98,432"
// inline pill so it can sit beside the brand block at 390px without
// wrapping. The full-detail BTC card (label, multiplier, refresh-time
// button) only appears on desktop where there's room.
export function Header() {
  const btc = useBtcPrice();
  const today = new Date();
  const modelPrice = b1mPrice(today);
  const multiplier =
    btc.price && Number.isFinite(modelPrice) && modelPrice > 0
      ? btc.price / modelPrice
      : null;

  return (
    <div className="border-b border-cream-300 bg-cream-50">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 sm:gap-5 sm:px-8 sm:py-4">
        {/* Brand block — icon + title + subtitle, all viewports */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="btc-grad flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white shadow-[0_4px_16px_rgba(247,147,26,0.28)]">
            ₿
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold leading-tight text-text-primary sm:text-2xl">
              Stack Buddy
            </h1>
            <p className="truncate text-xs text-text-muted sm:text-sm">
              Local-first BTC stacking planner
            </p>
          </div>
        </div>

        {/* Mobile BTC pill — just ₿ + price, no card chrome. Hidden on
            desktop where the full card below renders instead. */}
        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-base font-bold tabular-nums text-text-primary shadow-sm sm:hidden">
          <span className="btc-grad flex h-5 w-5 items-center justify-center rounded-md text-xs font-bold text-white">
            ₿
          </span>
          {btc.price ? `$${Math.round(btc.price).toLocaleString('en-US')}` : '—'}
        </div>

        {/* Desktop BTC card — full detail (label, multiplier, refresh) */}
        <div className="hidden items-center gap-4 rounded-2xl border border-cream-300 bg-white px-4 py-2 shadow-sm sm:flex">
          <div className="btc-grad flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white">
            ₿
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold uppercase tracking-wide text-text-muted">
              BTC spot
            </span>
            <span className="text-[22px] font-bold leading-tight tabular-nums text-text-primary">
              {btc.price ? `$${Math.round(btc.price).toLocaleString('en-US')}` : '—'}
            </span>
          </div>
          <div className="flex flex-col items-end border-l border-cream-200 pl-4">
            <span className="whitespace-nowrap text-base font-semibold tabular-nums text-btc-orange-end">
              {multiplier !== null ? `${multiplier.toFixed(2)}× PL` : '—'}
            </span>
            <button
              onClick={btc.refresh}
              className="whitespace-nowrap text-sm text-text-faint hover:text-btc-orange-end"
              title="Refresh from CoinGecko"
            >
              ↻ {btc.updatedAt ? formatRelative(btc.updatedAt) : 'never'}
              {btc.stale ? ' (stale)' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelative(d: Date): string {
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  return `${Math.round(sec / 60)} min ago`;
}
