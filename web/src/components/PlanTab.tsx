import { useEffect, useMemo, useState } from 'react';
import { differenceInMonths, parseISO } from 'date-fns';
import type {
  LumpSum,
  PlanGoal,
  PlanRecurring,
  PlanState,
  PlanStrategy,
  PlanStrategyKind,
  Scenario,
} from '../../../shared/types.js';
import type { SimpleInputs } from './SimpleCard.js';
import { computeSimple } from './SimpleResult.js';
import { PlanGoalCard } from './PlanGoalCard.js';
import { PlanRecurringEditor } from './PlanRecurringEditor.js';
import { PlanLumpSumEditor } from './PlanLumpSumEditor.js';
import { PlanAccumulationChart, type ChartAlternative } from './PlanAccumulationChart.js';
import { PlanFeasibilityNote } from './PlanFeasibilityNote.js';
import { PlanAIAdvisor, type EvaluatedPlanStrategy } from './PlanAIAdvisor.js';
import { PlanAuditPanel } from './PlanAuditPanel.js';
import { projectPlan } from '../lib/planProjection.js';
import { api } from '../lib/api.js';
import { cashUsageLabel } from '../../../shared/math/cashFlow.js';
import { formatUSD } from '../../../shared/math/format.js';
import { parsePlanConstraints, type PlanConstraints } from '../lib/planConstraints.js';
import { chooseRecommendedStrategy } from '../lib/recommendedStrategy.js';
import { buildStackBuddyAnswer, type StackBuddyAnswer } from '../lib/stackBuddyAnswer.js';
import {
  evaluateConstraintStatus,
  initialPlan,
  makeDefaultApproachStrategies,
  scaleStrategyToTarget,
  strategyToPlan,
  targetRecurringForShape,
} from '../lib/strategyScaling.js';

type PlanMode = 'approaches' | 'custom';

export function PlanTab(props: {
  scenario: Scenario;
  simple: SimpleInputs;
  livePrice: number | null;
  aiAvailable: boolean | null;
  onShowModelsTab?: () => void;
}) {
  const today = useMemo(() => new Date(), []);
  const monthlyAvailable = computeSimple(props.simple).monthlyBudgetUSD;
  const currentPrice = props.livePrice ?? props.simple.btcPrice;

  const [plan, setPlan] = useState<PlanState>(() => initialPlan(today, props.scenario, currentPrice));
  const [planMode, setPlanMode] = useState<PlanMode>('approaches');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<PlanStrategy[] | null>(null);
  const [selectedKind, setSelectedKind] = useState<PlanStrategyKind | null>('monthly');
  const [userNotes, setUserNotes] = useState<string>('');
  const [advisorAsked, setAdvisorAsked] = useState(false);
  const [auditOpenRequestId, setAuditOpenRequestId] = useState(0);
  const planConstraints = useMemo(() => parsePlanConstraints(userNotes), [userNotes]);

  const monthsToDeadline = Math.max(
    0,
    differenceInMonths(parseISO(plan.goal.deadline), today),
  );

  const defaultStrategies = useMemo(
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
  const approachStrategies = strategies ?? defaultStrategies;
  const activeSelectedKind = planMode === 'approaches' ? selectedKind : null;

  const selectedStrategyForPlan = useMemo(() => {
    if (planMode !== 'approaches' || !selectedKind) return null;
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
  }, [approachStrategies, planMode, selectedKind, plan, currentPrice, today, monthlyAvailable, monthsToDeadline, planConstraints]);

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

  const recommendedView = useMemo(
    () => chooseRecommendedStrategy(evaluatedStrategies, planConstraints, selectedKind),
    [evaluatedStrategies, planConstraints, selectedKind],
  );
  const advisorAnswer = useMemo(
    () =>
      recommendedView
        ? buildStackBuddyAnswer({
            view: recommendedView,
            goal: plan.goal,
            constraints: planConstraints,
            loading: aiLoading,
          })
        : null,
    [recommendedView, plan.goal, planConstraints, aiLoading],
  );

  const askAI = async () => {
    setPlanMode('approaches');
    if (planConstraints.preferredKind) setSelectedKind(planConstraints.preferredKind);
    setAdvisorAsked(true);
    setAiLoading(true);
    setAiError(null);
    try {
      const trimmedNotes = userNotes.trim();
      const res = await api.planAdvise({
        goal: plan.goal,
        starting_btc: plan.starting_btc,
        monthly_available_usd: monthlyAvailable,
        current_btc_price: currentPrice,
        scenario: props.scenario,
        user_notes: trimmedNotes.length > 0 ? trimmedNotes : undefined,
      });
      const targetStrategies = res.strategies.map((strategy) =>
        scaleStrategyToTarget(strategy, {
          basePlan: plan,
          currentPrice,
          today,
          monthlyAvailable,
          monthsToDeadline,
          constraints: planConstraints,
        }),
      );
      setStrategies(targetStrategies);
      // On re-advise: if a strategy of the previously-selected kind exists in
      // the new set, swap to it so the editors/chart reflect the latest
      // numbers. If not (or nothing was selected yet), default to monthly.
      const preferredKind = planConstraints.preferredKind ?? selectedKind;
      const preferred = preferredKind
        ? targetStrategies.find((s) => s.kind === preferredKind)
        : undefined;
      const next = preferred ?? targetStrategies.find((s) => s.kind === 'monthly') ?? targetStrategies[0];
      if (next) applyStrategy(next);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  };

  const applyStrategy = (s: PlanStrategy) => {
    setPlanMode('approaches');
    setSelectedKind(s.kind);
    setPlan((prev) => ({
      ...prev,
      recurring: s.recurring,
      lump_sums: s.lump_sums,
    }));
  };

  // Don't auto-rescale the recurring amount when the user changes target_btc
  // or deadline. In Build manually mode the user is in control of the amount;
  // silently snapping their $2,000/month back to whatever auto-targets the
  // goal is exactly the kind of "the calculator decided for me" behavior that
  // breaks trust. The chart and feasibility verdict will reflect the new goal
  // automatically — the target line moves, the cash-usage label updates.
  const setGoal = (goal: PlanGoal) => setPlan((p) => ({ ...p, goal }));
  const setRecurring = (recurring: PlanRecurring) => {
    setSelectedKind(null);
    setPlanMode('custom');
    setPlan((p) => {
      if (recurring.shape === p.recurring.shape) return { ...p, recurring };
      return {
        ...p,
        recurring: targetRecurringForShape(
          { ...p, recurring },
          recurring.shape,
          currentPrice,
          today,
          monthlyAvailable,
          monthsToDeadline,
        ),
      };
    });
  };
  const setLumps = (lump_sums: LumpSum[]) => {
    setSelectedKind(null);
    setPlanMode('custom');
    setPlan((p) => ({ ...p, lump_sums }));
  };

  // Clear AI advice if the goal materially changes — they'll need fresh advice.
  // (We keep the user's edited recurring/lump_sums; only AI proposals are stale.)
  const goalKey = `${plan.goal.target_btc}|${plan.goal.deadline}`;
  useEffect(() => {
    setStrategies(null);
    setSelectedKind('monthly');
    setAiError(null);
    setAdvisorAsked(false);
  }, [goalKey]);

  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="mb-2 text-3xl font-bold leading-tight text-text-primary">
            Plan your stack
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            Compare monthly DCA, front-loading, and lump-sum paths to a BTC target. The calculator prices every buy under the Catch-Up Power Law and shows the audit table below.
          </p>
        </div>
        <PlanModeToggle
          value={planMode}
          onChange={(mode) => {
            setPlanMode(mode);
            if (mode === 'approaches' && !selectedKind) setSelectedKind('monthly');
          }}
        />
      </div>

      <PlanGoalCard
        goal={plan.goal}
        userNotes={userNotes}
        onGoalChange={setGoal}
        onUserNotesChange={setUserNotes}
        onAskAI={askAI}
        loading={aiLoading}
        hasAdvice={strategies !== null}
        aiAvailable={props.aiAvailable}
        planMode={planMode}
      />

      {planMode === 'approaches' && (advisorAsked || aiLoading) && advisorAnswer && (
        <StackBuddyAnswerPanel
          answer={advisorAnswer}
          loading={aiLoading}
          onUsePlan={() => {
            if (recommendedView) applyStrategy(recommendedView.strategy);
          }}
          onViewAudit={() => setAuditOpenRequestId((id) => id + 1)}
        />
      )}

      {planMode === 'approaches' ? (
        <PlanAIAdvisor
          loading={aiLoading}
          error={aiError}
          strategies={evaluatedStrategies}
          selectedKind={activeSelectedKind}
          onSelect={applyStrategy}
          onViewAudit={() => setAuditOpenRequestId((id) => id + 1)}
        />
      ) : (
        <>
          <PlanRecurringEditor
            value={plan.recurring}
            monthsToDeadline={monthsToDeadline}
            onChange={setRecurring}
          />

          <PlanLumpSumEditor value={plan.lump_sums} onChange={setLumps} />
        </>
      )}

      {planMode === 'custom' && (
        <PlanFeasibilityNote
          totalDeployed={projection.totalDollarsDeployed}
          monthsToDeadline={monthsToDeadline}
          monthlyAvailableUSD={monthlyAvailable}
        />
      )}

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
        simple={props.simple}
        cashUsageRate={cashUsageRate}
        feasibilityLabel={feasibilityLabel}
        selectedKind={activeSelectedKind}
        openRequestId={auditOpenRequestId}
      />
    </div>
  );
}

function PlanModeToggle(props: { value: PlanMode; onChange: (mode: PlanMode) => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-xl border border-cream-300 bg-white p-1 text-base">
      <ModeButton active={props.value === 'approaches'} onClick={() => props.onChange('approaches')}>
        Guided plan
      </ModeButton>
      <ModeButton active={props.value === 'custom'} onClick={() => props.onChange('custom')}>
        Build manually
      </ModeButton>
    </div>
  );
}

function ModeButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        props.active
          ? 'btc-grad rounded-lg px-3.5 py-1.5 text-base font-semibold text-white shadow-sm'
          : 'rounded-lg px-3.5 py-1.5 text-base font-medium text-text-secondary hover:bg-cream-100 hover:text-text-primary'
      }
    >
      {props.children}
    </button>
  );
}

function StackBuddyAnswerPanel(props: {
  answer: StackBuddyAnswer;
  loading: boolean;
  onUsePlan: () => void;
  onViewAudit: () => void;
}) {
  // Color the headline by tone so the page can never have an "AI says this
  // fits" headline above a red "funding gap" banner. Unfunded → error red,
  // tradeoff → warning amber, fits → neutral text-primary.
  const headlineClass =
    props.answer.tone === 'unfunded'
      ? 'text-2xl font-semibold text-error'
      : props.answer.tone === 'needs_tradeoff'
        ? 'text-2xl font-semibold text-[#9a4f1d]'
        : 'text-2xl font-semibold text-text-primary';
  return (
    <div className="rounded-[20px] border border-cream-300 bg-white p-6">
      <div className="mb-2 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
        {props.loading ? 'Asking Stack Buddy AI...' : 'Stack Buddy AI'}
      </div>
      <h3 className={headlineClass}>{props.answer.headline}</h3>
      <p className="mt-2 text-base leading-relaxed text-text-secondary">{props.answer.summary}</p>
      <div className="mt-4 space-y-2 text-base leading-relaxed text-text-secondary">
        {props.answer.bullets.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={props.onUsePlan}
          className="btc-grad rounded-xl px-5 py-2.5 text-base font-semibold text-white shadow-[0_4px_16px_rgba(247,147,26,0.22)]"
        >
          Use {props.answer.recommendedKind}
        </button>
        <button
          type="button"
          onClick={props.onViewAudit}
          className="rounded-xl border border-cream-300 bg-white px-5 py-2.5 text-base font-semibold text-text-primary hover:border-btc-orange hover:text-btc-orange-end"
        >
          See monthly buys
        </button>
      </div>
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
