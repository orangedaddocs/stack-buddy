import { describe, it, expect } from 'vitest';
import { buildPlanningModelSettings, getPlanningBtcPriceDetails } from '../catchUp.js';

/**
 * "The audit IS the math" reconciliation lock.
 *
 * The audit packet that goes to ChatGPT/Claude/etc. carries a literal
 * formula string ("Price = 10^(-1.847796462) * (yearsSinceGenesis)^5.616314045")
 * and the engine's own price columns. If the formula and the columns ever
 * drift, the whole "verify it yourself" promise breaks.
 *
 * This test re-implements the formula from raw constants — no imports
 * from powerLaw.ts, no shared helpers — and asserts agreement with
 * `getPlanningBtcPriceDetails` at three points:
 *
 *   1. Mid catch-up window (2026-12-15) — geometric interpolation regime.
 *   2. Catch-up moment (2028-06-30) — must equal the trendline exactly.
 *   3. Post catch-up (2030-06-15) — must follow the trendline.
 *
 * Tolerance: $1. Anything looser hides drift; tighter risks float noise.
 */

// Constants from the b1m.io regression. Duplicated on purpose so this test
// fails if powerLaw.ts ever changes them silently.
const B1M_LOG_COEFFICIENT = -1.847796462;
const B1M_SLOPE = 5.616314045;
const GENESIS_MS = Date.UTC(2009, 0, 3); // 2009-01-03
const MS_PER_DAY = 86_400_000;

function handB1mPrice(isoDate: string): number {
  const ms = new Date(isoDate + 'T00:00:00Z').getTime();
  const days = (ms - GENESIS_MS) / MS_PER_DAY;
  const years = days / 365.25;
  return 10 ** B1M_LOG_COEFFICIENT * years ** B1M_SLOPE;
}

function handCatchUpPrice(args: {
  date: string;
  spotAnchorDate: string;
  spotAnchorPrice: number;
  catchupDate: string;
}): number {
  const dMs = new Date(args.date + 'T00:00:00Z').getTime();
  const startMs = new Date(args.spotAnchorDate + 'T00:00:00Z').getTime();
  const targetMs = new Date(args.catchupDate + 'T00:00:00Z').getTime();
  const targetTrend = handB1mPrice(args.catchupDate);
  if (dMs <= targetMs) {
    const totalDays = (targetMs - startMs) / MS_PER_DAY;
    const elapsed = (dMs - startMs) / MS_PER_DAY;
    const dailyGrowth = (targetTrend / args.spotAnchorPrice) ** (1 / totalDays);
    return args.spotAnchorPrice * dailyGrowth ** elapsed;
  }
  return handB1mPrice(args.date);
}

const ANCHOR = {
  spotAnchorDate: '2026-04-29',
  spotAnchorPrice: 75_800,
  catchupDate: '2028-06-30',
};

describe('audit row reconciliation — formula vs engine, within $1', () => {
  const cfg = buildPlanningModelSettings({
    spotAnchorDate: ANCHOR.spotAnchorDate,
    spotAnchorPrice: ANCHOR.spotAnchorPrice,
    catchupDate: ANCHOR.catchupDate,
  });

  it('mid catch-up window (2026-12-15): both columns match the formula', () => {
    const iso = '2026-12-15';
    const d = new Date(iso + 'T00:00:00Z');
    const details = getPlanningBtcPriceDetails(d, cfg);

    const handTrend = handB1mPrice(iso);
    const handPrice = handCatchUpPrice({
      date: iso,
      spotAnchorDate: ANCHOR.spotAnchorDate,
      spotAnchorPrice: ANCHOR.spotAnchorPrice,
      catchupDate: ANCHOR.catchupDate,
    });

    expect(Math.abs(details.power_law_price - handTrend)).toBeLessThan(1);
    expect(Math.abs(details.btc_price_used - handPrice)).toBeLessThan(1);
    // Sanity: in this window we are below trendline, so multiplier < 1.
    expect(details.multiplier).toBeLessThan(1);
    expect(details.multiplier).toBeGreaterThan(0);
  });

  it('catch-up moment (2028-06-30): btc_price_used equals trendline exactly', () => {
    const iso = '2028-06-30';
    const d = new Date(iso + 'T00:00:00Z');
    const details = getPlanningBtcPriceDetails(d, cfg);

    const handTrend = handB1mPrice(iso);

    expect(Math.abs(details.power_law_price - handTrend)).toBeLessThan(1);
    expect(Math.abs(details.btc_price_used - handTrend)).toBeLessThan(1);
    // Multiplier must be 1 at the catch-up moment with catch_up_multiplier = 1.0.
    expect(Math.abs(details.multiplier - 1)).toBeLessThan(1e-9);
  });

  it('post catch-up (2030-06-15): both columns track the trendline', () => {
    const iso = '2030-06-15';
    const d = new Date(iso + 'T00:00:00Z');
    const details = getPlanningBtcPriceDetails(d, cfg);

    const handTrend = handB1mPrice(iso);

    expect(Math.abs(details.power_law_price - handTrend)).toBeLessThan(1);
    expect(Math.abs(details.btc_price_used - handTrend)).toBeLessThan(1);
    expect(Math.abs(details.multiplier - 1)).toBeLessThan(1e-9);
  });
});
