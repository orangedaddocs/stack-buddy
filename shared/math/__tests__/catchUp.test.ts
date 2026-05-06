import { describe, it, expect } from 'vitest';
import {
  buildPlanningModelSettings,
  catchUpPrice,
  getPlanningBtcPrice,
  getPlanningBtcPriceDetails,
} from '../catchUp.js';
import { b1mPrice } from '../powerLaw.js';
import type { BtcModelConfig } from '../../types.js';

const cfg: BtcModelConfig = {
  type: 'catch_up',
  current_price: 78000,
  current_date: '2026-05-01',
  catch_up_date: '2028-06-30',
  catch_up_multiplier: 1.0,
  post_catchup_multiplier: 1.0,
  base_model: 'b1m',
  custom: null,
};

describe('catchUpPrice', () => {
  it('returns current_price on current_date', () => {
    const d = new Date('2026-05-01T00:00:00Z');
    expect(catchUpPrice(d, cfg)).toBeCloseTo(78000, 0);
  });

  it('returns b1m * multiplier on catch_up_date', () => {
    const d = new Date('2028-06-30T00:00:00Z');
    const expected = b1mPrice(d) * cfg.catch_up_multiplier;
    expect(catchUpPrice(d, cfg)).toBeCloseTo(expected, -1);
  });

  it('tracks b1m * post_catchup_multiplier after catch_up_date', () => {
    const d = new Date('2030-01-01T00:00:00Z');
    const expected = b1mPrice(d) * cfg.post_catchup_multiplier;
    expect(catchUpPrice(d, cfg)).toBeCloseTo(expected, -1);
  });

  it('produces a smooth CAGR between current_date and catch_up_date', () => {
    const mid = new Date('2027-05-15T00:00:00Z');
    const v = catchUpPrice(mid, cfg);
    expect(v).toBeGreaterThan(78000);
    expect(v).toBeLessThan(b1mPrice(new Date('2028-06-30T00:00:00Z')));
  });

  it('returns NaN for dates before current_date', () => {
    const d = new Date('2026-04-30T00:00:00Z');
    expect(catchUpPrice(d, cfg)).toBeNaN();
  });
});

describe('getPlanningBtcPrice — canonical Catch-Up Power Law', () => {
  const planningCfg = buildPlanningModelSettings({
    spotAnchorDate: '2026-04-29',
    spotAnchorPrice: 75_800,
  });

  it('starts at the spot anchor price on the spot anchor date', () => {
    const d = new Date('2026-04-29T00:00:00Z');
    expect(getPlanningBtcPrice(d, planningCfg)).toBeCloseTo(75_800, 8);
  });

  it('converges to the B1M 1.0x trendline on catch-up date', () => {
    const d = new Date('2028-06-30T00:00:00Z');
    expect(getPlanningBtcPrice(d, planningCfg)).toBeCloseTo(249_000, -3);
    expect(getPlanningBtcPrice(d, planningCfg)).toBeCloseTo(b1mPrice(d), 6);
  });

  it('tracks B1M 1.0x after catch-up date', () => {
    const d = new Date('2030-12-31T00:00:00Z');
    expect(getPlanningBtcPrice(d, planningCfg)).toBeCloseTo(b1mPrice(d), 8);
  });

  it('reports price details needed by audit rows', () => {
    const details = getPlanningBtcPriceDetails(
      new Date('2026-05-01T00:00:00Z'),
      planningCfg,
    );
    expect(details.model_id).toBe('catch_up_power_law_b1m_1x_2028-06-30');
    expect(details.spot_anchor_date).toBe('2026-04-29');
    expect(details.spot_anchor_price).toBe(75_800);
    expect(details.catchup_date).toBe('2028-06-30');
    expect(details.power_law_price).toBeGreaterThan(128_000);
    expect(details.power_law_price).toBeLessThan(130_000);
    expect(details.multiplier).toBeGreaterThan(0.58);
    expect(details.multiplier).toBeLessThan(0.61);
  });
});
