import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { buildPowerLawSnapshot } from '../lib/powerLawSnapshot.js';
import { formatUSD, formatDate } from '../../../shared/math/format.js';
// Vite ?raw import — bundles the canonical markdown writeup at build time.
// Source of truth lives at docs/models/catch-up-power-law.md.
import writeupMarkdown from '../../../docs/models/catch-up-power-law.md?raw';

export function ModelsTab(props: { livePrice: number | null }) {
  const today = useMemo(() => new Date(), []);
  const snapshot = useMemo(
    () => buildPowerLawSnapshot({ today, spotUSD: props.livePrice }),
    [today, props.livePrice],
  );

  // The writeup uses {{today}} / {{spot}} / {{model}} / {{multiplier}} tokens
  // that we fill in here from the live snapshot, so the prose never goes
  // stale. The canonical .md file stays the source of truth — it just has
  // placeholders instead of hard-coded numbers.
  const filledWriteup = useMemo(() => {
    const spot = snapshot.spotUSD ? formatUSD(snapshot.spotUSD) : '—';
    const model = formatUSD(snapshot.modelPriceUSD);
    const multiplier =
      snapshot.multiplier !== null ? `${snapshot.multiplier.toFixed(2)}×` : '—';
    return writeupMarkdown
      .replaceAll('{{today}}', formatDate(snapshot.today))
      .replaceAll('{{spot}}', spot)
      .replaceAll('{{model}}', model)
      .replaceAll('{{multiplier}}', multiplier);
  }, [snapshot]);

  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <div>
        <h2 className="mb-2 text-3xl font-bold leading-tight text-text-primary">
          The Catch-Up Power Law
        </h2>
        <p className="text-lg leading-relaxed text-text-secondary">
          The model this app uses for accumulation pricing. Live snapshot,
          calculator, and full writeup below.
        </p>
        <p className="mt-3 text-base leading-relaxed text-text-secondary">
          This app uses the Catch-Up Power Law: current BTC spot converges geometrically to the B1M 1.0x trendline by June 30, 2028, then follows the trendline afterward. This is a planning assumption, not a prediction.
        </p>
      </div>

      <SnapshotCard snapshot={snapshot} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ParametersCard snapshot={snapshot} />
        <ProjectionsCard snapshot={snapshot} />
      </div>

      <article className="prose-mimic rounded-2xl border border-cream-300 bg-white p-7">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={mdComponents}
        >
          {filledWriteup}
        </ReactMarkdown>
      </article>
    </div>
  );
}

function SnapshotCard(props: { snapshot: ReturnType<typeof buildPowerLawSnapshot> }) {
  const s = props.snapshot;
  const multiplierBand: 'cheap' | 'fair' | 'expensive' | null =
    s.multiplier === null
      ? null
      : s.multiplier < 0.7
        ? 'cheap'
        : s.multiplier < 1.2
          ? 'fair'
          : 'expensive';
  const multiplierColor =
    multiplierBand === 'cheap'
      ? 'text-[#3a6b3a]'
      : multiplierBand === 'expensive'
        ? 'text-error'
        : 'text-text-primary';
  const multiplierSub =
    multiplierBand === 'cheap'
      ? 'spot ÷ model · cheap'
      : multiplierBand === 'expensive'
        ? 'spot ÷ model · expensive'
        : multiplierBand === 'fair'
          ? 'spot ÷ model · fair'
          : 'spot ÷ model';
  return (
    <div className="rounded-[20px] border-[1.5px] border-btc-orange bg-gradient-to-br from-[#fef7f2] to-[#fdf0e8] p-7">
      <div className="mb-3 text-base font-bold uppercase tracking-[0.06em] text-btc-orange-end">
        Snapshot · {formatDate(s.today)}
      </div>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-5">
        <Metric
          label="BTC spot"
          value={s.spotUSD ? formatUSD(s.spotUSD) : '—'}
          sub="CoinGecko"
        />
        <Metric
          label="Power Law"
          value={formatUSD(s.modelPriceUSD)}
          sub="B1M trendline"
        />
        <Metric
          label="Multiplier"
          value={s.multiplier !== null ? `${s.multiplier.toFixed(2)}×` : '—'}
          sub={multiplierSub}
          valueClass={multiplierColor}
        />
        <Metric
          label="Catch-up date"
          value={formatDate(new Date(s.catchUpDate + 'T00:00:00Z'))}
          sub="model returns to 1.0×"
        />
        <Metric
          label="Catch-up price"
          value={formatUSD(s.catchUpPriceUSD)}
          sub="trendline on that date"
        />
      </div>
    </div>
  );
}

function ParametersCard(props: { snapshot: ReturnType<typeof buildPowerLawSnapshot> }) {
  const p = props.snapshot.parameters;
  return (
    <div className="rounded-[20px] border border-cream-300 bg-white p-7">
      <div className="mb-3 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
        Model parameters
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Metric label="Slope β" value={p.slope.toFixed(3)} sub="Power Law exponent" />
        <Metric label="R²" value={`${(p.rSquared * 100).toFixed(2)}%`} sub="b1m.io regression" />
        <Metric label="Log volatility" value={p.logVolatility.toFixed(2)} sub="b1m.io regression" />
        <Metric
          label="Model CAGR"
          value={`${(p.cagrToday * 100).toFixed(1)}%`}
          sub="trendline growth this year"
        />
      </div>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        Price = 10<sup>−1.8478</sup> × (years since 2009-01-03)<sup>5.6163</sup>.
        R² and log volatility are reported by b1m.io for the same regression.
      </p>
    </div>
  );
}

function ProjectionsCard(props: { snapshot: ReturnType<typeof buildPowerLawSnapshot> }) {
  return (
    <div className="rounded-[20px] border border-cream-300 bg-white p-7">
      <div className="mb-3 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
        Trendline projections
      </div>
      <div className="space-y-2">
        {props.snapshot.projections.map((p) => (
          <div
            key={p.iso}
            className="flex items-baseline justify-between border-b border-cream-200 pb-2 last:border-0"
          >
            <span className="text-base text-text-secondary">{p.date}</span>
            <span className="text-lg font-semibold tabular-nums text-text-primary">
              {formatUSD(p.price)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        Where the 1.0× Power Law trendline lands on each date. Spot can be
        well above or below.
      </p>
    </div>
  );
}

function Metric(props: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div>
      <div className="text-sm font-bold uppercase tracking-wide text-text-muted">
        {props.label}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${props.valueClass ?? 'text-text-primary'}`}>
        {props.value}
      </div>
      {props.sub && <div className="text-sm text-text-faint">{props.sub}</div>}
    </div>
  );
}

// Tailwind-friendly markdown renderers — match the existing typography.
const mdComponents = {
  h1: (p: { children?: React.ReactNode }) => (
    <h1 className="mb-4 mt-2 text-3xl font-bold text-text-primary">{p.children}</h1>
  ),
  h2: (p: { children?: React.ReactNode }) => (
    <h2 className="mb-3 mt-8 text-2xl font-bold text-text-primary">{p.children}</h2>
  ),
  h3: (p: { children?: React.ReactNode }) => (
    <h3 className="mb-2 mt-6 text-lg font-semibold text-text-primary">{p.children}</h3>
  ),
  p: (p: { children?: React.ReactNode }) => (
    <p className="mb-4 text-lg leading-relaxed text-text-secondary">{p.children}</p>
  ),
  ul: (p: { children?: React.ReactNode }) => (
    <ul className="mb-4 list-disc space-y-1 pl-6 text-lg leading-relaxed text-text-secondary">
      {p.children}
    </ul>
  ),
  ol: (p: { children?: React.ReactNode }) => (
    <ol className="mb-4 list-decimal space-y-1 pl-6 text-lg leading-relaxed text-text-secondary">
      {p.children}
    </ol>
  ),
  li: (p: { children?: React.ReactNode }) => <li>{p.children}</li>,
  strong: (p: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-text-primary">{p.children}</strong>
  ),
  em: (p: { children?: React.ReactNode }) => <em className="italic">{p.children}</em>,
  a: (p: { href?: string; children?: React.ReactNode }) => {
    // Relative links in the source markdown (e.g. ./btc-powerlaw...csv) point
    // at sibling files in docs/models/, not anything Vite serves over HTTP.
    // Render them as plain text rather than broken anchors.
    const isExternal = p.href && /^https?:\/\//i.test(p.href);
    if (!isExternal) return <span className="text-text-primary">{p.children}</span>;
    return (
      <a
        href={p.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-btc-orange-end underline decoration-btc-orange/40 underline-offset-2 hover:decoration-btc-orange-end"
      >
        {p.children}
      </a>
    );
  },
  code: (p: { children?: React.ReactNode }) => (
    <code className="rounded bg-cream-100 px-1.5 py-0.5 text-[0.92em] text-text-primary">
      {p.children}
    </code>
  ),
  hr: () => <hr className="my-8 border-cream-200" />,
  table: (p: { children?: React.ReactNode }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-base">{p.children}</table>
    </div>
  ),
  thead: (p: { children?: React.ReactNode }) => (
    <thead className="border-b border-cream-300 text-left text-text-muted">{p.children}</thead>
  ),
  tbody: (p: { children?: React.ReactNode }) => <tbody>{p.children}</tbody>,
  tr: (p: { children?: React.ReactNode }) => (
    <tr className="border-b border-cream-200 last:border-0">{p.children}</tr>
  ),
  th: (p: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left font-semibold text-text-primary">{p.children}</th>
  ),
  td: (p: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 align-top text-text-secondary">{p.children}</td>
  ),
  blockquote: (p: { children?: React.ReactNode }) => (
    <blockquote className="mb-4 border-l-2 border-btc-orange/50 pl-4 italic text-text-secondary">
      {p.children}
    </blockquote>
  ),
};
