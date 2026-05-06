import type { CashUsageLabel } from '../../../shared/math/cashFlow.js';
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
  lump_sums:
    'Monthly DCA plus annual rituals: 2× DCA on Jan 1 and Jul 1, $5,000 tax-refund buy on Apr 15.',
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
  strategies: EvaluatedPlanStrategy[] | null;
  selectedKind: PlanStrategyKind | null;
  onSelect: (s: PlanStrategy) => void;
  onViewAudit: () => void;
}) {
  if (!props.strategies) return null;

  return (
    <div id="plan-results" className="scroll-mt-4 rounded-[20px] border border-cream-300 bg-cream-50 p-6">
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
                      {formatUSD(view.projection.totalDollarsDeployed)} deployed
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
                    View monthly buys
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
    const firstRecurring = recurringRows[0] ?? first;
    const taxRefundRows = lumpRows.filter((row) => /^Tax refund \d{4}$/.test(row.label));
    const targetLumpRows = lumpRows.filter((row) => /^Target lump \d+$/.test(row.label));

    if (targetLumpRows.length > 0 || taxRefundRows.length > 0) {
      const lines: string[] = [
        `Monthly DCA of ${formatUSD(amount)} starts on ${formatDate(firstRecurring.date_iso)} and runs through ${formatDate(last.date_iso)} — ${recurringRows.length} buys.`,
      ];
      if (targetLumpRows.length > 0) {
        const example = targetLumpRows[0]!;
        lines.push(
          `Each January 1 and July 1, double up: ${formatUSD(example.amount_usd)} per buy, ${targetLumpRows.length} total across the window.`,
        );
      }
      if (taxRefundRows.length > 0) {
        const example = taxRefundRows[0]!;
        lines.push(
          `Each April 15, layer in a ${formatUSD(example.amount_usd)} tax-refund buy — ${taxRefundRows.length} total.`,
        );
      }
      lines.push(
        `Total deployed is ${formatUSD(totals.total_deployed)}, your effective average buy price is ${effective}, and the plan reaches ${finalBtc} BTC by ${formatDate(deadline)}.`,
      );
      return lines;
    }

    // Fallback for any mixed-path shape that doesn't match the
    // calendar-anchored Custom mix template (e.g. user-edited lumps).
    const secondLine =
      secondLump && secondLump.date_iso !== firstLump.date_iso
        ? `Then make a second dated buy of ${formatUSD(secondLump.amount_usd)} on ${formatDate(secondLump.date_iso)}, buying about ${secondLump.btc_bought.toFixed(4)} BTC.`
        : `Those dated buys handle the larger planned moments.`;
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

