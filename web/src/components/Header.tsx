import { useBtcPrice } from '../hooks/useBtcPrice.js';
import { b1mPrice } from '../../../shared/math/powerLaw.js';

// Tab key — single source of truth for which pillar is active. PillarStrip
// imports this and exports the canonical PILLARS metadata array.
export type Tab = 'simple' | 'plan' | 'models' | 'ai';

// Header is now brand + BTC card only. The tab nav lives in PillarStrip
// just below the header. On mobile, the BTC card collapses to price-only —
// the multiplier and refresh button are kept on desktop where there's room.
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
      <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-8 sm:py-4">
        {/* Brand block — icon + title + subtitle (subtitle visible on all
            viewports for content parity with desktop) */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="btc-grad flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white shadow-[0_4px_16px_rgba(247,147,26,0.28)] sm:h-11 sm:w-11 sm:text-2xl">
            ₿
          </div>
          <div>
            <h1 className="whitespace-nowrap text-lg font-semibold leading-tight text-text-primary sm:text-xl">
              Stack Buddy
            </h1>
            <p className="text-sm text-text-muted">Local-first BTC stacking planner</p>
          </div>
        </div>

        {/* BTC spot card — full detail on desktop, price-only on mobile */}
        <div className="flex items-center justify-end gap-3 sm:gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-3 py-1.5 shadow-sm sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-2">
            <div className="btc-grad flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white sm:h-9 sm:w-9 sm:rounded-xl sm:text-lg">
              ₿
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wide text-text-muted sm:text-sm">
                BTC spot
              </span>
              <span className="text-base font-bold leading-tight tabular-nums text-text-primary sm:text-[22px]">
                {btc.price ? `$${Math.round(btc.price).toLocaleString('en-US')}` : '—'}
              </span>
            </div>
            {/* Multiplier + refresh — desktop-only. Mobile keeps just the
                price for a calmer header. Per Jay: "we don't need to
                multiply a power law and how many minutes ago" on phones. */}
            <div className="hidden flex-col items-end border-l border-cream-200 pl-3 sm:flex sm:pl-4">
              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-btc-orange-end sm:text-base">
                {multiplier !== null ? `${multiplier.toFixed(2)}× PL` : '—'}
              </span>
              <button
                onClick={btc.refresh}
                className="whitespace-nowrap text-xs text-text-faint hover:text-btc-orange-end sm:text-sm"
                title="Refresh from CoinGecko"
              >
                ↻ {btc.updatedAt ? formatRelative(btc.updatedAt) : 'never'}
                {btc.stale ? ' (stale)' : ''}
              </button>
            </div>
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
