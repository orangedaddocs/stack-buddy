import type { Tab } from './Header.js';

// PillarStrip is the always-visible 4-pillar nav that lives between the
// header and the main content. Replaces the in-header tab nav. Each pillar
// renders a card with number, name, and a one-liner; the active pillar gets
// a cream-orange highlight. On mobile (<sm) the strip is a 2x2 grid; on
// desktop it's 4 across.
//
// PILLARS is the canonical source of truth for pillar copy and order — any
// other surface that names the pillars (footer, etc.) should reference it.

export const PILLARS = [
  {
    key: 'simple',
    num: '1',
    name: 'Simple',
    desc: 'Monthly buying power from your income.',
  },
  {
    key: 'plan',
    num: '2',
    name: 'Three Approaches',
    desc: 'Hit a BTC target by a deadline.',
  },
  {
    key: 'models',
    num: '3',
    name: 'The Model',
    desc: 'Catch-Up Power Law — what prices every buy.',
  },
  {
    key: 'ai',
    num: '4',
    name: 'Use Your Own AI',
    desc: 'Take this plan to a private LLM.',
  },
] as const satisfies ReadonlyArray<{
  key: Tab;
  num: string;
  name: string;
  desc: string;
}>;

export function PillarStrip(props: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav
      aria-label="Stack Buddy pillars"
      className="border-b border-cream-300 bg-cream-50"
    >
      <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-4 sm:gap-3 sm:px-8 sm:py-4">
        {PILLARS.map((p) => {
          const isActive = props.active === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => props.onChange(p.key)}
              aria-current={isActive ? 'page' : undefined}
              className={
                isActive
                  ? 'flex flex-col items-start rounded-xl border border-btc-orange-end bg-cream-100 p-3 text-left shadow-[0_0_0_2px_rgba(247,147,26,0.18)] transition'
                  : 'flex flex-col items-start rounded-xl border border-cream-300 bg-white p-3 text-left transition hover:bg-cream-50'
              }
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-btc-orange-end">
                {p.num}
              </span>
              <span className="mt-0.5 text-sm font-semibold leading-tight text-text-primary sm:text-base">
                {p.name}
              </span>
              <span className="mt-1 text-xs leading-snug text-text-muted sm:text-sm">
                {p.desc}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
