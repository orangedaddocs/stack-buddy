import { describe, it, expect } from 'vitest';
import {
  daysSinceGenesis,
  b1mPrice,
  santostasiPrice,
  customPrice,
  b1mCAGRAt,
  b1mDateForPrice,
  GENESIS,
} from '../powerLaw.js';

const within5Pct = (actual: number, expected: number) =>
  Math.abs(actual - expected) / expected < 0.05;

describe('daysSinceGenesis', () => {
  it('returns 0 at Genesis', () => {
    expect(daysSinceGenesis(GENESIS)).toBe(0);
  });
  it('returns 1 one day after Genesis', () => {
    const d = new Date(GENESIS.getTime() + 86400 * 1000);
    expect(daysSinceGenesis(d)).toBeCloseTo(1, 5);
  });
});

describe('b1mPrice — sanity values from spec Appendix A', () => {
  const cases: [string, number][] = [
    ['2026-05-01', 128_600],
    ['2026-12-31', 159_300],
    ['2028-06-30', 249_300],
    ['2028-12-31', 287_000],
    ['2029-12-31', 378_000],
    ['2030-12-31', 491_300],
    ['2031-12-31', 630_000],
    ['2034-01-15', 1_000_000],
  ];
  it.each(cases)('on %s ≈ $%i', (dateStr, expected) => {
    const got = b1mPrice(new Date(dateStr + 'T00:00:00Z'));
    expect(within5Pct(got, expected)).toBe(true);
  });
});

describe('b1mPrice — guards', () => {
  it('returns NaN for dates ≤ Genesis', () => {
    expect(b1mPrice(GENESIS)).toBeNaN();
    expect(b1mPrice(new Date('2008-01-01T00:00:00Z'))).toBeNaN();
  });
});

describe('santostasiPrice', () => {
  it('returns a positive number for dates > Genesis', () => {
    const v = santostasiPrice(new Date('2026-05-01T00:00:00Z'));
    expect(v).toBeGreaterThan(0);
    expect(Number.isFinite(v)).toBe(true);
  });
});

describe('customPrice', () => {
  it('matches b1m formula when given B1M coefficients with years time_unit', () => {
    const date = new Date('2026-05-01T00:00:00Z');
    const got = customPrice(date, {
      coefficient: 10 ** -1.847796462,
      exponent: 5.616314045,
      time_unit: 'years',
    });
    const b1m = b1mPrice(date);
    expect(within5Pct(got, b1m)).toBe(true);
  });
});

describe('b1mCAGRAt', () => {
  it('on May 1 2026 ≈ 36–37% (matches b1m.io reported ~36.7%)', () => {
    const cagr = b1mCAGRAt(new Date('2026-05-01T00:00:00Z'));
    expect(cagr).toBeGreaterThan(0.34);
    expect(cagr).toBeLessThan(0.40);
  });
  it('decreases as the trendline ages', () => {
    const early = b1mCAGRAt(new Date('2026-05-01T00:00:00Z'));
    const later = b1mCAGRAt(new Date('2030-05-01T00:00:00Z'));
    expect(later).toBeLessThan(early);
  });
  it('returns NaN at or before Genesis', () => {
    expect(b1mCAGRAt(GENESIS)).toBeNaN();
    expect(b1mCAGRAt(new Date('2008-01-01T00:00:00Z'))).toBeNaN();
  });
});

describe('b1mDateForPrice', () => {
  it('inverse of b1mPrice — round-trip on Jun 30 2028 ($249K trend)', () => {
    const original = new Date('2028-06-30T00:00:00Z');
    const price = b1mPrice(original);
    const recovered = b1mDateForPrice(price);
    const dayDiff = Math.abs(
      (recovered.getTime() - original.getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(dayDiff).toBeLessThan(1);
  });

  // Milestone-date assertions deliberately use ±2-month bands. Our constants
  // come from the published B1M coefficients (10^-1.847796462, 5.616314045);
  // b1m.io's dashboard appears to use very slightly different precision, so
  // dates land within a few weeks of theirs. The bands fail loudly if the
  // gap ever widens to more than a couple of months in either direction.

  function withinMonths(actual: Date, expectedISO: string, months: number): boolean {
    const tol = months * 30 * 86_400_000;
    const expected = new Date(expectedISO + 'T00:00:00Z').getTime();
    return Math.abs(actual.getTime() - expected) <= tol;
  }

  it('$1M trendline near b1m.io Jan 2 2034 (within 2 months)', () => {
    expect(withinMonths(b1mDateForPrice(1_000_000), '2034-01-02', 2)).toBe(true);
  });

  it('$1M @ 3× near b1m.io Aug 3 2029 (within 2 months)', () => {
    expect(withinMonths(b1mDateForPrice(1_000_000, 3), '2029-08-03', 2)).toBe(true);
  });

  it('$10M trendline near b1m.io Nov 3 2046 (within 4 months)', () => {
    // Larger band: small log-coefficient drift compounds further out in time.
    expect(withinMonths(b1mDateForPrice(10_000_000), '2046-11-03', 4)).toBe(true);
  });

  it('$10M @ 3× near b1m.io Feb 3 2040 (within 3 months)', () => {
    expect(withinMonths(b1mDateForPrice(10_000_000, 3), '2040-02-03', 3)).toBe(true);
  });

  it('returns Invalid Date for non-positive price or multiplier', () => {
    expect(Number.isNaN(b1mDateForPrice(0).getTime())).toBe(true);
    expect(Number.isNaN(b1mDateForPrice(-1).getTime())).toBe(true);
    expect(Number.isNaN(b1mDateForPrice(1_000_000, 0).getTime())).toBe(true);
  });
});
