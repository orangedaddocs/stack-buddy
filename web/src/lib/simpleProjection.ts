import { buildPlanningModelSettings, getPlanningBtcPriceDetails } from '../../../shared/math/catchUp.js';
import {
  addMonthsUTC,
  evaluateContributionSchedule,
  firstDayOfNextMonthUTC,
  isoDateUTC,
  monthYearLabelUTC,
  parseISODateUTC,
  reconcilePlanResult,
  type DeterministicContributionEvent,
  type DeterministicPlanResult,
  type PlanReconciliation,
} from '../../../shared/math/planningAudit.js';
import { computeSimple, type SimpleMath } from '../components/SimpleResult.js';
import type { SimpleInputs } from '../components/SimpleCard.js';

export type ProjectionPoint = {
  monthIdx: number;
  label: string;
  /** Cumulative BTC accumulated at the actual catch-up Power Law price each month. */
  cumBtcPowerLaw: number;
  /** Total dollars invested through this month (monthly budget × monthIdx). */
  cumInvested: number;
  /** Net worth at end-of-month under Power Law (btcPowerLaw × this-month's PL price). */
  netWorthPowerLaw: number;
  /** This-month's catch-up Power Law BTC price. */
  pricePowerLaw: number;
  date: string;
};

export type ProjectionResult = {
  base: SimpleMath;
  points: ProjectionPoint[];
  totalsAtEnd: {
    btcPowerLaw: number;
    netWorthPowerLaw: number;
    invested: number;
    averagePricePowerLaw: number;
    effectiveAverageBuyPrice: number;
  };
  audit: DeterministicPlanResult;
  reconciliation: PlanReconciliation;
};

/**
 * Project monthly DCA over `months` months, integrating Power Law price evolution
 * properly (each month's $X buys whatever BTC the price at THAT month allows).
 *
 * Two parallel scenarios:
 *   - flat: price stays at inputs.btcPrice forever → cumBtc grows linearly
 *   - power law: price follows catch-up to 1.0× B1M by mid-2028, then tracks
 *     the model → cumBtc grows fast initially, slows as price climbs
 */
export function projectAccumulation(
  inputs: SimpleInputs,
  months = 60,
): ProjectionResult {
  const base = computeSimple(inputs);
  // If the user cleared the BTC price field (or typed a non-positive value),
  // bail out instead of silently using the hardcoded $75,800 default anchor.
  // Without this guard the rest of the page is internally inconsistent — the
  // result card shows "0 BTC/month at today's $0" while the chart below it
  // renders a full plausible 5-year curve based on $75,800. Skeptical user
  // notices, trust gone.
  if (!Number.isFinite(inputs.btcPrice) || inputs.btcPrice <= 0) {
    return emptySimpleProjection(base);
  }
  const monthlyBudget = base.monthlyBudgetUSD;
  const start = new Date();
  const startIso = isoDateUTC(start);
  const firstBuy = firstDayOfNextMonthUTC(start);
  const lastBuy = months > 0 ? addMonthsUTC(firstBuy, months - 1) : start;
  const cfg = buildPlanningModelSettings({
    spotAnchorDate: startIso,
    spotAnchorPrice: inputs.btcPrice,
  });
  const events: DeterministicContributionEvent[] = [];
  for (let i = 0; i < months; i++) {
    const d = addMonthsUTC(firstBuy, i);
    if (monthlyBudget <= 0) continue;
    events.push({
      date: isoDateUTC(d),
      contribution_type: 'recurring',
      label: 'Simple monthly buy',
      amount_usd: monthlyBudget,
      notes: 'Simple tab monthly DCA, priced by deterministic engine.',
    });
  }

  const audit = evaluateContributionSchedule({
    events,
    startingBtc: 0,
    deadline: isoDateUTC(lastBuy),
    modelSettings: cfg,
    planStartDate: startIso,
    contributionFrequency: 'monthly',
    contributionTimingRule: 'first_day_of_month',
  });
  const points = buildSimplePoints(audit, start, cfg);
  const reconciliation = reconcilePlanResult(audit, {
    btcAtDeadline: audit.totals.btc_at_deadline,
    totalDeployed: audit.totals.total_deployed,
    fiatValueAtDeadline: audit.totals.fiat_value_at_deadline,
    contributionCount: audit.timing.contribution_count,
    modelId: audit.model.model_id,
  });

  return {
    base,
    points,
    totalsAtEnd: {
      btcPowerLaw: audit.totals.btc_at_deadline,
      netWorthPowerLaw: audit.totals.fiat_value_at_deadline,
      invested: audit.totals.total_deployed,
      averagePricePowerLaw: audit.totals.arithmetic_average_planning_price,
      effectiveAverageBuyPrice: audit.totals.effective_average_buy_price,
    },
    audit,
    reconciliation,
  };
}

function emptySimpleProjection(base: SimpleMath): ProjectionResult {
  // Used when the user supplied a non-positive / non-finite BTC price. The
  // SimpleAccumulation chart already returns null when `points` is empty, so
  // the chart card simply disappears — much better than showing a 5-year
  // curve drawn against the silently-substituted default anchor.
  const cfg = buildPlanningModelSettings({});
  const audit = evaluateContributionSchedule({
    events: [],
    startingBtc: 0,
    deadline: cfg.current_date,
    modelSettings: cfg,
    planStartDate: cfg.current_date,
    contributionFrequency: 'monthly',
    contributionTimingRule: 'first_day_of_month',
  });
  return {
    base,
    points: [],
    totalsAtEnd: {
      btcPowerLaw: 0,
      netWorthPowerLaw: 0,
      invested: 0,
      averagePricePowerLaw: 0,
      effectiveAverageBuyPrice: 0,
    },
    audit,
    reconciliation: reconcilePlanResult(audit),
  };
}

function buildSimplePoints(
  audit: DeterministicPlanResult,
  start: Date,
  modelSettings: ReturnType<typeof buildPlanningModelSettings>,
): ProjectionPoint[] {
  const startPrice = getPlanningBtcPriceDetails(start, modelSettings);
  const points: ProjectionPoint[] = [
    {
      monthIdx: 0,
      label: monthYearLabelUTC(start),
      date: isoDateUTC(start),
      cumBtcPowerLaw: 0,
      cumInvested: 0,
      netWorthPowerLaw: 0,
      pricePowerLaw: startPrice.btc_price_used,
    },
  ];

  audit.auditRows.forEach((row) => {
    const d = parseISODateUTC(row.date_iso);
    points.push({
      monthIdx: row.row_number,
      label: monthYearLabelUTC(d),
      date: row.date_iso,
      cumBtcPowerLaw: row.cumulative_btc,
      cumInvested: row.cumulative_deployed,
      netWorthPowerLaw: row.fiat_value,
      pricePowerLaw: row.btc_price_used,
    });
  });

  return points;
}
