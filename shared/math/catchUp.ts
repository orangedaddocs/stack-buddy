import type { BtcModelConfig } from '../types.js';
import { b1mPrice, basePowerLawPrice } from './powerLaw.js';

const MS_PER_DAY = 86_400_000;

export const DEFAULT_SPOT_ANCHOR_DATE = '2026-04-29';
export const DEFAULT_SPOT_ANCHOR_PRICE = 75_800;
export const DEFAULT_CATCH_UP_DATE = '2028-06-30';
export const CATCH_UP_POWER_LAW_MODEL_ID = 'catch_up_power_law_b1m_1x_2028-06-30';

export type PlanningBtcPriceDetails = {
  date_iso: string;
  btc_price_used: number;
  power_law_price: number;
  multiplier: number;
  model_id: string;
  spot_anchor_date: string;
  spot_anchor_price: number;
  catchup_date: string;
  catchup_price: number;
};

export function buildPlanningModelSettings(args?: {
  spotAnchorDate?: string;
  spotAnchorPrice?: number;
  catchupDate?: string;
}): BtcModelConfig {
  return {
    type: 'catch_up',
    current_price:
      args?.spotAnchorPrice && Number.isFinite(args.spotAnchorPrice) && args.spotAnchorPrice > 0
        ? args.spotAnchorPrice
        : DEFAULT_SPOT_ANCHOR_PRICE,
    current_date: args?.spotAnchorDate ?? DEFAULT_SPOT_ANCHOR_DATE,
    catch_up_date: args?.catchupDate ?? DEFAULT_CATCH_UP_DATE,
    catch_up_multiplier: 1.0,
    post_catchup_multiplier: 1.0,
    base_model: 'b1m',
    custom: null,
  };
}

export function getPlanningBtcPrice(date: Date, cfg: BtcModelConfig): number {
  if (cfg.type !== 'catch_up') return basePowerLawPrice(date, cfg);
  return getPlanningBtcPriceDetails(date, cfg).btc_price_used;
}

export function getPlanningBtcPriceDetails(
  date: Date,
  cfg: BtcModelConfig,
): PlanningBtcPriceDetails {
  const start = new Date(cfg.current_date + 'T00:00:00Z');
  const target = new Date(cfg.catch_up_date + 'T00:00:00Z');
  const powerLawPrice = b1mPrice(date);
  const targetPowerLawPrice = b1mPrice(target);
  const targetPrice = targetPowerLawPrice * cfg.catch_up_multiplier;

  let btcPriceUsed: number;
  const totalDays = (target.getTime() - start.getTime()) / MS_PER_DAY;

  if (date.getTime() < start.getTime()) {
    btcPriceUsed = NaN;
  } else if (date.getTime() <= target.getTime()) {
    if (totalDays <= 0) {
      btcPriceUsed = cfg.current_price;
    } else {
      const dailyGrowth = (targetPrice / cfg.current_price) ** (1 / totalDays);
      const elapsed = (date.getTime() - start.getTime()) / MS_PER_DAY;
      btcPriceUsed = cfg.current_price * dailyGrowth ** elapsed;
    }
  } else {
    btcPriceUsed = powerLawPrice * cfg.post_catchup_multiplier;
  }

  return {
    date_iso: isoDateUTC(date),
    btc_price_used: btcPriceUsed,
    power_law_price: powerLawPrice,
    multiplier:
      Number.isFinite(powerLawPrice) && powerLawPrice > 0
        ? btcPriceUsed / powerLawPrice
        : NaN,
    model_id: CATCH_UP_POWER_LAW_MODEL_ID,
    spot_anchor_date: cfg.current_date,
    spot_anchor_price: cfg.current_price,
    catchup_date: cfg.catch_up_date,
    catchup_price: targetPrice,
  };
}

export function catchUpPrice(date: Date, cfg: BtcModelConfig): number {
  return getPlanningBtcPrice(date, cfg);
}

export function pricePath(date: Date, cfg: BtcModelConfig): number {
  if (cfg.type === 'catch_up') return getPlanningBtcPrice(date, cfg);
  return basePowerLawPrice(date, cfg);
}

function isoDateUTC(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}
