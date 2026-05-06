import type { CashUsageLabel } from '../../../shared/math/cashFlow.js';
import { cashUsageLabelText } from '../../../shared/math/cashFlow.js';
import { formatDate, formatUSD } from '../../../shared/math/format.js';
import type { PlanStrategy, PlanStrategyKind } from '../../../shared/types.js';
import type { PlanProjectionResult } from '../lib/planProjection.js';

const KIND_LABEL: Record<PlanStrategyKind, string> = {
  front_load: 'Front-load',
  monthly: 'Monthly DCA',
  lump_sums: 'Custom mix',
};

const KIND_DESCRIPTION: Record<PlanStrategyKind, string> = {
  front_load: 'Heavier early at the lower modeled price, tapering as the catch-up path lifts.',
  monthly: 'Flat $/month, every month, until the deadline.',
  lump_sums: 'Dated buys plus DCA when that better fits your notes.',
};

export type EvaluatedPlanStrategy = {
  strategy: PlanStrategy;
  projection: PlanProjectionResult;
  cashUsageRate: number;
  cashUsageLabel: CashUsageLabel;
  constraintStatus?: PlanConstraintStatus;
  stale: boolean;
};

export type PlanConstraintStatus = {
  label: 'fits' | 'needs_tradeoff' | 'violates';
  message: string;
};

export function PlanAIAdvisor(props: {
  loading: boolean;
  error: string | null;
  strategies: EvaluatedPlanStrategy[] | null;
  selectedKind: PlanStrategyKind | null;
  onSelect: (s: PlanStrategy) => void;
  onViewAudit: () => void;
}) {
  if (!props.loading && !props.error && !props.strategies) return null;

  return (
    <div className="rounded-[20px] border border-cream-300 bg-cream-50 p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-base font-bold uppercase tracking-[0.06em] text-text-muted">
          Three approaches
        </div>
        {props.loading && <div className="text-base text-text-muted">Asking Stack Buddy...</div>}
      </div>

      {props.error && (
        <div className="rounded-xl border border-error/40 bg-[#fbe9e6] px-4 py-3 text-base text-error">
          {props.error}
        </div>
      )}

      {props.loading && !props.strategies && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-cream-300 bg-white" />
          ))}
        </div>
      )}

      {props.strategies && (
        <div className="space-y-3">
          <p className="text-base leading-relaxed text-text-secondary">
            Each approach is priced by the deterministic calculator under the Catch-Up Power Law and checked against your cash flow. Pick one to drop into the chart and audit table.
          </p>
          {props.strategies.map((view) => {
            const s = view.strategy;
            const selected = props.selectedKind === s.kind;
            const select = () => props.onSelect(s);
            return (
              <div
                key={s.kind}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={select}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select();
                  }
                }}
                className={
                  selected
                    ? 'block w-full cursor-pointer rounded-2xl border-[1.5px] border-btc-orange bg-white p-5 text-left shadow-[0_4px_16px_rgba(247,147,26,0.18)] transition-colors duration-150 hover:bg-[#fffaf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-btc-orange/35'
                    : 'block w-full cursor-pointer rounded-2xl border border-cream-300 bg-white p-5 text-left transition-colors duration-150 hover:border-btc-orange hover:bg-[#fffaf5] hover:shadow-[0_6px_20px_rgba(247,147,26,0.12)] focus-visible:border-btc-orange focus-visible:bg-[#fffaf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-btc-orange/35'
                }
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-text-primary">{KIND_LABEL[s.kind]}</h3>
                      <FeasibilityBadge label={view.cashUsageLabel} />
                      {view.constraintStatus && <ConstraintBadge status={view.constraintStatus} />}
                      <span className="rounded-full bg-cream-100 px-2.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-text-muted">
                        Priced by deterministic engine
                      </span>
                      {view.stale && (
                        <span className="rounded-full bg-[#fbe9e6] px-2.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-error">
                          Needs recalculation
                        </span>
                      )}
                    </div>
                    <p className="text-base text-text-muted">{KIND_DESCRIPTION[s.kind]}</p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <div className="text-2xl font-bold tabular-nums text-btc-orange-end">
                      {view.projection.btcAtDeadline.toFixed(4)} BTC
                    </div>
                    <div className="text-base text-text-muted">
                      Calculator result · {formatUSD(view.projection.totalDollarsDeployed)} deployed
                    </div>
                    <div className="text-base text-text-muted">
                      Cash usage {pct(view.cashUsageRate)}
                    </div>
                  </div>
                </div>

                <StrategyNarrative view={view} />

                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onSelect(s);
                      props.onViewAudit();
                    }}
                    className="inline-flex items-center gap-1 text-base font-medium text-text-muted hover:text-btc-orange-end"
                  >
                    View audit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onSelect(s);
                    }}
                    className={
                      selected
                        ? 'inline-flex items-center gap-1 text-base font-semibold text-btc-orange-end'
                        : 'inline-flex items-center gap-1 text-base font-medium text-text-muted hover:text-btc-orange-end'
                    }
                  >
                    {selected ? '✓ Using this strategy' : 'Use this strategy →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StrategyNarrative(props: { view: EvaluatedPlanStrategy }) {
  const lines = buildStrategyNarrative(props.view);
  return (
    <div className="mb-3 space-y-2 text-base leading-relaxed text-text-secondary">
      {lines.map((line, idx) => (
        <p key={`${idx}-${line}`}>{line}</p>
      ))}
    </div>
  );
}

function buildStrategyNarrative(view: EvaluatedPlanStrategy): string[] {
  const rows = view.projection.audit.auditRows;
  if (rows.length === 0) {
    return ['No buys are scheduled yet. Add a recurring contribution or lump sum to see the plan path.'];
  }

  const first = rows[0]!;
  const second = rows[1] ?? null;
  const last = rows.at(-1)!;
  const deadline = view.projection.points.at(-1)?.date ?? last.date_iso;
  const totals = view.projection.audit.totals;
  const effective = formatUSD(totals.effective_average_buy_price);
  const finalBtc = view.projection.btcAtDeadline.toFixed(4);
  const recurringRows = rows.filter((row) => /recurring|monthly|front-loaded/i.test(row.label));
  const lumpRows = rows.filter((row) => !recurringRows.includes(row));

  if (view.strategy.kind === 'monthly') {
    const amount = view.strategy.recurring.amount_per_month;
    const lumpLine =
      lumpRows.length > 0
        ? `It also includes ${lumpRows.length} dated buy${lumpRows.length === 1 ? '' : 's'}, starting with ${formatUSD(lumpRows[0]!.amount_usd)} on ${formatDate(lumpRows[0]!.date_iso)}.`
        : `No dated buys are required in this path.`;
    return [
      `Start with a ${formatUSD(first.amount_usd)} buy on ${formatDate(first.date_iso)}, which buys about ${first.btc_bought.toFixed(4)} BTC at ${formatUSD(first.btc_price_used)}.`,
      `Then DCA ${formatUSD(amount)} per month for ${recurringRows.length} monthly buys, ending on ${formatDate(last.date_iso)}.`,
      lumpLine,
      `Total deployed is ${formatUSD(totals.total_deployed)}, your effective average buy price is ${effective}, and the plan reaches ${finalBtc} BTC by ${formatDate(deadline)}.`,
    ];
  }

  if (view.strategy.kind === 'front_load') {
    const firstYear = recurringRows.slice(0, 12).reduce((acc, row) => acc + row.amount_usd, 0);
    const lastRecurring = recurringRows.at(-1) ?? last;
    const secondLine = second
      ? `The next scheduled buy is ${formatUSD(second.amount_usd)} on ${formatDate(second.date_iso)}, buying about ${second.btc_bought.toFixed(4)} BTC.`
      : `That first buy is the only scheduled buy in this plan.`;
    const lumpLine =
      lumpRows.length > 0
        ? `It also uses ${lumpRows.length} dated buy${lumpRows.length === 1 ? '' : 's'}, starting with ${formatUSD(lumpRows[0]!.amount_usd)} on ${formatDate(lumpRows[0]!.date_iso)}.`
        : `No separate dated buys are required in this path.`;
    return [
      `Start with ${formatUSD(first.amount_usd)} on ${formatDate(first.date_iso)}, buying about ${first.btc_bought.toFixed(4)} BTC at ${formatUSD(first.btc_price_used)}.`,
      secondLine,
      `The front-loaded path deploys about ${formatUSD(firstYear)} in the first 12 buys, then tapers toward ${formatUSD(lastRecurring.amount_usd)} by ${formatDate(lastRecurring.date_iso)}.`,
      lumpLine,
      `Total deployed is ${formatUSD(totals.total_deployed)}, your effective average buy price is ${effective}, and the plan reaches ${finalBtc} BTC by ${formatDate(deadline)}.`,
    ];
  }

  const firstLump = lumpRows[0] ?? first;
  const secondLump = lumpRows[1] ?? second;
  const finalLump = lumpRows.at(-1) ?? last;
  const datedBuys = lumpRows.length || rows.length;
  if (lumpRows.length > 0 && recurringRows.length > 0) {
    const amount = view.strategy.recurring.amount_per_month;
    const secondLine =
      secondLump && secondLump.date_iso !== firstLump.date_iso
        ? `Then make a second dated buy of ${formatUSD(secondLump.amount_usd)} on ${formatDate(secondLump.date_iso)}, buying about ${secondLump.btc_bought.toFixed(4)} BTC.`
        : `Those dated buys handle the larger planned moments from your notes.`;
    return [
      `Use a mixed path: ${lumpRows.length} dated buy${lumpRows.length === 1 ? '' : 's'} plus ${recurringRows.length} DCA buy${recurringRows.length === 1 ? '' : 's'}.`,
      `The first dated buy is ${formatUSD(firstLump.amount_usd)} on ${formatDate(firstLump.date_iso)}, buying about ${firstLump.btc_bought.toFixed(4)} BTC at ${formatUSD(firstLump.btc_price_used)}.`,
      secondLine,
      `Alongside that, DCA about ${formatUSD(amount)} per month, with the final scheduled buy on ${formatDate(last.date_iso)}.`,
      `Total deployed is ${formatUSD(totals.total_deployed)}, your effective average buy price is ${effective}, and the plan reaches ${finalBtc} BTC by ${formatDate(deadline)}.`,
    ];
  }

  if (recurringRows.length > 0) {
    const amount = view.strategy.recurring.amount_per_month;
    return [
      `Use a recurring custom path with ${recurringRows.length} scheduled buys.`,
      `Start with ${formatUSD(first.amount_usd)} on ${formatDate(first.date_iso)}, buying about ${first.btc_bought.toFixed(4)} BTC at ${formatUSD(first.btc_price_used)}.`,
      `Then DCA about ${formatUSD(amount)} per month through ${formatDate(last.date_iso)}.`,
      `Total deployed is ${formatUSD(totals.total_deployed)}, your effective average buy price is ${effective}, and the plan reaches ${finalBtc} BTC by ${formatDate(deadline)}.`,
    ];
  }

  const middle =
    secondLump && secondLump.date_iso !== firstLump.date_iso
      ? `Then make a second dated buy of ${formatUSD(secondLump.amount_usd)} on ${formatDate(secondLump.date_iso)}, buying about ${secondLump.btc_bought.toFixed(4)} BTC.`
      : `This plan uses dated buys instead of recurring monthly buys.`;
  return [
    `Make ${datedBuys} dated buys. The first is ${formatUSD(firstLump.amount_usd)} on ${formatDate(firstLump.date_iso)}, buying about ${firstLump.btc_bought.toFixed(4)} BTC at ${formatUSD(firstLump.btc_price_used)}.`,
    middle,
    `The final top-up is ${formatUSD(finalLump.amount_usd)} on ${formatDate(finalLump.date_iso)}.`,
    `Total deployed is ${formatUSD(totals.total_deployed)}, your effective average buy price is ${effective}, and the plan reaches ${finalBtc} BTC by ${formatDate(deadline)}.`,
  ];
}

function FeasibilityBadge(props: { label: CashUsageLabel }) {
  const text = props.label === 'unfunded' ? 'Funding gap' : cashUsageLabelText(props.label);
  const styles =
    props.label === 'comfortable'
      ? 'bg-[#e8efe8] text-[#3a6b3a]'
      : props.label === 'manageable'
        ? 'bg-[#fff6dc] text-[#7a6633]'
      : props.label === 'tight'
        ? 'bg-[#fdf0e8] text-[#a06c4a]'
        : props.label === 'very_tight'
          ? 'bg-[#fff0df] text-[#9a4f1d]'
        : 'bg-[#fbe9e6] text-error';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold uppercase tracking-wide ${styles}`}>
      {text}
    </span>
  );
}

function ConstraintBadge(props: { status: PlanConstraintStatus }) {
  const styles =
    props.status.label === 'fits'
      ? 'bg-[#e8efe8] text-[#3a6b3a]'
      : props.status.label === 'needs_tradeoff'
        ? 'bg-[#fff6dc] text-[#7a6633]'
        : 'bg-[#fbe9e6] text-error';
  const text =
    props.status.label === 'fits'
      ? 'Fits your limits'
      : props.status.label === 'needs_tradeoff'
        ? 'Needs tradeoff'
        : 'Violates limit';
  return (
    <span
      title={props.status.message}
      className={`rounded-full px-2.5 py-0.5 text-sm font-semibold uppercase tracking-wide ${styles}`}
    >
      {text}
    </span>
  );
}

function pct(r: number): string {
  if (!Number.isFinite(r)) return '—';
  return `${Math.round(r * 100)}%`;
}
