import { describe, it, expect } from 'vitest';
import { chooseRecommendedStrategy } from '../recommendedStrategy.js';
import type { EvaluatedPlanStrategy } from '../../components/PlanAIAdvisor.js';
import type { PlanStrategyKind } from '../../../../shared/types.js';

/**
 * Lock-in for Finding B: explicit user click (`selectedKind`) wins over
 * the parser's `preferredKind`. Previously the order was reversed, so a
 * user who typed "Cap monthly DCA at $1,500" and then clicked Custom mix
 * still saw a "Monthly DCA" headline above the Custom-mix chart.
 */

function fakeView(kind: PlanStrategyKind): EvaluatedPlanStrategy {
  return { strategy: { kind } } as unknown as EvaluatedPlanStrategy;
}

describe('chooseRecommendedStrategy', () => {
  const all: EvaluatedPlanStrategy[] = [
    fakeView('front_load'),
    fakeView('monthly'),
    fakeView('lump_sums'),
  ];

  it('returns the strategy of the explicitly clicked kind when both signals disagree', () => {
    const out = chooseRecommendedStrategy(all, { preferredKind: 'monthly' }, 'lump_sums');
    expect(out?.strategy.kind).toBe('lump_sums');
  });

  it('falls back to the parser preference when nothing is selected', () => {
    const out = chooseRecommendedStrategy(all, { preferredKind: 'front_load' }, null);
    expect(out?.strategy.kind).toBe('front_load');
  });

  it("falls back to 'monthly' when neither signal is set", () => {
    const out = chooseRecommendedStrategy(all, {}, null);
    expect(out?.strategy.kind).toBe('monthly');
  });

  it('returns the first available strategy if the preferred kind is missing from the set', () => {
    const subset: EvaluatedPlanStrategy[] = [fakeView('front_load')];
    const out = chooseRecommendedStrategy(subset, { preferredKind: 'monthly' }, 'lump_sums');
    expect(out?.strategy.kind).toBe('front_load');
  });

  it('returns null for an empty or null strategy list', () => {
    expect(chooseRecommendedStrategy(null, {}, 'monthly')).toBe(null);
    expect(chooseRecommendedStrategy([], {}, 'monthly')).toBe(null);
  });
});
