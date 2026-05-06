/**
 * Pure helpers for the NumberInput component(s). Kept here so the
 * parsing/clamping logic can be unit-tested without React.
 *
 * Two responsibilities:
 *   1. parseNumeric — turn a typed string into a number, accepting the
 *      shapes a user is likely to actually type: "1,000", "1_000", "$2K",
 *      "2.5m", as well as the bare "1234.56" the existing component handles.
 *   2. clamp — bound the result to [min, max] when those are provided.
 *
 * Design rules (per round-of-work brief):
 *   - Don't over-engineer. Magnitude suffixes are accepted only when the
 *     remaining string is unambiguous; ambiguous input falls back to bare
 *     numeric parsing or NaN.
 *   - Negatives are stripped at clamp time when min ≥ 0; that's how the
 *     consumer expresses "this field can't be negative" without any extra
 *     state.
 *   - Empty / partial input ("", "-", "."), like the existing component
 *     treated, is reported as null so the caller decides whether to write
 *     0 or hold the previous value.
 */

const MAGNITUDE_SUFFIXES: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
};

/**
 * Try to parse a free-form numeric string.
 *
 * Returns:
 *   - a finite number (positive, negative, or zero) when the input is
 *     unambiguously numeric, including the magnitude shapes "$2K",
 *     "2.5m", "1,000", "1_000".
 *   - null when the input is empty or only the partial pieces a user
 *     types mid-edit ("-", ".", "$").
 *   - null when the input contains characters we can't interpret without
 *     guessing.
 *
 * The caller decides what to do with null. The existing NumberInput
 * treats it as "write 0 to state".
 */
export function parseNumeric(raw: string): number | null {
  // Strip whitespace and a single leading currency symbol up front. Anything
  // else with letters has to be a magnitude suffix to be valid.
  const trimmed = raw.trim().replace(/^\$/, '').replace(/\s+/g, '');
  if (trimmed === '') return null;
  if (trimmed === '-' || trimmed === '.' || trimmed === '-.') return null;

  // Pull off a single trailing magnitude letter if present. "2K", "2.5m", "$2B".
  // Anything more complicated (e.g. "2KK") drops to the bare-numeric path
  // and will fail.
  const match = trimmed.match(/^(-?[\d._,]+)([kKmMbB])?$/);
  if (!match) return null;
  const numeric = match[1].replace(/[_,]/g, '');
  const suffix = match[2]?.toLowerCase();

  // Reject "1.2.3" or other multi-dot junk before letting Number coerce it.
  if ((numeric.match(/\./g)?.length ?? 0) > 1) return null;

  const n = Number(numeric);
  if (!Number.isFinite(n)) return null;
  if (suffix && MAGNITUDE_SUFFIXES[suffix]) return n * MAGNITUDE_SUFFIXES[suffix];
  return n;
}

/**
 * Clamp a number to [min, max]. Either bound may be omitted.
 *
 * NaN passes through unchanged so the caller can detect it; the
 * NumberInput consumer never writes NaN to state, but we don't want
 * to swallow it silently here.
 */
export function clamp(n: number, min?: number, max?: number): number {
  if (!Number.isFinite(n)) return n;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}
