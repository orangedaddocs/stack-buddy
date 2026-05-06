import { useMemo } from 'react';
import { formatDate, formatUSD } from '../../../shared/math/format.js';
import type { SimpleInputs } from './SimpleCard.js';
import { projectAccumulation } from '../lib/simpleProjection.js';

export type SimpleMath = {
  afterTax: number;
  monthlyBudgetUSD: number;
  monthlyBtc: number;
  annualBudgetUSD: number;
  annualBtc: number;
  fiveYearBtc: number;
  taxesPaid: number;
  afterTaxLessExpenses: number;
  available: number;
  cashFlowShortfall: number;
};

export function computeSimple(v: SimpleInputs): SimpleMath {
  const taxesPaid = Math.max(0, v.annualIncome) * (Math.max(0, v.taxRatePct) / 100);
  const afterTax = v.annualIncome - taxesPaid;
  const afterTaxLessExpenses = afterTax - v.annualBurn;
  const rawAvailable = afterTaxLessExpenses - v.annualSavings;
  const available = Math.max(0, rawAvailable);
  const cashFlowShortfall = Math.min(0, rawAvailable);
  const monthlyBudgetUSD = available / 12;
  const monthlyBtc = v.btcPrice > 0 ? monthlyBudgetUSD / v.btcPrice : 0;
  const annualBtc = monthlyBtc * 12;
  return {
    afterTax,
    monthlyBudgetUSD,
    monthlyBtc,
    annualBudgetUSD: available,
    annualBtc,
    fiveYearBtc: annualBtc * 5,
    taxesPaid,
    afterTaxLessExpenses,
    available,
    cashFlowShortfall,
  };
}

export function SimpleResult(props: { inputs: SimpleInputs }) {
  // Memoize the math + projection so they only recompute when inputs change,
  // not on every parent re-render. Big perf win in dev mode where typing
  // into any field used to trigger a Recharts re-layout cascade.
  const r = useMemo(() => computeSimple(props.inputs), [props.inputs]);
  const proj = useMemo(() => projectAccumulation(props.inputs, 60), [props.inputs]);
  const avgPLPrice = proj.totalsAtEnd.averagePricePowerLaw;
  const effectiveAvgPrice = proj.totalsAtEnd.effectiveAverageBuyPrice;
  const firstBuy = proj.audit.timing.first_contribution_date;
  const lastBuy = proj.audit.timing.last_contribution_date;
  // Only flag "underwater" once the user has actually entered income —
  // otherwise the all-zero starting state would show a red warning on load.
  const underwater = props.inputs.annualIncome > 0 && r.cashFlowShortfall < 0;

  return (
    <div className="sticky top-6 space-y-4">
      {/* Headline NET card */}
      <div className="rounded-2xl border-[1.5px] border-btc-orange bg-gradient-to-br from-[#fef7f2] to-[#fdf0e8] p-7">
        <div className="mb-2 text-base font-bold uppercase tracking-[0.08em] text-btc-orange-end">
          Net available for BTC
        </div>
        <div className="mb-1 text-4xl font-bold leading-tight tabular-nums text-text-primary">
          {formatUSD(r.available)}
          <span className="ml-2 text-base font-normal text-text-muted">/ year</span>
        </div>
        <div className="mb-3 text-2xl font-semibold leading-tight tabular-nums text-text-primary">
          {formatUSD(r.monthlyBudgetUSD)}
          <span className="ml-2 text-base font-normal text-text-muted">/ month</span>
        </div>
        <div className="text-base font-semibold tabular-nums text-btc-orange-end">
          → {formatBtc(r.monthlyBtc)} BTC / month
          <span className="ml-1 text-base font-normal text-text-muted">
            at today&rsquo;s ${props.inputs.btcPrice.toLocaleString('en-US')}
          </span>
        </div>
        {r.cashFlowShortfall < 0 && (
          <div className="mt-2 text-base font-semibold tabular-nums text-error">
            Cash-flow shortfall: {formatUSD(r.cashFlowShortfall)}
          </div>
        )}
        {underwater ? (
          <div className="mt-3 text-base leading-relaxed text-error">
            Expenses + savings exceed after-tax income. BTC budget is floored at $0, but the shortfall remains visible.
          </div>
        ) : (
          <div className="mt-3 text-base leading-relaxed text-text-secondary">
            As BTC climbs, the same {formatUSD(r.monthlyBudgetUSD)}/month buys fewer sats.
          </div>
        )}
      </div>

      {/* Cascade — how we got there */}
      <div className="rounded-2xl border border-cream-300 bg-white p-7">
        <div className="mb-3 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
          How we got there
        </div>
        <CascadeRow label="Income (pre-tax)" value={formatUSD(props.inputs.annualIncome)} />
        <CascadeRow
          label={`Taxes (${props.inputs.taxRatePct}%)`}
          value={`− ${formatUSD(r.taxesPaid)}`}
          dim
        />
        <CascadeRow label="After-tax income" value={formatUSD(r.afterTax)} subtotal />
        <CascadeRow
          label="Annual expenses"
          value={`− ${formatUSD(props.inputs.annualBurn)}`}
          dim
        />
        <CascadeRow
          label="Cash savings"
          value={`− ${formatUSD(props.inputs.annualSavings)}`}
          dim
        />
        {r.cashFlowShortfall < 0 && (
          <CascadeRow label="Cash-flow shortfall" value={formatUSD(r.cashFlowShortfall)} accent="error" />
        )}
        <CascadeRow label="Net available for BTC" value={formatUSD(r.available)} accent="btc" final />
      </div>

      {/* 5-year accumulation summary */}
      <div className="rounded-2xl border border-cream-300 bg-white p-7">
        <div className="mb-3 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
          Stacked over 5 years
        </div>
        <div className="text-3xl font-bold leading-tight tabular-nums text-btc-orange-end">
          {formatBtc(proj.totalsAtEnd.btcPowerLaw)} BTC
        </div>
        <div className="mt-1 text-base leading-relaxed text-text-muted">
          {firstBuy && lastBuy
            ? `${proj.audit.timing.contribution_count} monthly buys from ${formatDate(new Date(`${firstBuy}T00:00:00Z`))} to ${formatDate(new Date(`${lastBuy}T00:00:00Z`))}.`
            : !Number.isFinite(props.inputs.btcPrice) || props.inputs.btcPrice <= 0
              ? 'Enter a BTC price to see the 5-year accumulation.'
              : r.available <= 0
                ? 'No monthly buys: cash flow leaves nothing for BTC after taxes, expenses, and savings.'
                : 'No monthly buys.'}
        </div>
        <div className="mt-4 space-y-1 border-t border-cream-200 pt-4 text-base leading-relaxed text-text-secondary">
          <div>
            Total deployed: <span className="font-semibold text-text-primary">{formatUSD(proj.totalsAtEnd.invested)}</span>
          </div>
          <div>
            Arithmetic average model price: <span className="font-semibold text-text-primary">{formatUSD(avgPLPrice)}</span>
          </div>
          <div>
            Your effective average buy price: <span className="font-semibold text-text-primary">{formatUSD(effectiveAvgPrice)}</span>
          </div>
          <div>Open audit table in the Plan tab to see every buy, price, and BTC amount.</div>
        </div>
      </div>
    </div>
  );
}

function formatBtc(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(4);
}

function CascadeRow(props: {
  label: string;
  value: string;
  dim?: boolean;
  subtotal?: boolean;
  final?: boolean;
  accent?: 'btc' | 'error';
}) {
  const labelClass = props.dim ? 'text-text-muted' : 'text-text-primary';
  const valueClass = props.accent === 'btc'
    ? 'text-btc-orange-end font-bold'
    : props.accent === 'error'
      ? 'text-error font-semibold'
    : props.final
      ? 'text-text-primary font-bold'
      : props.subtotal
        ? 'text-text-primary font-semibold'
        : props.dim
          ? 'text-text-muted'
          : 'text-text-primary';
  const containerClass = props.subtotal || props.final
    ? 'flex items-baseline justify-between border-t border-cream-200 py-2.5 mt-1'
    : 'flex items-baseline justify-between py-1';
  return (
    <div className={containerClass}>
      <span className={`text-base ${labelClass}`}>{props.label}</span>
      <span className={`tabular-nums ${valueClass} ${props.final ? 'text-xl' : 'text-base'}`}>{props.value}</span>
    </div>
  );
}
