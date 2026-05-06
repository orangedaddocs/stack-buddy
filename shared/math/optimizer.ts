/**
 * Distribute `totalDollars` across `months` months according to per-year
 * `weights`. The first weight covers year 1, the second year 2, etc.
 *
 * Allocation is computed by expanding weights to a per-month vector (each
 * year's weight repeated for its 12 months) and normalizing over the actual
 * span. This means:
 *   - Partial horizons (months < 12 * weights.length): trailing weights are
 *     ignored; the remaining mass is renormalized over the months in scope.
 *   - Long horizons (months > 12 * weights.length): the last weight repeats
 *     across the trailing months; renormalization still produces totals
 *     summing to `totalDollars`.
 *
 * Total deployed always equals `totalDollars` (within floating-point error).
 */
export function frontLoadAllocation(
  totalDollars: number,
  months: number,
  weights: number[],
): number[] {
  if (months <= 0) return [];
  if (totalDollars <= 0 || weights.length === 0) {
    return new Array(months).fill(0);
  }
  const perMonth: number[] = new Array(months);
  let sum = 0;
  for (let m = 0; m < months; m++) {
    const yIdx = Math.min(Math.floor(m / 12), weights.length - 1);
    const w = Math.max(0, weights[yIdx]!);
    perMonth[m] = w;
    sum += w;
  }
  if (!Number.isFinite(sum) || sum <= 0) {
    return new Array(months).fill(0);
  }
  return perMonth.map((w) => totalDollars * (w / sum));
}
