import {
  b1mPrice,
  b1mCAGRAt,
  B1M_SLOPE,
  B1M_R_SQUARED,
  B1M_LOG_VOLATILITY,
} from '../../../shared/math/powerLaw.js';
import { catchUpPrice } from '../../../shared/math/catchUp.js';
import type { BtcModelConfig } from '../../../shared/types.js';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function utcMonthYearLabel(d: Date): string {
  return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function utcIsoDate(d: Date): string {
  // YYYY-MM-DD in UTC, no time portion.
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export const CATCH_UP_DATE = '2028-06-30';

export type DatedPrice = {
  date: string;
  iso: string;
  price: number;
};

export type PowerLawSnapshot = {
  today: Date;
  spotUSD: number | null;
  modelPriceUSD: number;
  multiplier: number | null;
  catchUpDate: string;
  catchUpPriceUSD: number;
  /** B1M reported regression metadata. */
  parameters: {
    slope: number;
    rSquared: number;
    logVolatility: number;
    cagrToday: number;
  };
  /** Selected trendline projections. */
  projections: DatedPrice[];
};

const PROJECTION_DATES = [
  '2026-05-01',
  '2028-06-30',
  '2028-12-31',
  '2029-12-31',
  '2030-12-31',
  '2031-12-31',
];

/**
 * Build a snapshot of the Catch-Up Power Law model state for a given
 * BTC spot price. Pure function — `today` and `spotUSD` are inputs so
 * the same snapshot can be tested deterministically.
 */
export function buildPowerLawSnapshot(args: {
  today?: Date;
  spotUSD: number | null;
}): PowerLawSnapshot {
  const today = args.today ?? new Date();
  const spotUSD = args.spotUSD;
  const modelPriceUSD = b1mPrice(today);
  const multiplier =
    spotUSD !== null && Number.isFinite(spotUSD) && Number.isFinite(modelPriceUSD) && modelPriceUSD > 0
      ? spotUSD / modelPriceUSD
      : null;

  const catchUpCfg: BtcModelConfig = {
    type: 'catch_up',
    current_price: spotUSD ?? modelPriceUSD,
    current_date: utcIsoDate(today),
    catch_up_date: CATCH_UP_DATE,
    catch_up_multiplier: 1.0,
    post_catchup_multiplier: 1.0,
    base_model: 'b1m',
    custom: null,
  };
  const catchUpPriceUSD = catchUpPrice(new Date(CATCH_UP_DATE + 'T00:00:00Z'), catchUpCfg);

  const projections: DatedPrice[] = PROJECTION_DATES.map((iso) => {
    const d = new Date(iso + 'T00:00:00Z');
    return {
      date: utcMonthYearLabel(d),
      iso,
      price: b1mPrice(d),
    };
  });

  return {
    today,
    spotUSD,
    modelPriceUSD,
    multiplier,
    catchUpDate: CATCH_UP_DATE,
    catchUpPriceUSD,
    parameters: {
      slope: B1M_SLOPE,
      rSquared: B1M_R_SQUARED,
      logVolatility: B1M_LOG_VOLATILITY,
      cagrToday: b1mCAGRAt(today),
    },
    projections,
  };
}
