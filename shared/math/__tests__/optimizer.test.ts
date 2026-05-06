import { describe, it, expect } from 'vitest';
import { frontLoadAllocation } from '../optimizer.js';

describe('frontLoadAllocation', () => {
  it('returns empty for months <= 0', () => {
    expect(frontLoadAllocation(60_000, 0, [1, 1])).toEqual([]);
    expect(frontLoadAllocation(60_000, -3, [1, 1])).toEqual([]);
  });

  it('returns zeros when totalDollars <= 0', () => {
    const out = frontLoadAllocation(0, 12, [0.5, 0.5]);
    expect(out).toHaveLength(12);
    expect(out.every((v) => v === 0)).toBe(true);
  });

  it('returns zeros when weights are empty or sum to 0', () => {
    expect(frontLoadAllocation(60_000, 12, []).every((v) => v === 0)).toBe(true);
    expect(frontLoadAllocation(60_000, 12, [0, 0]).every((v) => v === 0)).toBe(true);
  });

  it('even weights produce even monthly allocation', () => {
    const out = frontLoadAllocation(120_000, 24, [1, 1]);
    expect(out).toHaveLength(24);
    expect(out[0]).toBeCloseTo(120_000 / 24, 6);
    expect(out[23]).toBeCloseTo(120_000 / 24, 6);
  });

  it('front-loaded weights produce decreasing yearly slabs', () => {
    const total = 100_000;
    const weights = [0.4, 0.3, 0.2, 0.1];
    const months = 48;
    const out = frontLoadAllocation(total, months, weights);
    const yearTotals = [0, 1, 2, 3].map((y) =>
      out.slice(y * 12, (y + 1) * 12).reduce((a, b) => a + b, 0),
    );
    expect(yearTotals[0]).toBeGreaterThan(yearTotals[1]!);
    expect(yearTotals[1]).toBeGreaterThan(yearTotals[2]!);
    expect(yearTotals[2]).toBeGreaterThan(yearTotals[3]!);
    expect(yearTotals.reduce((a, b) => a + b, 0)).toBeCloseTo(total, 2);
  });

  it('reuses last weight when months exceed weights span and total still sums to total', () => {
    const total = 60_000;
    const weights = [0.5, 0.5]; // 24-month span
    const months = 36;          // last 12 months reuse weight[1]
    const out = frontLoadAllocation(total, months, weights);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(total, 2);
    // Equal weights with reuse → equal monthly distribution across 36 months.
    expect(out[0]).toBeCloseTo(total / 36, 6);
    expect(out[35]).toBeCloseTo(total / 36, 6);
  });

  it('partial horizon (months < weights span) renormalizes and still totals total', () => {
    const total = 100_000;
    const weights = [0.4, 0.3, 0.2, 0.1];
    const months = 30; // half of year 3, year 4 unused
    const out = frontLoadAllocation(total, months, weights);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(total, 2);
    // Year-1 monthly should still exceed year-2 monthly (front-loaded shape preserved).
    expect(out[0]).toBeGreaterThan(out[12]!);
    expect(out[12]).toBeGreaterThan(out[24]!);
  });

  it('normalizes unnormalized weights', () => {
    const out1 = frontLoadAllocation(100_000, 24, [0.5, 0.5]);
    const out2 = frontLoadAllocation(100_000, 24, [2, 2]); // same shape
    out1.forEach((v, i) => expect(v).toBeCloseTo(out2[i]!, 6));
  });
});
