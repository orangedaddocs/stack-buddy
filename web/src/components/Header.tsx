import { useBtcPrice } from '../hooks/useBtcPrice.js';
import { b1mPrice } from '../../../shared/math/powerLaw.js';

export type Tab = 'simple' | 'plan' | 'models';

export function Header(props: { tab: Tab; onTabChange: (t: Tab) => void; onShowAbout: () => void }) {
  const btc = useBtcPrice();
  const today = new Date();
  const modelPrice = b1mPrice(today);
  const multiplier =
    btc.price && Number.isFinite(modelPrice) && modelPrice > 0
      ? btc.price / modelPrice
      : null;

  return (
    <div className="border-b border-cream-300 bg-cream-50">
      {/* Mobile-first: stack the brand row, tab row, and BTC card vertically;
          flatten side-by-side on sm+. The desktop layout is preserved at sm+. */}
      <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-5 sm:px-8 sm:py-4">
        {/* Brand + tab nav */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="btc-grad flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white shadow-[0_4px_16px_rgba(247,147,26,0.28)] sm:h-11 sm:w-11 sm:text-2xl">₿</div>
            <div>
              <h1 className="whitespace-nowrap text-lg font-semibold leading-tight text-text-primary sm:text-xl">Stack Buddy</h1>
              {/* Subtitle is descriptive but eats vertical space on phones; hide
                  below sm to keep the brand block one line tall. */}
              <p className="hidden text-sm text-text-muted sm:block">Local-first BTC stacking planner</p>
            </div>
          </div>

          <nav className="ml-1 flex items-center gap-1 rounded-xl border border-cream-300 bg-white p-1 text-sm sm:ml-2 sm:text-base">
            <TabButton active={props.tab === 'simple'} onClick={() => props.onTabChange('simple')}>
              Simple
            </TabButton>
            <TabButton active={props.tab === 'plan'} onClick={() => props.onTabChange('plan')}>
              {/* Shorter label on mobile so the tab row fits on one line at 375px */}
              <span className="sm:hidden">Plan</span>
              <span className="hidden sm:inline">3 Approaches</span>
            </TabButton>
            <TabButton active={props.tab === 'models'} onClick={() => props.onTabChange('models')}>
              Models
            </TabButton>
          </nav>
        </div>

        {/* BTC spot + How this works */}
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <button
            type="button"
            onClick={props.onShowAbout}
            className="whitespace-nowrap text-sm text-text-muted hover:text-btc-orange-end sm:text-base"
          >
            How this works ↗
          </button>

          <div className="flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-3 py-1.5 shadow-sm sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-2">
            <div className="btc-grad flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white sm:h-9 sm:w-9 sm:rounded-xl sm:text-lg">₿</div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wide text-text-muted sm:text-sm">BTC spot</span>
              <span className="text-base font-bold leading-tight tabular-nums text-text-primary sm:text-[22px]">
                {btc.price ? `$${Math.round(btc.price).toLocaleString('en-US')}` : '—'}
              </span>
            </div>
            <div className="flex flex-col items-end border-l border-cream-200 pl-3 sm:pl-4">
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

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        props.active
          ? 'btc-grad whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-sm sm:px-3.5 sm:text-base'
          : 'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-cream-100 hover:text-text-primary sm:px-3.5 sm:text-base'
      }
    >
      {props.children}
    </button>
  );
}
