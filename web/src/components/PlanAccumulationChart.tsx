import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PlanProjectionResult } from '../lib/planProjection.js';
import { formatDate, formatUSD } from '../../../shared/math/format.js';

const CHOSEN_LINE = 'Chosen plan';

export type ChartAlternative = {
  label: string;
  points: { monthIdx: number; cumBtc: number }[];
};

export function PlanAccumulationChart(props: {
  chosen: PlanProjectionResult;
  alternatives?: ChartAlternative[];
  targetBtc: number;
  onShowModelsTab?: () => void;
}) {
  const last = props.chosen.points.at(-1);
  if (!last) return null;

  // Merge into a single dataset keyed on monthIdx so Recharts can render all
  // lines from one data array.
  const altKeys = (props.alternatives ?? []).map((a, i) => `alt${i}`);
  const altByMonth = new Map<number, Record<string, number>>();
  (props.alternatives ?? []).forEach((alt, i) => {
    const key = altKeys[i]!;
    for (const p of alt.points) {
      const slot = altByMonth.get(p.monthIdx) ?? {};
      slot[key] = p.cumBtc;
      altByMonth.set(p.monthIdx, slot);
    }
  });
  const data = props.chosen.points.map((p) => ({
    monthIdx: p.monthIdx,
    label: p.label,
    cumBtc: p.cumBtc,
    netWorth: p.netWorth,
    ...(altByMonth.get(p.monthIdx) ?? {}),
  }));

  const tickInterval = Math.max(1, Math.floor(props.chosen.points.length / 6));

  return (
    <div className="rounded-2xl border border-cream-300 bg-white p-7">
      <div className="mb-1 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
        Accumulation curve
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="BTC at deadline" value={`${props.chosen.btcAtDeadline.toFixed(4)} BTC`} accent />
        <Stat label="Target" value={`${props.targetBtc.toFixed(4)} BTC`} />
        <Stat label="Fiat value at deadline" value={formatUSD(props.chosen.netWorthAtDeadline)} />
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
          <CartesianGrid stroke="#ebe3d5" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 13, fill: '#8a8272' }}
            interval={tickInterval}
          />
          <YAxis
            yAxisId="btc"
            orientation="left"
            tickFormatter={(v) => `${Number(v).toFixed(1)} BTC`}
            tick={{ fontSize: 13, fill: '#f7931a' }}
            stroke="#f7931a"
          />
          <YAxis
            yAxisId="usd"
            orientation="right"
            tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}K`}
            tick={{ fontSize: 13, fill: '#c4704b' }}
            stroke="#c4704b"
          />
          <Tooltip
            formatter={(value, name) => {
              const n = Number(value);
              if (name === 'Fiat value') {
                return [`$${Math.round(n).toLocaleString('en-US')}`, name];
              }
              return [`${n.toFixed(4)} BTC`, name];
            }}
            contentStyle={{ background: '#29261e', color: '#faf6f0', borderRadius: 8, border: 'none' }}
          />
          <Legend wrapperStyle={{ fontSize: 14 }} />
          <ReferenceLine
            y={props.targetBtc}
            yAxisId="btc"
            stroke="#a06c4a"
            strokeDasharray="4 4"
            label={{ value: `target ${props.targetBtc.toFixed(2)} BTC`, position: 'insideTopRight', fill: '#a06c4a', fontSize: 13 }}
          />
          {(props.alternatives ?? []).map((alt, i) => (
            <Line
              key={altKeys[i]!}
              yAxisId="btc"
              type="monotone"
              dataKey={altKeys[i]!}
              stroke="#7a5a40"
              strokeWidth={1.5}
              strokeDasharray="2 4"
              dot={false}
              opacity={0.5}
              name={alt.label}
              isAnimationActive={false}
            />
          ))}
          <Line
            yAxisId="btc"
            type="monotone"
            dataKey="cumBtc"
            stroke="#f7931a"
            strokeWidth={3}
            dot={false}
            name={CHOSEN_LINE}
            isAnimationActive={false}
          />
          <Line
            yAxisId="usd"
            type="monotone"
            dataKey="netWorth"
            stroke="#c4704b"
            strokeDasharray="6 4"
            strokeWidth={2}
            dot={false}
            name="Fiat value"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-cream-200 pt-4 sm:grid-cols-2">
        <Stat label="Total deployed" value={formatUSD(props.chosen.totalDollarsDeployed)} small />
        <Stat label="Number of contributions" value={`${props.chosen.audit.timing.contribution_count}`} small />
        <Stat
          label="Arithmetic average model price"
          value={formatUSD(props.chosen.audit.totals.arithmetic_average_planning_price)}
          small
        />
        <Stat
          label="Effective average buy price"
          value={formatUSD(props.chosen.audit.totals.effective_average_buy_price)}
          small
        />
      </div>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        Open audit table to see every buy, price, and BTC amount.
      </p>
      <p className="mt-1 text-sm leading-relaxed text-text-faint">
        Pricing: Catch-Up Power Law · spot today → 1.0× B1M trendline by{' '}
        {formatDate(props.chosen.audit.model.catchup_date)}.{' '}
        {props.onShowModelsTab ? (
          <button
            type="button"
            onClick={props.onShowModelsTab}
            className="font-semibold text-btc-orange-end underline decoration-btc-orange/40 underline-offset-2 hover:decoration-btc-orange-end"
          >
            See Models tab →
          </button>
        ) : (
          <>See Models tab.</>
        )}
      </p>
    </div>
  );
}

function Stat(props: { label: string; value: string; accent?: boolean; small?: boolean }) {
  const valueClass = props.accent
    ? 'text-3xl font-bold tabular-nums text-btc-orange-end'
    : props.small
      ? 'text-2xl font-bold tabular-nums text-text-primary'
      : 'text-3xl font-bold tabular-nums text-text-primary';
  return (
    <div>
      <div className="text-base text-text-muted">{props.label}</div>
      <div className={valueClass}>{props.value}</div>
    </div>
  );
}
