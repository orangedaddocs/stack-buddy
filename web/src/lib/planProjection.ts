import type { BtcModelConfig, LumpSum, PlanState, PlanRecurring } from '../../../shared/types.js';
import { buildPlanningModelSettings, getPlanningBtcPriceDetails } from '../../../shared/math/catchUp.js';
import { frontLoadAllocation } from '../../../shared/math/optimizer.js';
import {
  addMonthsUTC,
  evaluateContributionSchedule,
  isoDateUTC,
  monthYearLabelUTC,
  parseISODateUTC,
  reconcilePlanResult,
  type AuditContributionType,
  type DeterministicContributionEvent,
  type DeterministicPlanResult,
  type PlanReconciliation,
} from '../../../shared/math/planningAudit.js';

export type PlanProjectionPoint = {
  monthIdx: number;
  label: string;
  date: string;
  /** Cumulative BTC accumulated using Power Law catch-up prices each month. */
  cumBtc: number;
  /** Cumulative dollars deployed (recurring + lump sums) through this month. */
  cumInvested: number;
  /** Net worth at end-of-month (cumBtc × this-month's price). */
  netWorth: number;
  /** This month's catch-up Power Law BTC price. */
  price: number;
  /** True when this point is the deadline valuation, not a buy. */
  isDeadline?: boolean;
};

export type ExcludedLumpSum = {
  lumpSum: LumpSum;
  reason: 'before_today' | 'after_deadline';
};

export type PlanProjectionResult = {
  points: PlanProjectionPoint[];
  monthsToDeadline: number;
  /** Total dollars deployed across the plan window. */
  totalDollarsDeployed: number;
  /** BTC accumulated by the deadline. */
  btcAtDeadline: number;
  /** Net worth at deadline. */
  netWorthAtDeadline: number;
  /**
   * Lump sums the user listed but the engine had to drop (dated before today
   * or after the deadline). Surfaced so the UI can warn instead of silently
   * dropping them.
   */
  excludedLumpSums: ExcludedLumpSum[];
  audit: DeterministicPlanResult;
  reconciliation: PlanReconciliation;
};

export type PlanProjectionInputs = {
  startingBtc: number;
  currentBtcPrice: number;
  /** Optional override of the start date. Defaults to today. */
  startDate?: Date;
  modelSettings?: BtcModelConfig;
  contributionOrigin?: 'manual' | 'ai_strategy';
};

/**
 * Project a plan's accumulation curve from the start date to the deadline.
 * Recurring contributions vary month-by-month for front-load shapes; flat
 * for monthly shapes; zero for none. Lump sums add to the month they fall in.
 *
 * Prices follow the catch-up Power Law from the supplied current BTC price
 * to 1.0× B1M by mid-2028, then track B1M.
 */
export function projectPlan(
  plan: PlanState,
  inputs: PlanProjectionInputs,
): PlanProjectionResult {
  const start = inputs.startDate ?? new Date();
  const startDate = isoDateUTC(start);
  const deadline = parseISODateUTC(plan.goal.deadline);

  // Bad inputs we have to defend against:
  //  - Unparseable deadlines ("", "2026-13-50") would propagate NaN through
  //    the array allocations.
  //  - Missing/zero current BTC price would NaN-pollute every priced row.
  //  - A deadline at or before today would force the audit to price the
  //    final point earlier than the model's spot anchor, which returns NaN
  //    and trips a false reconciliation error in the UI. The user typed an
  //    impossible plan; degrade to an empty projection instead of red text.
  const startBoundaryMs = parseISODateUTC(isoDateUTC(start)).getTime();
  if (
    Number.isNaN(deadline.getTime()) ||
    !Number.isFinite(inputs.currentBtcPrice) ||
    inputs.currentBtcPrice <= 0 ||
    deadline.getTime() <= startBoundaryMs
  ) {
    return emptyProjection(inputs.startingBtc, inputs.currentBtcPrice);
  }

  const cfg =
    inputs.modelSettings ??
    buildPlanningModelSettings({
      spotAnchorDate: startDate,
      spotAnchorPrice: inputs.currentBtcPrice,
    });
  const { events, excludedLumpSums } = buildPlanContributionEvents(
    plan,
    start,
    inputs.contributionOrigin ?? 'manual',
  );
  const audit = evaluateContributionSchedule({
    events,
    startingBtc: inputs.startingBtc,
    deadline: plan.goal.deadline,
    modelSettings: cfg,
    planStartDate: startDate,
    contributionFrequency: 'monthly',
    contributionTimingRule: 'monthly_anniversary',
  });
  const points = buildPointsFromAudit(audit, start, deadline, cfg);
  const reconciliation = reconcilePlanResult(audit, {
    btcAtDeadline: audit.totals.btc_at_deadline,
    totalDeployed: audit.totals.total_deployed,
    fiatValueAtDeadline: audit.totals.fiat_value_at_deadline,
    contributionCount: audit.timing.contribution_count,
    modelId: audit.model.model_id,
  });

  return {
    points,
    monthsToDeadline: audit.timing.contribution_count,
    totalDollarsDeployed: audit.totals.total_deployed,
    btcAtDeadline: audit.totals.btc_at_deadline,
    netWorthAtDeadline: audit.totals.fiat_value_at_deadline,
    excludedLumpSums,
    audit,
    reconciliation,
  };
}

function emptyProjection(startingBtc: number, currentBtcPrice: number): PlanProjectionResult {
  const cfg = buildPlanningModelSettings({ spotAnchorPrice: currentBtcPrice });
  const audit = evaluateContributionSchedule({
    events: [],
    startingBtc,
    deadline: cfg.current_date,
    modelSettings: cfg,
    planStartDate: cfg.current_date,
    contributionFrequency: 'monthly',
    contributionTimingRule: 'monthly_anniversary',
  });
  return {
    points: [],
    monthsToDeadline: 0,
    totalDollarsDeployed: 0,
    btcAtDeadline: startingBtc,
    netWorthAtDeadline: startingBtc * (Number.isFinite(currentBtcPrice) ? currentBtcPrice : 0),
    excludedLumpSums: [],
    audit,
    reconciliation: reconcilePlanResult(audit),
  };
}

export function buildPlanContributionEvents(
  plan: PlanState,
  start: Date,
  origin: 'manual' | 'ai_strategy' = 'manual',
): { events: DeterministicContributionEvent[]; excludedLumpSums: ExcludedLumpSum[] } {
  const deadline = parseISODateUTC(plan.goal.deadline);
  // Compare lump-sum dates against today's UTC midnight, not the live "now"
  // timestamp. Without this normalization, a lump dated for today is parsed
  // as 00:00Z and treated as "before now" any time after midnight UTC, which
  // silently drops it from the audit.
  const startBoundary = parseISODateUTC(isoDateUTC(start));
  const events: DeterministicContributionEvent[] = [];
  const excludedLumpSums: ExcludedLumpSum[] = [];
  const contributionType: AuditContributionType = origin === 'ai_strategy' ? 'ai_strategy' : 'recurring';

  const recurringDates: string[] = [];
  let cursor = addMonthsUTC(start, 1);
  while (cursor.getTime() <= deadline.getTime()) {
    recurringDates.push(isoDateUTC(cursor));
    cursor = addMonthsUTC(cursor, 1);
  }

  const monthlyContributions = buildMonthlySeries(plan.recurring, recurringDates.length);
  recurringDates.forEach((date, i) => {
    const amount = monthlyContributions[i] ?? 0;
    if (amount <= 0) return;
    events.push({
      date,
      amount_usd: amount,
      contribution_type: contributionType,
      label:
        plan.recurring.shape === 'front_load'
          ? 'Front-loaded recurring buy'
          : 'Monthly recurring buy',
      notes:
        origin === 'ai_strategy'
          ? 'Stack Buddy recurring schedule, priced by deterministic engine.'
          : 'Manual recurring schedule.',
    });
  });

  for (const ls of plan.lump_sums) {
    const lumpDate = parseISODateUTC(ls.date);
    if (lumpDate.getTime() < startBoundary.getTime()) {
      excludedLumpSums.push({ lumpSum: ls, reason: 'before_today' });
      continue;
    }
    if (lumpDate.getTime() > deadline.getTime()) {
      excludedLumpSums.push({ lumpSum: ls, reason: 'after_deadline' });
      continue;
    }
    events.push({
      date: ls.date,
      amount_usd: ls.amount,
      contribution_type: origin === 'ai_strategy' ? 'ai_strategy' : 'lump',
      label: ls.label || 'Lump sum',
      notes:
        origin === 'ai_strategy'
          ? 'Stack Buddy lump sum, priced by deterministic engine.'
          : 'Manual lump sum.',
    });
  }

  return { events, excludedLumpSums };
}

function buildMonthlySeries(rec: PlanRecurring, months: number): number[] {
  if (months <= 0) return [];
  if (rec.shape === 'none' || rec.amount_per_month <= 0) {
    return new Array(months).fill(0);
  }
  if (rec.shape === 'monthly') {
    return new Array(months).fill(rec.amount_per_month);
  }
  // front_load
  const totalDollars = rec.amount_per_month * months;
  const yearCount = Math.max(1, Math.ceil(months / 12));
  const weights = rec.front_load_weights && rec.front_load_weights.length > 0
    ? rec.front_load_weights
    : defaultFrontLoadWeights(yearCount);
  return frontLoadAllocation(totalDollars, months, weights);
}

function defaultFrontLoadWeights(yearCount: number): number[] {
  // Monotonically decreasing default — heavier early, lighter late.
  // For 5 years: [0.35, 0.25, 0.20, 0.125, 0.075]. Generalize for any N.
  if (yearCount === 1) return [1];
  const raw: number[] = [];
  for (let i = 0; i < yearCount; i++) {
    raw.push(yearCount - i); // [N, N-1, ..., 1]
  }
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

/**
 * Emit one chart point per calendar month between `start` and `deadline`,
 * carrying cumulative state forward through months with no buy. The earlier
 * implementation used the audit-row index as the chart x-coordinate, which
 * compressed sparse lump-sum plans (a buy in month 1 and a buy in month 36
 * rendered side by side). Calendar-aligned indexing makes time spacing on
 * the chart honest, and means the chosen plan and any alternative series
 * merge by real date rather than by audit-row position.
 */
function buildPointsFromAudit(
  audit: DeterministicPlanResult,
  start: Date,
  deadline: Date,
  modelSettings: BtcModelConfig,
): PlanProjectionPoint[] {
  const points: PlanProjectionPoint[] = [];
  const startPrice = getPlanningBtcPriceDetails(start, modelSettings);
  const startBoundary = parseISODateUTC(isoDateUTC(start)).getTime();

  // Consume any audit rows that landed on the start day (a lump sum dated
  // for "today" is a valid event after the same-day fix). Without this, the
  // initial chart point would show cumBtc = starting_btc even when a buy
  // already happened, and the curve would step up one month late — chart
  // quietly disagreeing with the audit table sitting next to it.
  let auditIdx = 0;
  let cumBtc = audit.totals.starting_btc;
  let cumInvested = 0;
  while (auditIdx < audit.auditRows.length) {
    const row = audit.auditRows[auditIdx]!;
    if (parseISODateUTC(row.date_iso).getTime() > startBoundary) break;
    cumBtc = row.cumulative_btc;
    cumInvested = row.cumulative_deployed;
    auditIdx++;
  }

  points.push({
    monthIdx: 0,
    label: monthYearLabelUTC(start),
    date: isoDateUTC(start),
    cumBtc,
    cumInvested,
    netWorth: cumBtc * startPrice.btc_price_used,
    price: startPrice.btc_price_used,
  });

  let monthIdx = 1;
  let monthDate = addMonthsUTC(start, monthIdx);

  while (monthDate.getTime() < deadline.getTime()) {
    while (auditIdx < audit.auditRows.length) {
      const row = audit.auditRows[auditIdx]!;
      if (parseISODateUTC(row.date_iso).getTime() > monthDate.getTime()) break;
      cumBtc = row.cumulative_btc;
      cumInvested = row.cumulative_deployed;
      auditIdx++;
    }
    const monthPrice = getPlanningBtcPriceDetails(monthDate, modelSettings);
    points.push({
      monthIdx,
      label: monthYearLabelUTC(monthDate),
      date: isoDateUTC(monthDate),
      cumBtc,
      cumInvested,
      netWorth: cumBtc * monthPrice.btc_price_used,
      price: monthPrice.btc_price_used,
    });
    monthIdx++;
    monthDate = addMonthsUTC(start, monthIdx);
  }

  // Final point at the deadline carries the totals from the audit. Any
  // remaining audit rows (last buy on or before the deadline) have already
  // been folded into those totals, so we don't need to consume them again.
  points.push({
    monthIdx,
    label: monthYearLabelUTC(deadline),
    date: isoDateUTC(deadline),
    cumBtc: audit.totals.btc_at_deadline,
    cumInvested: audit.totals.total_deployed,
    netWorth: audit.totals.fiat_value_at_deadline,
    price: audit.totals.final_btc_price,
    isDeadline: true,
  });

  return points;
}
