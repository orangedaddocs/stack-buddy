import { describe, expect, it } from 'vitest';
import { parsePlanConstraints } from '../planConstraints.js';

describe('parsePlanConstraints — the bug a skeptical user will trip into first', () => {
  it('picks the per-month amount over an unrelated bonus dollar figure', () => {
    // The classic failure case Codex called out. The earlier regex picked up
    // "$10K bonus" as the cap because it scanned for the first $-prefixed
    // amount before checking per-month patterns.
    const c = parsePlanConstraints('I have a $10K bonus, max $3K/month');
    expect(c.maxMonthlyContribution).toBe(3_000);
    expect(c.preferredKind).toBe('lump_sums');
  });

  it('parses an explicit $X/month even without a $ prefix', () => {
    const c = parsePlanConstraints('Cap recurring at 3000 per month');
    expect(c.maxMonthlyContribution).toBe(3_000);
  });

  it('handles K-suffixed monthly amounts', () => {
    const c = parsePlanConstraints('No more than $2.5K/mo for DCA');
    expect(c.maxMonthlyContribution).toBe(2_500);
    expect(c.preferredKind).toBe('monthly');
  });

  it('handles "monthly" word form', () => {
    const c = parsePlanConstraints('1500 monthly is the limit');
    expect(c.maxMonthlyContribution).toBe(1_500);
  });

  it('falls back to limit-adjacent dollar amount when no per-month phrasing', () => {
    const c = parsePlanConstraints('Max $3K');
    expect(c.maxMonthlyContribution).toBe(3_000);
  });

  it('does NOT infer a cap when the note is just a dollar figure with no limit word', () => {
    const c = parsePlanConstraints('I have a $10K bonus coming in March');
    expect(c.maxMonthlyContribution).toBeUndefined();
    // It still picks up the lump_sums hint from "bonus".
    expect(c.preferredKind).toBe('lump_sums');
  });

  it('does NOT pair a limit word with a far-away dollar amount', () => {
    // "max" is far from "$10000". Without the proximity guard the old code
    // would have paired them and called $10K the cap.
    const c = parsePlanConstraints(
      'I want to max out the front-load early. Bonus is $10000 in Q3.',
    );
    expect(c.maxMonthlyContribution).toBeUndefined();
  });

  it('echoes the cap into maxUpfrontMonthly when the user mentions front-loading', () => {
    const c = parsePlanConstraints('Front-load with $5K/month max');
    expect(c.maxMonthlyContribution).toBe(5_000);
    expect(c.maxUpfrontMonthly).toBe(5_000);
    expect(c.preferredKind).toBe('front_load');
  });

  it('keeps maxUpfrontMonthly undefined for non-front-load shapes', () => {
    const c = parsePlanConstraints('Steady DCA at $2K/month max');
    expect(c.maxMonthlyContribution).toBe(2_000);
    expect(c.maxUpfrontMonthly).toBeUndefined();
    expect(c.preferredKind).toBe('monthly');
  });

  it('returns empty constraints for empty / whitespace input', () => {
    expect(parsePlanConstraints('')).toEqual({});
    expect(parsePlanConstraints('   \n  ')).toEqual({});
  });

  it('handles "$3,000/mo" with a comma', () => {
    const c = parsePlanConstraints('Cap of $3,000/mo');
    expect(c.maxMonthlyContribution).toBe(3_000);
  });

  it('picks per-month even when bonus is mentioned first with a larger figure', () => {
    const c = parsePlanConstraints(
      'I expect a $20K tax refund in April. Otherwise no more than 1500/month.',
    );
    expect(c.maxMonthlyContribution).toBe(1_500);
    expect(c.preferredKind).toBe('lump_sums'); // "tax refund" wins the kind hint
  });
});

describe('parsePlanConstraints — negation handling', () => {
  // Without negation awareness, "no dated buys, just monthly DCA" used to
  // route the user to lump_sums because the keyword "dated buy" matched
  // first in parsePreferredKind. The UI then applied the literal opposite
  // of what the user wrote.

  it('routes to monthly when the user explicitly rejects dated buys', () => {
    const c = parsePlanConstraints('No dated buys, just monthly DCA');
    expect(c.preferredKind).toBe('monthly');
  });

  it('routes to monthly when the user says "no lump sums"', () => {
    const c = parsePlanConstraints('No lump sums, only DCA');
    expect(c.preferredKind).toBe('monthly');
  });

  it('routes to monthly when the user says "without a bonus"', () => {
    const c = parsePlanConstraints('Steady monthly DCA without any bonuses');
    expect(c.preferredKind).toBe('monthly');
  });

  it('routes to lump_sums when the user explicitly rejects monthly DCA', () => {
    const c = parsePlanConstraints('Skip monthly DCA, just lump sums on dates I pick');
    expect(c.preferredKind).toBe('lump_sums');
  });

  it('routes to lump_sums when the user says "no front-load, use a custom mix"', () => {
    const c = parsePlanConstraints('No front-load. Custom mix with bonuses.');
    expect(c.preferredKind).toBe('lump_sums');
  });

  it('handles "don\'t want lump sums"', () => {
    const c = parsePlanConstraints("I don't want lump sums, monthly is fine");
    expect(c.preferredKind).toBe('monthly');
  });

  it('still picks lump_sums when "no" is in an unrelated clause', () => {
    // "no more than" is a limit phrase, not a negation of lump_sums.
    const c = parsePlanConstraints('Tax refund of $5K. No more than 2000/month otherwise.');
    expect(c.preferredKind).toBe('lump_sums');
    expect(c.maxMonthlyContribution).toBe(2_000);
  });

  it('still picks front_load when "no" appears far from the keyword', () => {
    // "no monthly" is the negation; "front-load" is far away and not negated.
    const c = parsePlanConstraints('Front-load early. No monthly cap.');
    expect(c.preferredKind).toBe('front_load');
  });
});
