import { describe, expect, it } from 'vitest';
import { projectAccumulation } from '../simpleProjection.js';
import type { SimpleInputs } from '../../components/SimpleCard.js';

const baseInputs: SimpleInputs = {
  annualIncome: 100_000,
  taxRatePct: 20,
  annualBurn: 65_000,
  annualSavings: 5_000,
  btcPrice: 80_000,
};

describe('projectAccumulation — invalid BTC price guard', () => {
  // Without the guard, `buildPlanningModelSettings` silently substitutes the
  // hardcoded $75,800 default anchor and the 5-year chart renders a
  // plausible-looking curve. Adjacent UI math correctly says "0 BTC/month at
  // today's $0" but the chart contradicts it. Skeptical user notices.

  it('returns an empty projection when btcPrice is 0', () => {
    const proj = projectAccumulation({ ...baseInputs, btcPrice: 0 });
    expect(proj.points).toHaveLength(0);
    expect(proj.totalsAtEnd.btcPowerLaw).toBe(0);
    expect(proj.totalsAtEnd.invested).toBe(0);
    expect(proj.audit.auditRows).toHaveLength(0);
    expect(proj.reconciliation.ok).toBe(true);
  });

  it('returns an empty projection when btcPrice is negative', () => {
    const proj = projectAccumulation({ ...baseInputs, btcPrice: -100 });
    expect(proj.points).toHaveLength(0);
    expect(proj.totalsAtEnd.btcPowerLaw).toBe(0);
  });

  it('returns an empty projection when btcPrice is NaN', () => {
    const proj = projectAccumulation({ ...baseInputs, btcPrice: Number.NaN });
    expect(proj.points).toHaveLength(0);
  });

  it('returns an empty projection when btcPrice is Infinity', () => {
    const proj = projectAccumulation({ ...baseInputs, btcPrice: Number.POSITIVE_INFINITY });
    expect(proj.points).toHaveLength(0);
  });

  it('still surfaces base.monthlyBudgetUSD for the rest of the result card to use', () => {
    // With $100K income, 20% tax, $65K burn, $5K savings → $10K/year, ~$833/mo
    // available. Even with no btcPrice, the cash-flow numbers should still
    // compute correctly so the result card remains accurate.
    const proj = projectAccumulation({ ...baseInputs, btcPrice: 0 });
    expect(proj.base.monthlyBudgetUSD).toBeCloseTo(10_000 / 12, 2);
    expect(proj.base.monthlyBtc).toBe(0);
  });

  it('returns a full projection for valid btcPrice (regression)', () => {
    const proj = projectAccumulation({ ...baseInputs, btcPrice: 80_000 });
    expect(proj.points.length).toBeGreaterThan(0);
    expect(proj.audit.auditRows.length).toBe(60);
    expect(proj.totalsAtEnd.btcPowerLaw).toBeGreaterThan(0);
  });
});
