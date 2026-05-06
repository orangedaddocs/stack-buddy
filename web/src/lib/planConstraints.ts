import type { PlanStrategyKind } from '../../../shared/types.js';

export type PlanConstraints = {
  maxMonthlyContribution?: number;
  maxUpfrontMonthly?: number;
  preferredKind?: PlanStrategyKind;
};

/**
 * Best-effort parse of free-form user notes into structured plan constraints.
 *
 * This is a placeholder until the advisor's tool schema returns parsed
 * constraints directly. The two failure modes we explicitly guard against:
 *
 * 1. Picking the wrong dollar amount as the monthly cap when the note
 *    contains multiple amounts (e.g. "$10K bonus, max $3K/month" must parse
 *    as $3K/month, not $10K).
 * 2. Inferring a cap when the note only mentions an amount with no limit
 *    word (e.g. "I have a $10K bonus" must not become a $10K monthly cap).
 */
export function parsePlanConstraints(notes: string): PlanConstraints {
  const text = notes.trim();
  if (!text) return {};

  const lower = text.toLowerCase();
  const preferredKind = parsePreferredKind(lower);
  const mentionsFrontLoad =
    preferredKind === 'front_load' ||
    /(front[-\s]?load|front[-\s]?loaded|up\s*front|upfront|early)/i.test(lower);

  const limitRe = /(most|max|maximum|cap|limit|no more than|can't|cannot|only|can spend)/i;
  const mentionsLimit = limitRe.test(lower);

  const constraints: PlanConstraints = {};
  if (preferredKind) constraints.preferredKind = preferredKind;

  // Step 1: prefer a per-month-shaped amount anywhere in the text. This wins
  // even if it appears later than a non-monthly dollar figure.
  const perMonth = matchPerMonthAmount(text);
  if (perMonth !== null) {
    constraints.maxMonthlyContribution = perMonth;
    if (mentionsFrontLoad) constraints.maxUpfrontMonthly = perMonth;
    return constraints;
  }

  // Step 2: look for a dollar amount that is adjacent (within ~30 chars) to
  // a limit word like "max", "cap", "no more than", etc. Prevents
  // "$10K bonus" from being read as a $10K cap.
  if (!mentionsLimit) return constraints;

  const adjacent = matchLimitAdjacentDollar(text);
  if (adjacent === null) return constraints;

  constraints.maxMonthlyContribution = adjacent;
  if (mentionsFrontLoad) constraints.maxUpfrontMonthly = adjacent;
  return constraints;
}

function matchPerMonthAmount(text: string): number | null {
  const re = /\$?\s*([\d,]+(?:\.\d+)?)\s*([kK])?\s*(?:\/\s*(?:mo|month)|a\s+month|per\s+month|monthly)/i;
  const match = text.match(re);
  if (!match) return null;
  return parseDollarAmount(match[1]!, match[2]);
}

function matchLimitAdjacentDollar(text: string): number | null {
  // The limit word appears within ~30 characters before a $ amount. The
  // 30-char window is short enough that we don't accidentally pair an
  // earlier "max" with a much later dollar figure across an unrelated clause.
  const re =
    /\b(?:most|max(?:imum)?|cap|limit|no\s+more\s+than|can(?:'t|not)|only|can\s+spend)\b[\s\S]{0,30}?\$\s*([\d,]+(?:\.\d+)?)\s*([kK])?/i;
  const match = text.match(re);
  if (!match) return null;
  return parseDollarAmount(match[1]!, match[2]);
}

function parsePreferredKind(lower: string): PlanStrategyKind | undefined {
  // Each kind has a positive cue (`have`) and a negation cue (`not`). A
  // user who writes "no dated buys, just monthly" must NOT be routed to
  // the lump-sums kind because the keyword "dated buy" appears — we have
  // to subtract negated mentions before deciding. Negation cues are bounded
  // to ~20 characters before the keyword so an unrelated "no" earlier in
  // the sentence doesn't accidentally cancel it.
  const has = (positive: RegExp) => positive.test(lower);
  const not = (kw: string) =>
    new RegExp(
      `\\b(?:no|not|without|skip|avoid|don'?t|don't\\s+want|no\\s+more)\\b[^.,;\\n]{0,20}?\\b${kw}`,
      'i',
    ).test(lower);

  const frontPos = /front[-\s]?load|front[-\s]?loaded|up\s*front|upfront/;
  const lumpsPos = /custom|mix|mixed|bonus|tax\s+refund|lump|dated\s+buy/;
  const monthlyPos = /monthly|dca|steady|same\s+amount|flat/;

  const wantsFrontLoad = has(frontPos) && !not('front[-\\s]?load') && !not('upfront');
  const wantsLumps =
    has(lumpsPos) &&
    !not('lump') &&
    !not('dated\\s+buy') &&
    !not('bonus') &&
    !not('tax\\s+refund') &&
    !not('mix');
  const wantsMonthly = has(monthlyPos) && !not('monthly') && !not('dca');

  // Priority: front-load wins if explicitly preferred; then monthly (so
  // "no dated buys, just monthly DCA" routes to monthly correctly); lumps
  // wins last — and only if it wasn't negated.
  if (wantsFrontLoad) return 'front_load';
  if (wantsMonthly) return 'monthly';
  if (wantsLumps) return 'lump_sums';
  return undefined;
}

function parseDollarAmount(value: string, suffix?: string): number {
  const parsed = Number(value.replace(/,/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return suffix?.toLowerCase() === 'k' ? parsed * 1000 : parsed;
}
