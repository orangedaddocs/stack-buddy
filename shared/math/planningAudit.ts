import type { BtcModelConfig } from '../types.js';
import { getPlanningBtcPriceDetails } from './catchUp.js';

export type AuditContributionType = 'recurring' | 'lump' | 'ai_strategy' | 'manual';

export type ContributionTimingRule =
  | 'first_day_of_month'
  | 'last_day_of_month'
  | 'exact_date'
  | 'monthly_anniversary'
  | 'custom';

export type DeterministicContributionEvent = {
  date: string;
  contribution_type: AuditContributionType;
  label: string;
  amount_usd: number;
  notes?: string;
};

export type PlanAuditRow = {
  row_number: number;
  date_iso: string;
  contribution_type: AuditContributionType;
  label: string;
  amount_usd: number;
  btc_price_used: number;
  power_law_price: number;
  multiplier: number;
  btc_bought: number;
  cumulative_btc: number;
  cumulative_deployed: number;
  fiat_value: number;
  notes: string;
  model_id: string;
  spot_anchor_date: string;
  spot_anchor_price: number;
  catchup_date: string;
  catchup_price: number;
};

export type DeterministicPlanTotals = {
  starting_btc: number;
  btc_bought: number;
  btc_at_deadline: number;
  total_deployed: number;
  fiat_value_at_deadline: number;
  final_btc_price: number;
  arithmetic_average_planning_price: number;
  effective_average_buy_price: number;
};

export type PlanTimingSummary = {
  plan_start_date: string;
  first_contribution_date: string | null;
  last_contribution_date: string | null;
  contribution_count: number;
  contribution_frequency: string;
  contribution_timing_rule: ContributionTimingRule;
};

export type DeterministicPlanResult = {
  auditRows: PlanAuditRow[];
  totals: DeterministicPlanTotals;
  timing: PlanTimingSummary;
  model: {
    model_id: string;
    spot_anchor_date: string;
    spot_anchor_price: number;
    catchup_date: string;
    catchup_price: number;
  };
};

export type PlanReconciliation = {
  ok: boolean;
  issues: string[];
};

export function evaluateContributionSchedule(args: {
  events: DeterministicContributionEvent[];
  startingBtc: number;
  deadline: string;
  modelSettings: BtcModelConfig;
  planStartDate: string;
  contributionFrequency: string;
  contributionTimingRule: ContributionTimingRule;
}): DeterministicPlanResult {
  const deadlineDate = parseISODateUTC(args.deadline);
  const usableEvents = args.events
    .map((ev, originalIndex) => ({ ...ev, originalIndex }))
    .filter((ev) => Number.isFinite(ev.amount_usd) && ev.amount_usd > 0)
    .filter((ev) => {
      const eventDate = parseISODateUTC(ev.date);
      return eventDate.getTime() <= deadlineDate.getTime();
    })
    .sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return a.originalIndex - b.originalIndex;
    });

  let cumulativeBtc = Number.isFinite(args.startingBtc) ? Math.max(0, args.startingBtc) : 0;
  let cumulativeDeployed = 0;
  let btcBoughtTotal = 0;

  const auditRows: PlanAuditRow[] = [];

  for (const ev of usableEvents) {
    const date = parseISODateUTC(ev.date);
    const price = getPlanningBtcPriceDetails(date, args.modelSettings);
    if (!Number.isFinite(price.btc_price_used) || price.btc_price_used <= 0) {
      throw new Error(`evaluateContributionSchedule: invalid BTC price on ${ev.date}`);
    }

    const btcBought = ev.amount_usd / price.btc_price_used;
    cumulativeBtc += btcBought;
    btcBoughtTotal += btcBought;
    cumulativeDeployed += ev.amount_usd;

    auditRows.push({
      row_number: auditRows.length + 1,
      date_iso: price.date_iso,
      contribution_type: ev.contribution_type,
      label: ev.label,
      amount_usd: ev.amount_usd,
      btc_price_used: price.btc_price_used,
      power_law_price: price.power_law_price,
      multiplier: price.multiplier,
      btc_bought: btcBought,
      cumulative_btc: cumulativeBtc,
      cumulative_deployed: cumulativeDeployed,
      fiat_value: cumulativeBtc * price.btc_price_used,
      notes: ev.notes ?? '',
      model_id: price.model_id,
      spot_anchor_date: price.spot_anchor_date,
      spot_anchor_price: price.spot_anchor_price,
      catchup_date: price.catchup_date,
      catchup_price: price.catchup_price,
    });
  }

  const finalPrice = getPlanningBtcPriceDetails(deadlineDate, args.modelSettings);
  const firstRow = auditRows[0] ?? null;
  const lastRow = auditRows.at(-1) ?? null;
  const modelRow = firstRow ?? finalPrice;
  const arithmeticAverage =
    auditRows.length > 0
      ? auditRows.reduce((acc, row) => acc + row.btc_price_used, 0) / auditRows.length
      : finalPrice.btc_price_used;

  return {
    auditRows,
    totals: {
      starting_btc: Number.isFinite(args.startingBtc) ? Math.max(0, args.startingBtc) : 0,
      btc_bought: btcBoughtTotal,
      btc_at_deadline: cumulativeBtc,
      total_deployed: cumulativeDeployed,
      fiat_value_at_deadline:
        Number.isFinite(finalPrice.btc_price_used) && finalPrice.btc_price_used > 0
          ? cumulativeBtc * finalPrice.btc_price_used
          : 0,
      final_btc_price: finalPrice.btc_price_used,
      arithmetic_average_planning_price: arithmeticAverage,
      effective_average_buy_price:
        btcBoughtTotal > 0 ? cumulativeDeployed / btcBoughtTotal : finalPrice.btc_price_used,
    },
    timing: {
      plan_start_date: args.planStartDate,
      first_contribution_date: firstRow?.date_iso ?? null,
      last_contribution_date: lastRow?.date_iso ?? null,
      contribution_count: auditRows.length,
      contribution_frequency: args.contributionFrequency,
      contribution_timing_rule: args.contributionTimingRule,
    },
    model: {
      model_id: modelRow.model_id,
      spot_anchor_date: modelRow.spot_anchor_date,
      spot_anchor_price: modelRow.spot_anchor_price,
      catchup_date: modelRow.catchup_date,
      catchup_price: modelRow.catchup_price,
    },
  };
}

export function reconcilePlanResult(
  result: DeterministicPlanResult,
  displayed?: {
    btcAtDeadline?: number;
    totalDeployed?: number;
    fiatValueAtDeadline?: number;
    contributionCount?: number;
    modelId?: string;
  },
): PlanReconciliation {
  const issues: string[] = [];
  const sumBtcBought = result.auditRows.reduce((acc, row) => acc + row.btc_bought, 0);
  const sumDeployed = result.auditRows.reduce((acc, row) => acc + row.amount_usd, 0);
  const expectedFinalBtc = result.totals.starting_btc + sumBtcBought;
  const expectedFiat = result.totals.btc_at_deadline * result.totals.final_btc_price;

  if (!near(sumBtcBought, result.totals.btc_bought, 1e-10)) {
    issues.push('Sum of audit BTC bought does not equal plan BTC bought.');
  }
  if (!near(expectedFinalBtc, result.totals.btc_at_deadline, 1e-10)) {
    issues.push('Starting BTC plus audit BTC bought does not equal final BTC.');
  }
  if (!near(sumDeployed, result.totals.total_deployed, 0.0001)) {
    issues.push('Sum of audit deployed dollars does not equal displayed total deployed.');
  }
  if (!near(expectedFiat, result.totals.fiat_value_at_deadline, 0.01)) {
    issues.push('Fiat value does not equal final BTC times final BTC price.');
  }

  if (displayed?.btcAtDeadline !== undefined && !near(displayed.btcAtDeadline, result.totals.btc_at_deadline, 0.0001)) {
    issues.push('Displayed BTC at deadline is out of sync with deterministic engine.');
  }
  if (displayed?.totalDeployed !== undefined && !near(displayed.totalDeployed, result.totals.total_deployed, 0.01)) {
    issues.push('Displayed total deployed is out of sync with deterministic engine.');
  }
  if (
    displayed?.fiatValueAtDeadline !== undefined &&
    !near(displayed.fiatValueAtDeadline, result.totals.fiat_value_at_deadline, 0.01)
  ) {
    issues.push('Displayed fiat value is out of sync with deterministic engine.');
  }
  if (
    displayed?.contributionCount !== undefined &&
    displayed.contributionCount !== result.timing.contribution_count
  ) {
    issues.push('Contribution count does not match deterministic audit rows.');
  }
  if (displayed?.modelId !== undefined && displayed.modelId !== result.model.model_id) {
    issues.push('Price model ID does not match the current deterministic model.');
  }

  return { ok: issues.length === 0, issues };
}

export function parseISODateUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function isoDateUTC(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function addMonthsUTC(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfTargetMonth)));
}

export function firstDayOfNextMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export function lastDayOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export function monthYearLabelUTC(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function near(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}
