import type { YearAssumptions } from '../types.js';

export function resolveBurnAnnual(
  year: YearAssumptions,
  baseYear: YearAssumptions,
  inflationRate: number,
): number {
  if (year.locks.includes('burn_annual')) {
    return year.burn_annual;
  }
  const delta = year.year - baseYear.year;
  return baseYear.burn_annual * Math.pow(1 + inflationRate, delta);
}

export function resolveBurnApplied(
  year: YearAssumptions,
  baseYear: YearAssumptions,
  inflationRate: number,
): number {
  const annual = resolveBurnAnnual(year, baseYear, inflationRate);
  return annual * (year.burn_active_months / 12);
}

export type CashFlow = {
  preTax: number;
  taxes: number;
  afterTax: number;
  burnAnnual: number;
  burnApplied: number;
  reserve: number;
  available: number;
  shortfall: number;
};

export type CashUsageLabel =
  | 'comfortable'
  | 'manageable'
  | 'tight'
  | 'very_tight'
  | 'unfunded';

export function availableForBTC(
  year: YearAssumptions,
  baseYear: YearAssumptions,
  inflationRate: number,
): CashFlow {
  const preTax = year.profit;
  const taxes = year.estimated_taxes;
  const afterTax = preTax - taxes;
  const burnAnnual = resolveBurnAnnual(year, baseYear, inflationRate);
  const burnApplied = resolveBurnApplied(year, baseYear, inflationRate);
  const reserve = year.cash_reserve;
  const net = afterTax - burnApplied - reserve;
  const available = Math.max(0, net);
  const shortfall = Math.min(0, net);
  return { preTax, taxes, afterTax, burnAnnual, burnApplied, reserve, available, shortfall };
}

export function cashUsageLabel(usageRate: number): CashUsageLabel {
  if (!Number.isFinite(usageRate)) return 'unfunded';
  if (usageRate <= 0.6) return 'comfortable';
  if (usageRate <= 0.8) return 'manageable';
  if (usageRate <= 0.92) return 'tight';
  if (usageRate <= 1.0) return 'very_tight';
  return 'unfunded';
}

export function cashUsageLabelText(label: CashUsageLabel): string {
  switch (label) {
    case 'comfortable':
      return 'Comfortable';
    case 'manageable':
      return 'Manageable';
    case 'tight':
      return 'Tight';
    case 'very_tight':
      return 'Very tight';
    case 'unfunded':
      return 'Unfunded';
  }
}
