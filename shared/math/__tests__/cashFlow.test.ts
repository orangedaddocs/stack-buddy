import { describe, it, expect } from 'vitest';
import { resolveBurnAnnual, resolveBurnApplied, availableForBTC } from '../cashFlow.js';
import type { YearAssumptions } from '../../types.js';

const baseYear: YearAssumptions = {
  year: 2027,
  revenue: 1_000_000,
  profit: 700_000,
  estimated_taxes: 238_000,
  burn_annual: 265_000,
  burn_active_months: 12,
  cash_reserve: 50_000,
  locks: [],
};

describe('resolveBurnAnnual', () => {
  it('returns burn_annual unchanged for the base year', () => {
    expect(resolveBurnAnnual(baseYear, baseYear, 0.055)).toBe(265_000);
  });

  it('compounds inflation for later years (no lock)', () => {
    const y2028: YearAssumptions = { ...baseYear, year: 2028, locks: [] };
    const got = resolveBurnAnnual(y2028, baseYear, 0.055);
    expect(got).toBeCloseTo(265_000 * 1.055, 0);
  });

  it('respects a manual lock (returns the locked value as-is)', () => {
    const y2028: YearAssumptions = { ...baseYear, year: 2028, burn_annual: 300_000, locks: ['burn_annual'] };
    const got = resolveBurnAnnual(y2028, baseYear, 0.055);
    expect(got).toBe(300_000);
  });
});

describe('resolveBurnApplied', () => {
  it('pro-rates by active months', () => {
    const partial: YearAssumptions = { ...baseYear, year: 2026, burn_active_months: 6 };
    const got = resolveBurnApplied(partial, baseYear, 0.055);
    // baseYear is 2027, partial is 2026 → integer delta is -1, compounded backward
    const annual = 265_000 * Math.pow(1.055, -1);
    expect(got).toBeCloseTo(annual * 0.5, 0);
  });
});

describe('availableForBTC', () => {
  it('computes the chain end-to-end and clamps available at 0', () => {
    const r = availableForBTC(baseYear, baseYear, 0.055);
    expect(r.preTax).toBe(700_000);
    expect(r.taxes).toBe(238_000);
    expect(r.afterTax).toBe(462_000);
    expect(r.burnAnnual).toBe(265_000);
    expect(r.burnApplied).toBe(265_000);
    expect(r.reserve).toBe(50_000);
    expect(r.available).toBe(462_000 - 265_000 - 50_000); // 147_000
  });

  it('clamps available to 0 when burn + reserve exceed afterTax', () => {
    const high: YearAssumptions = {
      ...baseYear,
      burn_annual: 500_000,
      cash_reserve: 100_000,
      locks: ['burn_annual'],
    };
    const r = availableForBTC(high, baseYear, 0.055);
    expect(r.available).toBe(0);
  });
});
