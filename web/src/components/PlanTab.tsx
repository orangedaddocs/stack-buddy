import { useMemo, useState } from 'react';
import { differenceInMonths, parseISO } from 'date-fns';
import type {
  PlanGoal,
  PlanState,
  PlanStrategy,
  PlanStrategyKind,
  Scenario,
} from '../../../shared/types.js';
import { PlanGoalCard } from './PlanGoalCard.js';
import { PlanAccumulationChart, type ChartAlternative } from './PlanAccumulationChart.js';
import { PlanAIAdvisor, type EvaluatedPlanStrategy } from './PlanAIAdvisor.js';
import { AskAICard } from './AskAICard.js';
import { PlanAuditPanel } from './PlanAuditPanel.js';
import { projectPlan } from '../lib/planProjection.js';
import { cashUsageLabel } from '../../../shared/math/cashFlow.js';
import { formatUSD } from '../../../shared/math/format.js';
import { parsePlanConstraints } from '../lib/planConstraints.js';
import {
  evaluateConstraintStatus,
  initialPlan,
  makeDefaultApproachStrategies,
  scaleStrategyToTarget,
  strategyToPlan,
} from '../lib/strategyScaling.js';

// 3 Approaches is intentionally disconnected from the Simple tab. This tab is
// the *aspirational* view: "here's what it takes to hit your BTC goal" without
// any judgment about whether your current cash flow can support it. Cash-flow
// reality lives on the Simple tab; this tab is for picking an approach and
// seeing the math. We pass 0 for monthlyAvailable so the engine still scales
// strategies to the target — it just doesn't compute or display feasibility.

export function PlanTab(props: {
  scenario: Scenario;
  livePrice: number | null;
  onShowModelsTab?: () => void;
}) {
  const today = useMemo(() => new Date(), []);
  const currentPrice = props.livePrice ?? 0;
  // Aspirational view — no cash-flow constraint flows in from Simple.
  const monthlyAvailable = 0;

  const [plan, setPlan] = useState<PlanState>(() => initialPlan(today, props.scenario, currentPrice));
  const [selectedKind, setSelectedKind] = useState<PlanStrategyKind | null>('monthly');
  const [auditOpenRequestId, setAuditOpenRequestId] = useState(0);
  // Constraints used to come from a user-notes textarea ("front-load only,
  // cap at $3K/mo"). With AI removed, no textarea exists, so constraints are
  // empty — the deterministic engine just scales each approach to the target.
  const planConstraints = useMemo(() => parsePlanConstraints(''), []);

  const monthsToDeadline = Math.max(
    0,
    differenceInMonths(parseISO(plan.goal.deadline), today),
  );

  const approachStrategies = useMemo(
    () =>
      makeDefaultApproachStrategies({
        basePlan: plan,
        currentPrice,
        today,
        monthlyAvailable,
        monthsToDeadline,
        constraints: planConstraints,
      }),
    [plan.goal, plan.starting_btc, currentPrice, today, monthlyAvailable, monthsToDeadline, planConstraints],
  );
  const activeSelectedKind = selectedKind;

  const selectedStrategyForPlan = useMemo(() => {
    if (!selectedKind) return null;
    const strategy = approachStrategies.find((s) => s.kind === selectedKind);
    if (!strategy) return null;
    return scaleStrategyToTarget(strategy, {
      basePlan: plan,
      currentPrice,
      today,
      monthlyAvailable,
      monthsToDeadline,
      constraints: planConstraints,
    });
  }, [approachStrategies, selectedKind, plan, currentPrice, today, monthlyAvailable, monthsToDeadline, planConstraints]);

  const activePlan = useMemo(
    () => (selectedStrategyForPlan ? strategyToPlan(selectedStrategyForPlan, plan) : plan),
    [selectedStrategyForPlan, plan],
  );

  const projection = useMemo(
    () =>
      projectPlan(activePlan, {
        startingBtc: activePlan.starting_btc,
        currentBtcPrice: currentPrice,
        startDate: today,
        contributionOrigin: activeSelectedKind ? 'ai_strategy' : 'manual',
      }),
    [activePlan, currentPrice, today, activeSelectedKind],
  );

  const cashUsageRate = useMemo(() => {
    const totalAvailable = Math.max(0, monthlyAvailable) * Math.max(0, monthsToDeadline);
    if (totalAvailable <= 0) return projection.totalDollarsDeployed > 0 ? Infinity : 0;
    return projection.totalDollarsDeployed / totalAvailable;
  }, [monthlyAvailable, monthsToDeadline, projection.totalDollarsDeployed]);
  const feasibilityLabel = cashUsageLabel(cashUsageRate);

  const evaluatedStrategies: EvaluatedPlanStrategy[] | null = useMemo(() => {
    const totalAvailable = Math.max(0, monthlyAvailable) * Math.max(0, monthsToDeadline);
    return approachStrategies.map((strategy) => {
      const targetStrategy = scaleStrategyToTarget(strategy, {
        basePlan: plan,
        currentPrice,
        today,
        monthlyAvailable,
        monthsToDeadline,
        constraints: planConstraints,
      });
      const strategyPlan: PlanState = {
        goal: plan.goal,
        starting_btc: plan.starting_btc,
        recurring: targetStrategy.recurring,
        lump_sums: targetStrategy.lump_sums,
      };
      const strategyProjection = projectPlan(strategyPlan, {
        startingBtc: plan.starting_btc,
        currentBtcPrice: currentPrice,
        startDate: today,
        contributionOrigin: 'ai_strategy',
      });
      const usageRate =
        totalAvailable <= 0
          ? strategyProjection.totalDollarsDeployed > 0
            ? Infinity
            : 0
          : strategyProjection.totalDollarsDeployed / totalAvailable;
      return {
        strategy: targetStrategy,
        projection: strategyProjection,
        cashUsageRate: usageRate,
        cashUsageLabel: cashUsageLabel(usageRate),
        constraintStatus: evaluateConstraintStatus(targetStrategy, strategyProjection, planConstraints),
        stale:
          Math.abs(targetStrategy.projected_btc - strategyProjection.btcAtDeadline) > 0.0001 ||
          Math.abs(targetStrategy.total_dollars - strategyProjection.totalDollarsDeployed) > 0.01,
      };
    });
  }, [approachStrategies, plan.goal, plan.starting_btc, currentPrice, today, monthlyAvailable, monthsToDeadline, planConstraints]);

  // Build faint alternative curves from the AI's other strategies.
  const alternatives: ChartAlternative[] = useMemo(() => {
    if (!evaluatedStrategies || !activeSelectedKind) return [];
    return evaluatedStrategies
      .filter((view) => view.strategy.kind !== activeSelectedKind)
      .map((view) => {
        const s = view.strategy;
        const altPlan: PlanState = {
          goal: plan.goal,
          starting_btc: plan.starting_btc,
          recurring: s.recurring,
          lump_sums: s.lump_sums,
        };
        const proj = projectPlan(altPlan, {
          startingBtc: plan.starting_btc,
          currentBtcPrice: currentPrice,
          startDate: today,
          contributionOrigin: 'ai_strategy',
        });
        return {
          label: kindLabel(s.kind),
          points: proj.points.map((p) => ({ monthIdx: p.monthIdx, cumBtc: p.cumBtc })),
        };
      });
  }, [evaluatedStrategies, activeSelectedKind, plan.goal, plan.starting_btc, currentPrice, today]);

  const applyStrategy = (s: PlanStrategy) => {
    setSelectedKind(s.kind);
    setPlan((prev) => ({
      ...prev,
      recurring: s.recurring,
      lump_sums: s.lump_sums,
    }));
  };

  const setGoal = (goal: PlanGoal) => setPlan((p) => ({ ...p, goal }));

  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <div>
        <h2 className="mb-2 text-3xl font-bold leading-tight text-text-primary">
          Plan your stack
        </h2>
        <p className="text-base leading-relaxed text-text-secondary">
          Compare monthly DCA, front-loading, and lump-sum paths to a BTC target. The calculator prices every buy under the Catch-Up Power Law and shows the audit table below.
        </p>
      </div>

      <PlanGoalCard goal={plan.goal} onGoalChange={setGoal} />

      <PlanAIAdvisor
        strategies={evaluatedStrategies}
        selectedKind={activeSelectedKind}
        onSelect={applyStrategy}
        onViewAudit={() => {
          setAuditOpenRequestId((id) => id + 1);
          // Tiny delay so the <details> finishes expanding before the scroll
          // — otherwise the browser scrolls to the still-collapsed top edge
          // and the rows you wanted to see end up below the viewport.
          setTimeout(() => {
            document.getElementById('every-buy-panel')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }, 80);
        }}
      />
      <AskAICard />

      <PlanTimingSummary projection={projection} />

      {projection.excludedLumpSums.length > 0 && (
        <ExcludedLumpsNote excluded={projection.excludedLumpSums} />
      )}

      <PlanAccumulationChart
        chosen={projection}
        alternatives={alternatives.length > 0 ? alternatives : undefined}
        targetBtc={plan.goal.target_btc}
        onShowModelsTab={props.onShowModelsTab}
      />

      <PlanAuditPanel
        projection={projection}
        plan={plan}
        selectedKind={activeSelectedKind}
        openRequestId={auditOpenRequestId}
      />
    </div>
  );
}

function ExcludedLumpsNote(props: {
  excluded: ReturnType<typeof projectPlan>['excludedLumpSums'];
}) {
  return (
    <div className="rounded-2xl border border-error/40 bg-[#fbe9e6] px-5 py-4 text-base text-error">
      <div className="font-semibold">
        {props.excluded.length === 1
          ? '1 dated buy was not counted in this plan.'
          : `${props.excluded.length} dated buys were not counted in this plan.`}
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-base">
        {props.excluded.map((ex, i) => (
          <li key={`${ex.lumpSum.date}-${i}`}>
            <span className="font-semibold">
              {ex.lumpSum.label || 'Dated buy'} · {ex.lumpSum.date} · {formatUSD(ex.lumpSum.amount)}
            </span>{' '}
            <span className="opacity-80">
              {ex.reason === 'before_today'
                ? '— dated before today, so the calculator can’t price it.'
                : '— dated after the deadline, so it falls outside the plan window.'}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 text-base opacity-80">
        Either edit or remove these in the dated-buys list, or move the deadline.
      </div>
    </div>
  );
}

function PlanTimingSummary(props: { projection: ReturnType<typeof projectPlan> }) {
  const t = props.projection.audit.timing;
  return (
    <div className="rounded-2xl border border-cream-300 bg-white p-5">
      <div className="mb-3 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
        Contribution timing
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TimingStat label="Plan start date" value={t.plan_start_date} />
        <TimingStat label="First contribution date" value={t.first_contribution_date ?? '—'} />
        <TimingStat label="Last contribution date" value={t.last_contribution_date ?? '—'} />
        <TimingStat label="Number of contributions" value={String(t.contribution_count)} />
        <TimingStat label="Frequency" value={t.contribution_frequency} />
        <TimingStat label="Timing rule" value={t.contribution_timing_rule.replaceAll('_', ' ')} />
      </div>
    </div>
  );
}

function TimingStat(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-base text-text-muted">{props.label}</div>
      <div className="text-lg font-semibold tabular-nums text-text-primary">{props.value}</div>
    </div>
  );
}

function kindLabel(kind: PlanStrategyKind): string {
  switch (kind) {
    case 'front_load':
      return 'Front-load (alt)';
    case 'monthly':
      return 'Monthly DCA (alt)';
    case 'lump_sums':
      return 'Custom mix (alt)';
  }
}
