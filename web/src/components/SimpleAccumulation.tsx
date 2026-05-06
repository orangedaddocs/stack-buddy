import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { SimpleInputs } from './SimpleCard.js';
import { formatDate, formatUSD } from '../../../shared/math/format.js';
import { projectAccumulation } from '../lib/simpleProjection.js';

const BTC_LINE = 'BTC stacked';
const FIAT_LINE = 'Fiat value';

export function SimpleAccumulation(props: { inputs: SimpleInputs; onShowModelsTab?: () => void }) {
  // Memoize so projectAccumulation only re-runs when the inputs actually
  // change — not on every parent re-render (typing in any field used to
  // trigger a full recompute + Recharts re-layout, which is what the
  // dev-mode lag was).
  const proj = useMemo(() => projectAccumulation(props.inputs, 60), [props.inputs]);
  const last = proj.points.at(-1);
  if (!last) return null;
  const firstBuy = proj.audit.timing.first_contribution_date;
  const lastBuy = proj.audit.timing.last_contribution_date;

  return (
    <div className="rounded-2xl border border-cream-300 bg-white p-7">
      <div className="mb-1 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
        5-year accumulation
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="text-base text-text-muted">BTC stack at month 60</div>
          <div className="text-3xl font-bold tabular-nums text-btc-orange-end">
            {last.cumBtcPowerLaw.toFixed(2)} BTC
          </div>
        </div>
        <div>
          <div className="text-base text-text-muted">Fiat value at month 60</div>
          <div className="text-3xl font-bold tabular-nums text-text-primary">
            {formatUSD(last.netWorthPowerLaw)}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={proj.points} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
          <CartesianGrid stroke="#ebe3d5" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 13, fill: '#8a8272' }}
            interval={11}
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
            label={{ value: 'fiat', angle: 90, position: 'insideRight', fill: '#c4704b', fontSize: 13 }}
          />
          <Tooltip
            formatter={(value, name) => {
              const n = Number(value);
              if (name === BTC_LINE) return [`${n.toFixed(4)} BTC`, name];
              return [`$${Math.round(n).toLocaleString('en-US')}`, name];
            }}
            contentStyle={{ background: '#29261e', color: '#faf6f0', borderRadius: 8, border: 'none' }}
          />
          <Legend wrapperStyle={{ fontSize: 14 }} />
          <Line
            yAxisId="btc"
            type="monotone"
            dataKey="cumBtcPowerLaw"
            stroke="#f7931a"
            strokeWidth={2.5}
            dot={false}
            name={BTC_LINE}
          />
          <Line
            yAxisId="usd"
            type="monotone"
            dataKey="netWorthPowerLaw"
            stroke="#c4704b"
            strokeDasharray="6 4"
            strokeWidth={2}
            dot={false}
            name={FIAT_LINE}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-cream-200 pt-4 sm:grid-cols-2">
        <div>
          <div className="text-base text-text-muted">Total deployed</div>
          <div className="text-2xl font-bold tabular-nums text-text-primary">{formatUSD(proj.totalsAtEnd.invested)}</div>
        </div>
        <div>
          <div className="text-base text-text-muted">Arithmetic average model price</div>
          <div className="text-2xl font-bold tabular-nums text-text-primary">{formatUSD(proj.totalsAtEnd.averagePricePowerLaw)}</div>
        </div>
        <div>
          <div className="text-base text-text-muted">Effective average buy price</div>
          <div className="text-2xl font-bold tabular-nums text-text-primary">{formatUSD(proj.totalsAtEnd.effectiveAverageBuyPrice)}</div>
        </div>
        <div>
          <div className="text-base text-text-muted">Buy timing</div>
          <div className="text-lg font-semibold tabular-nums text-text-primary">
            {firstBuy && lastBuy
              ? `${proj.audit.timing.contribution_count} buys · ${formatDate(new Date(`${firstBuy}T00:00:00Z`))} to ${formatDate(new Date(`${lastBuy}T00:00:00Z`))}`
              : 'No buys'}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-text-faint">
        Pricing: Catch-Up Power Law · spot today → 1.0× B1M trendline by{' '}
        {formatDate(proj.audit.model.catchup_date)}.{' '}
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
