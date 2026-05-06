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
    <div className="flex flex-wrap items-center justify-between gap-5 border-b border-cream-300 bg-cream-50 px-8 py-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="btc-grad flex h-11 w-11 items-center justify-center rounded-xl text-2xl font-bold text-white shadow-[0_4px_16px_rgba(247,147,26,0.28)]">₿</div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Stack Buddy</h1>
            <p className="text-sm text-text-muted">Local-first BTC stacking planner</p>
          </div>
        </div>

        <nav className="ml-2 flex items-center gap-1 rounded-xl border border-cream-300 bg-white p-1 text-base">
          <TabButton active={props.tab === 'simple'} onClick={() => props.onTabChange('simple')}>
            Simple
          </TabButton>
          <TabButton active={props.tab === 'plan'} onClick={() => props.onTabChange('plan')}>
            3 Approaches
          </TabButton>
          <TabButton active={props.tab === 'models'} onClick={() => props.onTabChange('models')}>
            Models
          </TabButton>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={props.onShowAbout}
          className="text-base text-text-muted hover:text-btc-orange-end"
        >
          How this works ↗
        </button>

        <div className="flex items-center gap-4 rounded-2xl border border-cream-300 bg-white px-4 py-2 shadow-sm">
        <div className="btc-grad flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold text-white">₿</div>
        <div className="flex flex-col">
          <span className="text-sm font-bold uppercase tracking-wide text-text-muted">BTC spot</span>
          <span className="text-[22px] font-bold leading-tight tabular-nums text-text-primary">
            {btc.price ? `$${Math.round(btc.price).toLocaleString('en-US')}` : '—'}
          </span>
        </div>
        <div className="flex flex-col items-end border-l border-cream-200 pl-4">
          <span className="text-base font-semibold tabular-nums text-btc-orange-end">
            {multiplier !== null ? `${multiplier.toFixed(2)}× Power Law` : '—'}
          </span>
          <button
            onClick={btc.refresh}
            className="text-sm text-text-faint hover:text-btc-orange-end"
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

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        props.active
          ? 'btc-grad rounded-lg px-3.5 py-1.5 text-base font-semibold text-white shadow-sm'
          : 'rounded-lg px-3.5 py-1.5 text-base font-medium text-text-secondary hover:bg-cream-100 hover:text-text-primary'
      }
    >
      {props.children}
    </button>
  );
}
