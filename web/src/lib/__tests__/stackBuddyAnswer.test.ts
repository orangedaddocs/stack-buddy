import { describe, expect, it } from 'vitest';
import type { CashUsageLabel } from '../../../../shared/math/cashFlow.js';
import type { PlanGoal, PlanStrategy } from '../../../../shared/types.js';
import type { PlanProjectionResult } from '../planProjection.js';
import type { EvaluatedPlanStrategy, PlanConstraintStatus } from '../../components/PlanAIAdvisor.js';
import { buildStackBuddyAnswer } from '../stackBuddyAnswer.js';

const goal: PlanGoal = { target_btc: 1, deadline: '2030-12-31' };

function makeStrategy(kind: PlanStrategy['kind']): PlanStrategy {
  return {
    kind,
    recurring: { shape: 'monthly', amount_per_month: 0 },
    lump_sums: [],
    projected_btc: 0,
    total_dollars: 0,
    feasibility: 'tight',
    rationale: 'fixture',
  };
}

function makeView(args: {
  kind?: PlanStrategy['kind'];
  cashUsageLabel?: CashUsageLabel;
  cashUsageRate?: number;
  totalDeployed?: number;
  btcAtDeadline?: number;
  constraintStatus?: PlanConstraintStatus;
  hasTopUp?: boolean;
}): EvaluatedPlanStrategy {
  const projection: PlanProjectionResult = {
    points: [],
    monthsToDeadline: 60,
    totalDollarsDeployed: args.totalDeployed ?? 100_000,
    btcAtDeadline: args.btcAtDeadline ?? 1,
    netWorthAtDeadline: 100_000,
    excludedLumpSums: [],
    audit: {
      auditRows: [
        {
          row_number: 1,
          date_iso: '2026-06-01',
          contribution_type: 'recurring',
          label: 'Monthly recurring buy',
          amount_usd: args.totalDeployed ? args.totalDeployed / 60 : 1_667,
          btc_price_used: 100_000,
          power_law_price: 100_000,
          multiplier: 1,
          btc_bought: 0.01,
          cumulative_btc: 0.01,
          cumulative_deployed: 1_667,
          fiat_value: 1_667,
          notes: '',
          model_id: 'catch_up_power_law_b1m_1x_2028-06-30',
          spot_anchor_date: '2026-05-04',
          spot_anchor_price: 75_800,
          catchup_date: '2028-06-30',
          catchup_price: 249_000,
        },
        ...(args.hasTopUp
          ? [{
              row_number: 2,
              date_iso: '2030-12-01',
              contribution_type: 'lump' as const,
              label: 'Target top-up after capped 3000/mo plan',
              amount_usd: 50_000,
              btc_price_used: 500_000,
              power_law_price: 500_000,
              multiplier: 1,
              btc_bought: 0.1,
              cumulative_btc: 0.7,
              cumulative_deployed: (args.totalDeployed ?? 100_000),
              fiat_value: 0,
              notes: '',
              model_id: 'catch_up_power_law_b1m_1x_2028-06-30',
              spot_anchor_date: '2026-05-04',
              spot_anchor_price: 75_800,
              catchup_date: '2028-06-30',
              catchup_price: 249_000,
            }]
          : []),
      ],
      totals: {
        starting_btc: 0,
        btc_bought: args.btcAtDeadline ?? 1,
        btc_at_deadline: args.btcAtDeadline ?? 1,
        total_deployed: args.totalDeployed ?? 100_000,
        fiat_value_at_deadline: 100_000,
        final_btc_price: 500_000,
        arithmetic_average_planning_price: 200_000,
        effective_average_buy_price: 100_000,
      },
      timing: {
        plan_start_date: '2026-05-04',
        first_contribution_date: '2026-06-01',
        last_contribution_date: '2030-12-01',
        contribution_count: 60,
        contribution_frequency: 'monthly',
        contribution_timing_rule: 'monthly_anniversary',
      },
      model: {
        model_id: 'catch_up_power_law_b1m_1x_2028-06-30',
        spot_anchor_date: '2026-05-04',
        spot_anchor_price: 75_800,
        catchup_date: '2028-06-30',
        catchup_price: 249_000,
      },
    },
    reconciliation: { ok: true, issues: [] },
  };

  return {
    strategy: makeStrategy(args.kind ?? 'monthly'),
    projection,
    cashUsageRate: args.cashUsageRate ?? 0.5,
    cashUsageLabel: args.cashUsageLabel ?? 'comfortable',
    constraintStatus: args.constraintStatus,
    stale: false,
  };
}

describe('buildStackBuddyAnswer — feasibility gating', () => {
  it('says "this doesn\'t fit" when the plan is unfunded', () => {
    const view = makeView({
      cashUsageLabel: 'unfunded',
      cashUsageRate: 4.51,
      totalDeployed: 451_000,
    });
    const answer = buildStackBuddyAnswer({
      view,
      goal,
      constraints: {},
      loading: false,
    });
    expect(answer.tone).toBe('unfunded');
    expect(answer.headline.toLowerCase()).toContain("doesn't fit");
    expect(answer.summary).toContain('451%');
    expect(answer.summary.toLowerCase()).not.toContain('fits best');
  });

  it('says "fits, but only with a tradeoff" when constraints needs_tradeoff', () => {
    const view = makeView({
      cashUsageLabel: 'tight',
      constraintStatus: { label: 'needs_tradeoff', message: 'top-up needed' },
      hasTopUp: true,
    });
    const answer = buildStackBuddyAnswer({
      view,
      goal,
      constraints: { maxMonthlyContribution: 3_000 },
      loading: false,
    });
    expect(answer.tone).toBe('needs_tradeoff');
    expect(answer.headline.toLowerCase()).toContain('tradeoff');
    expect(answer.summary).toContain('top-up');
  });

  it('says the plan "fits" when feasibility is comfortable and no constraint violation', () => {
    const view = makeView({ cashUsageLabel: 'comfortable' });
    const answer = buildStackBuddyAnswer({
      view,
      goal,
      constraints: {},
      loading: false,
    });
    expect(answer.tone).toBe('fits');
    expect(answer.headline.toLowerCase()).toContain('fits');
  });

  it('treats a violated constraint as unfunded (refuses to call it fitting)', () => {
    const view = makeView({
      cashUsageLabel: 'comfortable',
      constraintStatus: { label: 'violates', message: 'recurring above cap' },
    });
    const answer = buildStackBuddyAnswer({
      view,
      goal,
      constraints: { maxMonthlyContribution: 3_000 },
      loading: false,
    });
    expect(answer.tone).toBe('unfunded');
    expect(answer.headline.toLowerCase()).toContain("doesn't fit");
  });

  it('exposes the cap in the summary when the user supplied one', () => {
    const view = makeView({ cashUsageLabel: 'manageable' });
    const answer = buildStackBuddyAnswer({
      view,
      goal,
      constraints: { maxMonthlyContribution: 3_000 },
      loading: false,
    });
    expect(answer.summary).toContain('$3,000/month');
  });
});
