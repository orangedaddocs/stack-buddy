import { describe, it, expect } from 'vitest';
import { isEngineSeededPlaceholder, scaleStrategyToTarget } from '../strategyScaling.js';
import type { PlanState, PlanStrategy } from '../../../../shared/types.js';

/**
 * Lock-in for Finding A: user-stated lump amounts must survive
 * `scaleStrategyToTarget` unchanged. Only engine-seeded "Target lump N"
 * placeholders absorb scaling. The shortfall after capping recurring is
 * absorbed by the labeled "Target top-up after capped..." lump that
 * `applyStrategyConstraints` adds.
 */
describe('isEngineSeededPlaceholder', () => {
  it('matches engine seeds with the canonical label shape', () => {
    expect(isEngineSeededPlaceholder({ label: 'Target lump 1' })).toBe(true);
    expect(isEngineSeededPlaceholder({ label: 'Target lump 8' })).toBe(true);
    expect(isEngineSeededPlaceholder({ label: 'Target lump 27' })).toBe(true);
  });

  it('rejects user-stated labels and the engine-added top-up', () => {
    expect(isEngineSeededPlaceholder({ label: 'November 2027 bonus' })).toBe(false);
    expect(isEngineSeededPlaceholder({ label: 'April 2028 tax refund' })).toBe(false);
    expect(isEngineSeededPlaceholder({ label: 'Target top-up after capped 1,500/mo plan' })).toBe(
      false,
    );
    expect(isEngineSeededPlaceholder({ label: 'Target lumps' })).toBe(false);
    expect(isEngineSeededPlaceholder({ label: '' })).toBe(false);
  });
});

describe('scaleStrategyToTarget — preserves user-stated lump amounts', () => {
  const today = new Date('2026-05-05T00:00:00Z');
  const basePlan: PlanState = {
    goal: { target_btc: 2, deadline: '2031-12-31' },
    starting_btc: 0,
    recurring: { shape: 'monthly', amount_per_month: 1500 },
    lump_sums: [
      { date: '2027-11-15', amount: 10_000, label: 'November 2027 bonus' },
      { date: '2028-04-15', amount: 20_000, label: 'April 2028 tax refund' },
    ],
  };
  const strategy: PlanStrategy = {
    kind: 'lump_sums',
    recurring: { shape: 'monthly', amount_per_month: 1500 },
    lump_sums: basePlan.lump_sums,
    projected_btc: 0,
    total_dollars: 0,
    feasibility: 'tight',
    rationale: '',
  };

  it('keeps the user-stated $10K bonus and $20K tax refund unchanged', () => {
    const out = scaleStrategyToTarget(strategy, {
      basePlan,
      currentPrice: 81_471,
      today,
      monthlyAvailable: 833,
      monthsToDeadline: 67,
      constraints: { maxMonthlyContribution: 1500, preferredKind: 'lump_sums' },
    });

    const bonus = out.lump_sums.find((l) => l.label === 'November 2027 bonus');
    const refund = out.lump_sums.find((l) => l.label === 'April 2028 tax refund');
    expect(bonus?.amount).toBe(10_000);
    expect(refund?.amount).toBe(20_000);
  });

  it('still adds an engine top-up to absorb the BTC shortfall under the cap', () => {
    const out = scaleStrategyToTarget(strategy, {
      basePlan,
      currentPrice: 81_471,
      today,
      monthlyAvailable: 833,
      monthsToDeadline: 67,
      constraints: { maxMonthlyContribution: 1500, preferredKind: 'lump_sums' },
    });

    const topUp = out.lump_sums.find((l) => /target top-up after capped/i.test(l.label));
    expect(topUp).toBeDefined();
    expect(topUp!.amount).toBeGreaterThan(0);
    // The plan still hits the BTC target deterministically.
    expect(out.projected_btc).toBeGreaterThanOrEqual(2 - 1e-3);
  });

  it('still scales engine-seeded "Target lump N" placeholders', () => {
    // Custom-mix path with no user-supplied lumps falls back to
    // engine-seeded placeholders. Those must scale to make the plan reach
    // target. A regression here would zero them out and break the
    // default Custom-mix flow.
    const seedOnly: PlanStrategy = {
      kind: 'lump_sums',
      recurring: { shape: 'monthly', amount_per_month: 1 },
      lump_sums: [
        { date: '2027-01-15', amount: 1, label: 'Target lump 1' },
        { date: '2028-01-15', amount: 1, label: 'Target lump 2' },
        { date: '2029-01-15', amount: 1, label: 'Target lump 3' },
      ],
      projected_btc: 0,
      total_dollars: 0,
      feasibility: 'tight',
      rationale: '',
    };
    const out = scaleStrategyToTarget(seedOnly, {
      basePlan: { ...basePlan, lump_sums: seedOnly.lump_sums },
      currentPrice: 81_471,
      today,
      monthlyAvailable: 100_000,
      monthsToDeadline: 67,
    });
    const placeholderAmounts = out.lump_sums
      .filter((l) => /^Target lump \d+$/.test(l.label))
      .map((l) => l.amount);
    expect(placeholderAmounts.every((a) => a > 1)).toBe(true);
  });
});
