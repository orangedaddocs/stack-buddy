import type { PlanGoal, PlanStrategyKind } from '../../../shared/types.js';
import type { EvaluatedPlanStrategy } from '../components/PlanAIAdvisor.js';
import { formatDate, formatUSD } from '../../../shared/math/format.js';
import type { PlanConstraints } from './planConstraints.js';

export type StackBuddyAnswer = {
  title: string;
  /** Headline shown as the panel <h3>. Gated on feasibility/constraint state. */
  headline: string;
  summary: string;
  bullets: string[];
  recommendedKind: string;
  /**
   * Tone of the answer. The panel uses this to color the headline
   * appropriately (green/yellow/red instead of always neutral).
   */
  tone: 'fits' | 'needs_tradeoff' | 'unfunded';
};

/**
 * Build the Stack Buddy AI summary card content for a chosen strategy.
 *
 * The headline and summary are gated on the strategy's actual feasibility:
 *  - unfunded plans say "this doesn't fit" with the gap quantified
 *  - constraint-violating plans say "this needs a tradeoff"
 *  - only fully-fitting plans say "this fits"
 *
 * Without this gating, the AI panel can headline "fits best" while a red
 * banner directly below says "Funding gap — 451% of your budget", which
 * makes the page self-contradicting.
 */
export function buildStackBuddyAnswer(args: {
  view: EvaluatedPlanStrategy;
  goal: PlanGoal;
  constraints: PlanConstraints;
  loading: boolean;
}): StackBuddyAnswer {
  const rows = args.view.projection.audit.auditRows;
  const first = rows[0] ?? null;
  const last = rows.at(-1) ?? null;
  const recurringRows = rows.filter((row) => /recurring/i.test(row.label));
  const topUps = rows.filter((row) => /target top-up after capped/i.test(row.label));
  const maxRecurring = maxRecurringBuyAmount(args.view);
  const cap =
    args.view.strategy.kind === 'front_load'
      ? args.constraints.maxUpfrontMonthly ?? args.constraints.maxMonthlyContribution
      : args.constraints.maxMonthlyContribution;
  const kind = strategyKindDisplay(args.view.strategy.kind);

  const tone = pickTone(args.view);
  const headline = pickHeadline(tone, kind);
  const summary = pickSummary({
    tone,
    kind,
    cap,
    topUps: topUps.length,
    maxRecurring,
    targetBtc: args.goal.target_btc,
    btcAtDeadline: args.view.projection.btcAtDeadline,
    totalDeployed: args.view.projection.totalDollarsDeployed,
    cashUsageRate: args.view.cashUsageRate,
  });

  const bullets: string[] = [];
  if (first) {
    bullets.push(
      `Start on ${formatDate(first.date_iso)} with ${formatUSD(first.amount_usd)}, buying about ${first.btc_bought.toFixed(4)} BTC at ${formatUSD(first.btc_price_used)}.`,
    );
  }
  if (recurringRows.length > 0) {
    bullets.push(
      `Use ${recurringRows.length} recurring buys; the largest recurring buy is ${formatUSD(maxRecurring)}.`,
    );
  }
  if (topUps.length > 0) {
    const topUp = topUps.at(-1)!;
    bullets.push(
      `Plan for a ${formatUSD(topUp.amount_usd)} top-up on ${formatDate(topUp.date_iso)}. If that's not realistic, the actual tradeoff is lowering the BTC target or moving the deadline.`,
    );
  }
  if (last) {
    bullets.push(
      `Final result: ${args.view.projection.btcAtDeadline.toFixed(4)} BTC by ${formatDate(args.goal.deadline)}, with ${formatUSD(args.view.projection.totalDollarsDeployed)} deployed and an effective average buy price of ${formatUSD(args.view.projection.audit.totals.effective_average_buy_price)}.`,
    );
  }

  return {
    title: args.loading ? 'Asking Stack Buddy AI...' : 'Stack Buddy AI',
    headline,
    summary,
    bullets,
    recommendedKind: kind,
    tone,
  };
}

function pickTone(view: EvaluatedPlanStrategy): StackBuddyAnswer['tone'] {
  if (view.cashUsageLabel === 'unfunded') return 'unfunded';
  if (view.constraintStatus?.label === 'violates') return 'unfunded';
  if (view.constraintStatus?.label === 'needs_tradeoff') return 'needs_tradeoff';
  return 'fits';
}

function pickHeadline(tone: StackBuddyAnswer['tone'], kind: string): string {
  switch (tone) {
    case 'unfunded':
      return `This doesn't fit your cash flow under ${kind}`;
    case 'needs_tradeoff':
      return `${kind} fits, but only with a tradeoff`;
    case 'fits':
      return `${kind} fits what you wrote`;
  }
}

function pickSummary(args: {
  tone: StackBuddyAnswer['tone'];
  kind: string;
  cap: number | undefined;
  topUps: number;
  maxRecurring: number;
  targetBtc: number;
  btcAtDeadline: number;
  totalDeployed: number;
  cashUsageRate: number;
}): string {
  const constraintLine = args.cap
    ? `Hard cap on recurring buys is ${formatConstraintDollars(args.cap)}/month, per your note.`
    : `Pricing every buy under the Catch-Up Power Law, then checking against your cash flow.`;

  if (args.tone === 'unfunded') {
    const pct = Number.isFinite(args.cashUsageRate)
      ? `${Math.round(args.cashUsageRate * 100)}%`
      : '—';
    return `${constraintLine} The ${args.kind} path needs ${formatUSD(args.totalDeployed)} to reach ${args.targetBtc.toFixed(4)} BTC, which is ${pct} of your available cash flow. Either lower the target, move the deadline, or change the cash-flow inputs.`;
  }

  if (args.tone === 'needs_tradeoff') {
    return `${constraintLine} Recurring buys stay at or below ${formatConstraintDollars(args.cap ?? args.maxRecurring)}/month, but reaching ${args.targetBtc.toFixed(4)} BTC still requires a later top-up. The real lever if that's not realistic is the target or the deadline.`;
  }

  // fits
  if (args.topUps > 0) {
    return `${constraintLine} Recurring buys top out around ${formatUSD(args.maxRecurring)} and the path reaches ${args.btcAtDeadline.toFixed(4)} BTC by deadline.`;
  }
  return `${constraintLine} Recurring buys top out around ${formatUSD(args.maxRecurring)}; the path reaches the BTC target without a separate top-up.`;
}

function strategyKindDisplay(kind: PlanStrategyKind): string {
  switch (kind) {
    case 'front_load':
      return 'Front-load';
    case 'monthly':
      return 'Monthly DCA';
    case 'lump_sums':
      return 'Custom mix';
  }
}

function maxRecurringBuyAmount(view: EvaluatedPlanStrategy): number {
  return view.projection.audit.auditRows
    .filter((row) => /recurring/i.test(row.label))
    .reduce((max, row) => Math.max(max, row.amount_usd), 0);
}

function formatConstraintDollars(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}
