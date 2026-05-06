import type { PlanStrategyKind } from '../../../shared/types.js';
import type { EvaluatedPlanStrategy } from '../components/PlanAIAdvisor.js';
import type { PlanConstraints } from './planConstraints.js';

/**
 * Pick which evaluated strategy the "Stack Buddy AI" answer panel should
 * describe.
 *
 * Precedence (high → low):
 *   1. `selectedKind` — what the user explicitly clicked. The notes parser
 *      cannot override an explicit click. If a user types "Cap monthly DCA
 *      at $1,500" (a constraint that happens to mention the kind) and then
 *      clicks Custom mix, the panel must follow the click.
 *   2. `constraints.preferredKind` — the parser's best guess from notes.
 *      Only used as a default before the user has clicked, or as a
 *      fallback when no strategy of the selected kind exists.
 *   3. `'monthly'` — final fallback if neither signal is set.
 *
 * The previous order was reversed (parser-first), which created the
 * "headline says Monthly DCA, chart shows Custom mix" contradiction.
 */
export function chooseRecommendedStrategy(
  strategies: EvaluatedPlanStrategy[] | null,
  constraints: PlanConstraints,
  selectedKind: PlanStrategyKind | null,
): EvaluatedPlanStrategy | null {
  if (!strategies || strategies.length === 0) return null;
  const preferred = selectedKind ?? constraints.preferredKind ?? 'monthly';
  return strategies.find((view) => view.strategy.kind === preferred) ?? strategies[0] ?? null;
}
