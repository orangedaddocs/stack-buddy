import { describe, expect, it } from 'vitest';
import { buildPlanningModelSettings } from '../../../../shared/math/catchUp.js';
import type { PlanState, PlanStrategy } from '../../../../shared/types.js';
import { buildPlanContributionEvents, projectPlan } from '../planProjection.js';

const model = buildPlanningModelSettings({
  spotAnchorDate: '2026-04-29',
  spotAnchorPrice: 75_800,
});

describe('projectPlan', () => {
  it('keeps AI strategy card, chart, and audit BTC in sync', () => {
    const strategy: PlanStrategy = {
      kind: 'lump_sums',
      recurring: { shape: 'none', amount_per_month: 0 },
      lump_sums: [
        { date: '2026-06-01', amount: 90_000, label: 'Lump 1' },
        { date: '2026-10-01', amount: 80_000, label: 'Lump 2' },
        { date: '2027-02-01', amount: 80_000, label: 'Lump 3' },
        { date: '2027-07-01', amount: 80_000, label: 'Lump 4' },
        { date: '2027-12-01', amount: 80_000, label: 'Lump 5' },
        { date: '2028-04-01', amount: 80_000, label: 'Lump 6' },
        { date: '2028-10-01', amount: 70_000, label: 'Lump 7' },
        { date: '2029-04-01', amount: 60_000, label: 'Lump 8' },
        { date: '2029-10-01', amount: 60_000, label: 'Lump 9' },
        { date: '2030-04-01', amount: 50_000, label: 'Lump 10' },
        { date: '2030-10-01', amount: 50_000, label: 'Lump 11' },
      ],
      projected_btc: 999,
      total_dollars: 1,
      feasibility: 'comfortable',
      rationale: 'Fixture strategy.',
    };
    const plan: PlanState = {
      goal: { target_btc: 3.5, deadline: '2030-12-31' },
      starting_btc: 0,
      recurring: strategy.recurring,
      lump_sums: strategy.lump_sums,
    };

    const projection = projectPlan(plan, {
      startingBtc: plan.starting_btc,
      currentBtcPrice: 75_800,
      startDate: new Date('2026-04-29T00:00:00Z'),
      modelSettings: model,
      contributionOrigin: 'ai_strategy',
    });

    const cardBtc = projection.btcAtDeadline;
    const chartBtc = projection.points.at(-1)?.cumBtc ?? 0;
    const auditBtc = projection.audit.totals.btc_at_deadline;

    expect(cardBtc).toBeCloseTo(4.8864067987350595, 12);
    expect(cardBtc).toBeCloseTo(chartBtc, 4);
    expect(cardBtc).toBeCloseTo(auditBtc, 4);
    expect(projection.totalDollarsDeployed).toBe(780_000);
    expect(projection.reconciliation.ok).toBe(true);
    expect(strategy.projected_btc).not.toBeCloseTo(cardBtc, 4);
  });
});

describe('buildPlanContributionEvents — lump-sum window handling', () => {
  // Use a deterministic startDate so this test doesn't drift with wall-clock.
  // The bug was: a lump with the same calendar date as `start` was dropped
  // because `start` is a live `new Date()` (post-midnight) but the lump
  // parses as midnight UTC. Here we simulate the same trap by giving `start`
  // an afternoon timestamp.
  const startWithTime = new Date('2026-05-04T16:30:00Z');
  const deadline = '2030-12-31';

  it('keeps a lump dated for today even when start is mid-day', () => {
    const plan: PlanState = {
      goal: { target_btc: 1, deadline },
      starting_btc: 0,
      recurring: { shape: 'none', amount_per_month: 0 },
      lump_sums: [{ date: '2026-05-04', amount: 5_000, label: 'Today buy' }],
    };
    const { events, excludedLumpSums } = buildPlanContributionEvents(plan, startWithTime, 'manual');
    expect(events).toHaveLength(1);
    expect(events[0]!.amount_usd).toBe(5_000);
    expect(events[0]!.label).toBe('Today buy');
    expect(excludedLumpSums).toHaveLength(0);
  });

  it('reports lumps before today and after the deadline as excluded', () => {
    const plan: PlanState = {
      goal: { target_btc: 1, deadline },
      starting_btc: 0,
      recurring: { shape: 'none', amount_per_month: 0 },
      lump_sums: [
        { date: '2025-12-31', amount: 1_000, label: 'Last year' },
        { date: '2026-08-01', amount: 2_000, label: 'In window' },
        { date: '2031-01-01', amount: 3_000, label: 'After deadline' },
      ],
    };
    const { events, excludedLumpSums } = buildPlanContributionEvents(plan, startWithTime, 'manual');
    expect(events).toHaveLength(1);
    expect(events[0]!.amount_usd).toBe(2_000);
    expect(excludedLumpSums).toHaveLength(2);
    expect(excludedLumpSums.find((e) => e.lumpSum.label === 'Last year')?.reason).toBe('before_today');
    expect(excludedLumpSums.find((e) => e.lumpSum.label === 'After deadline')?.reason).toBe('after_deadline');
  });
});

describe('projectPlan — same-day buy in initial chart point', () => {
  it('reflects a same-day lump in the chart point at monthIdx 0', () => {
    // Today is 2026-05-04 in this fixture. A lump dated for the same day
    // should land in the audit AND in the first chart point. The earlier
    // implementation pushed the initial point with cumBtc = starting_btc
    // before consuming any same-day rows, so the chart curve started flat
    // and stepped up only at month 1 — silently disagreeing with the audit
    // table sitting next to it.
    const start = new Date('2026-05-04T16:30:00Z');
    const plan: PlanState = {
      goal: { target_btc: 1, deadline: '2030-12-31' },
      starting_btc: 0,
      recurring: { shape: 'none', amount_per_month: 0 },
      lump_sums: [{ date: '2026-05-04', amount: 50_000, label: 'Today buy' }],
    };
    const projection = projectPlan(plan, {
      startingBtc: 0,
      currentBtcPrice: 75_800,
      startDate: start,
      modelSettings: model,
      contributionOrigin: 'manual',
    });

    const first = projection.points[0]!;
    expect(first.monthIdx).toBe(0);
    expect(first.date).toBe('2026-05-04');
    expect(first.cumBtc).toBeGreaterThan(0);
    expect(first.cumInvested).toBe(50_000);
  });
});

describe('projectPlan — past-deadline guard', () => {
  it('returns an empty projection when the deadline is before today', () => {
    const start = new Date('2026-05-05T00:00:00Z');
    const plan: PlanState = {
      goal: { target_btc: 1, deadline: '2024-01-01' },
      starting_btc: 0,
      recurring: { shape: 'monthly', amount_per_month: 1_000 },
      lump_sums: [],
    };
    const projection = projectPlan(plan, {
      startingBtc: 0,
      currentBtcPrice: 75_800,
      startDate: start,
      modelSettings: model,
    });

    expect(projection.points).toHaveLength(0);
    expect(projection.btcAtDeadline).toBe(0);
    expect(projection.totalDollarsDeployed).toBe(0);
    // Critically: no NaN final price, no false reconciliation error.
    expect(Number.isFinite(projection.netWorthAtDeadline)).toBe(true);
    expect(projection.reconciliation.ok).toBe(true);
  });

  it('returns an empty projection when the deadline equals today', () => {
    const start = new Date('2026-05-05T16:00:00Z');
    const plan: PlanState = {
      goal: { target_btc: 1, deadline: '2026-05-05' },
      starting_btc: 0,
      recurring: { shape: 'monthly', amount_per_month: 1_000 },
      lump_sums: [],
    };
    const projection = projectPlan(plan, {
      startingBtc: 0,
      currentBtcPrice: 75_800,
      startDate: start,
      modelSettings: model,
    });
    expect(projection.points).toHaveLength(0);
  });
});

describe('projectPlan — chart point spacing', () => {
  it('emits one chart point per calendar month so sparse lumps render at honest x-positions', () => {
    const plan: PlanState = {
      goal: { target_btc: 1, deadline: '2030-12-31' },
      starting_btc: 0,
      recurring: { shape: 'none', amount_per_month: 0 },
      lump_sums: [
        { date: '2026-06-01', amount: 50_000, label: 'Early' },
        { date: '2030-06-01', amount: 50_000, label: 'Late' },
      ],
    };
    const start = new Date('2026-05-04T00:00:00Z');
    const projection = projectPlan(plan, {
      startingBtc: 0,
      currentBtcPrice: 75_800,
      startDate: start,
      modelSettings: model,
      contributionOrigin: 'manual',
    });

    // The plan window is May 4 2026 → Dec 31 2030, ~56 months. We should see
    // a point per month plus the starting point and a final deadline point —
    // not just two chart points for the two lump buys.
    expect(projection.points.length).toBeGreaterThan(50);

    // monthIdx is calendar-aligned, not audit-row-indexed. Two consecutive
    // points should differ by exactly 1 month, regardless of whether a buy
    // happened in either of those months.
    const idx = projection.points.map((p) => p.monthIdx);
    for (let i = 1; i < idx.length - 1; i++) {
      expect(idx[i]! - idx[i - 1]!).toBe(1);
    }

    // cumBtc holds steady through gap months and only changes when a buy
    // lands. Between months 1 and ~48 (after the early buy, before the late
    // buy) the cumBtc value should be a single constant plateau.
    const earlyBuy = projection.points.find((p) => p.date === '2026-06-04');
    const beforeLate = projection.points.find((p) => p.date === '2030-05-04');
    expect(earlyBuy).toBeDefined();
    expect(beforeLate).toBeDefined();
    expect(earlyBuy!.cumBtc).toBeGreaterThan(0);
    expect(earlyBuy!.cumBtc).toBeCloseTo(beforeLate!.cumBtc, 8);

    // The final deadline point reflects both buys.
    const last = projection.points.at(-1)!;
    expect(last.isDeadline).toBe(true);
    expect(last.date).toBe('2030-12-31');
    expect(last.cumBtc).toBeGreaterThan(beforeLate!.cumBtc);
  });
});
