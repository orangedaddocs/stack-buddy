import type { CustomModel, BtcModelType, BtcModelConfig } from '../types.js';

export const GENESIS = new Date('2009-01-03T00:00:00Z');
const MS_PER_DAY = 86_400_000;

// B1M (b1m.io) Power Law parameters. The R² and log-volatility figures are
// reported by b1m.io for the same regression — we surface them as model
// metadata in the Models tab. Source: https://b1m.io/
export const B1M_LOG_COEFFICIENT = -1.847796462;
export const B1M_SLOPE = 5.616314045;
export const B1M_R_SQUARED = 0.9565;
export const B1M_LOG_VOLATILITY = 0.2;

export function daysSinceGenesis(date: Date): number {
  return (date.getTime() - GENESIS.getTime()) / MS_PER_DAY;
}

export function b1mPrice(date: Date): number {
  const days = daysSinceGenesis(date);
  if (days <= 0) return NaN;
  const years = days / 365.25;
  return 10 ** B1M_LOG_COEFFICIENT * years ** B1M_SLOPE;
}

/**
 * Year-over-year growth rate of the B1M trendline at a given date.
 *
 * For Price = A · t^n with t in years, P(t+1)/P(t) = (1 + 1/t)^n,
 * so the next-year discrete growth rate is (1 + 1/t)^n − 1. This is
 * the natural "CAGR" people want for a planning trendline at a point
 * in time — not a true derivative, but the right number to display
 * next to a current price.
 */
export function b1mCAGRAt(date: Date): number {
  const years = daysSinceGenesis(date) / 365.25;
  if (!Number.isFinite(years) || years <= 0) return NaN;
  return (1 + 1 / years) ** B1M_SLOPE - 1;
}

/**
 * Inverse of b1mPrice — returns the date when the trendline crosses
 * `targetPrice`. If `multiplier` is supplied (e.g. 3 for 3× trend),
 * returns the date when the multiplier path crosses targetPrice instead;
 * equivalent to solving for trend = targetPrice / multiplier.
 */
export function b1mDateForPrice(targetPrice: number, multiplier = 1): Date {
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return new Date(NaN);
  if (!Number.isFinite(multiplier) || multiplier <= 0) return new Date(NaN);
  const trendPrice = targetPrice / multiplier;
  // Solve trendPrice = A · years^n  →  years = (trendPrice / A)^(1/n)
  const A = 10 ** B1M_LOG_COEFFICIENT;
  const years = (trendPrice / A) ** (1 / B1M_SLOPE);
  if (!Number.isFinite(years) || years <= 0) return new Date(NaN);
  const ms = GENESIS.getTime() + years * 365.25 * MS_PER_DAY;
  return new Date(ms);
}

export function santostasiPrice(date: Date): number {
  const days = daysSinceGenesis(date);
  if (days <= 0) return NaN;
  return 10 ** -16.493 * days ** 5.68;
}

export function customPrice(date: Date, m: CustomModel): number {
  const days = daysSinceGenesis(date);
  if (days <= 0) return NaN;
  const t = m.time_unit === 'years' ? days / 365.25 : days;
  return m.coefficient * t ** m.exponent;
}

export function powerLawPrice(
  date: Date,
  modelType: BtcModelType,
  custom: CustomModel | null,
): number {
  if (modelType === 'b1m') return b1mPrice(date);
  if (modelType === 'santostasi') return santostasiPrice(date);
  if (modelType === 'custom') {
    if (!custom) return NaN;
    return customPrice(date, custom);
  }
  // 'catch_up' is handled by catchUp.ts; this function shouldn't be called for it.
  return NaN;
}

export function basePowerLawPrice(date: Date, cfg: BtcModelConfig): number {
  return powerLawPrice(date, cfg.base_model as BtcModelType, cfg.custom);
}
