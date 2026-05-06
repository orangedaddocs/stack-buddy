import { differenceInMonths, parseISO } from 'date-fns';
import type {
  LumpSum,
  PlanRecurring,
  PlanState,
  PlanStrategy,
  PlanStrategyKind,
  Scenario,
} from '../../../shared/types.js';
import { cashUsageLabel } from '../../../shared/math/cashFlow.js';
import {
  addMonthsUTC,
  isoDateUTC,
  parseISODateUTC,
} from '../../../shared/math/planningAudit.js';
import { projectPlan } from './planProjection.js';
import type { PlanConstraints } from './planConstraints.js';

/**
 * Pure business logic that turns a goal + constraints + cash flow into one
 * of the three approach strategies, scaled to hit the BTC target with the
 * deterministic engine, capped to any user-stated monthly limit, with a
 * top-up lump sum added when the cap creates a shortfall.
 *
 * Extracted from PlanTab.tsx so the React component is just orchestration
 * and JSX. None of these functions touch React, the DOM, or async APIs;
 * they take inputs and return scaled strategies.
 *
 * The scaling loops are brute-force: each pass calls `projectPlan` to
 * re-price under the deterministic engine, compares the result to the
 * BTC target or cap, and adjusts amounts. Acceptable at ~60-month plans;
 * if the horizon stretches dramatically a closed-form scaler should
 * replace these.
 */

export type ScaleStrategyArgs = {
  basePlan: PlanState;
  currentPrice: number;
  today: Date;
  monthlyAvailable: number;
  monthsToDeadline: number;
  constraints?: PlanConstraints;
};

export function makeDefaultApproachStrategies(args: ScaleStrategyArgs): PlanStrategy[] {
  const frontLoad = scaleStrategyToTarget(
    {
      kind: 'front_load',
      recurring: {
        shape: 'front_load',
        amount_per_month: 1,
        front_load_weights: args.basePlan.recurring.front_load_weights,
      },
      lump_sums: [],
      projected_btc: 0,
      total_dollars: 0,
      feasibility: 'tight',
      rationale: targetRationale('front_load'),
    },
    args,
  );
  const monthly = scaleStrategyToTarget(
    {
      kind: 'monthly',
      recurring: { shape: 'monthly', amount_per_month: 1 },
      lump_sums: [],
      projected_btc: 0,
      total_dollars: 0,
      feasibility: 'tight',
      rationale: targetRationale('monthly'),
    },
    args,
  );
  const customMix = scaleStrategyToTarget(
    {
      kind: 'lump_sums',
      recurring: { shape: 'monthly', amount_per_month: 1 },
      lump_sums: defaultTargetLumps(args.basePlan, args.today, args.monthsToDeadline),
      projected_btc: 0,
      total_dollars: 0,
      feasibility: 'tight',
      rationale: targetRationale('lump_sums'),
    },
    args,
  );

  return [frontLoad, monthly, customMix];
}

export function retargetManualPlan(
  plan: PlanState,
  currentPrice: number,
  today: Date,
  monthlyAvailable: number,
): PlanState {
  const monthsToDeadline = monthsBetween(today, plan.goal.deadline);
  return {
    ...plan,
    recurring: targetRecurringForShape(
      plan,
      plan.recurring.shape,
      currentPrice,
      today,
      monthlyAvailable,
      monthsToDeadline,
    ),
  };
}

export function targetRecurringForShape(
  plan: PlanState,
  shape: PlanRecurring['shape'],
  currentPrice: number,
  today: Date,
  monthlyAvailable: number,
  monthsToDeadline: number,
): PlanRecurring {
  if (shape === 'none') return { shape: 'none', amount_per_month: 0 };

  const strategy = scaleStrategyToTarget(
    {
      kind: shape === 'front_load' ? 'front_load' : 'monthly',
      recurring: {
        shape,
        amount_per_month: 1,
        front_load_weights: shape === 'front_load' ? plan.recurring.front_load_weights : undefined,
      },
      lump_sums: [],
      projected_btc: 0,
      total_dollars: 0,
      feasibility: 'tight',
      rationale: targetRationale(shape === 'front_load' ? 'front_load' : 'monthly'),
    },
    {
      basePlan: plan,
      currentPrice,
      today,
      monthlyAvailable,
      monthsToDeadline,
    },
  );

  return strategy.recurring;
}

export function monthsBetween(today: Date, deadline: string): number {
  const parsed = parseISO(deadline);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.max(0, differenceInMonths(parsed, today));
}

export type ConstraintStatus =
  | { label: 'fits'; message: string }
  | { label: 'needs_tradeoff'; message: string }
  | { label: 'violates'; message: string };

export function evaluateConstraintStatus(
  strategy: PlanStrategy,
  projection: ReturnType<typeof projectPlan>,
  constraints: PlanConstraints,
): ConstraintStatus | undefined {
  const cap =
    strategy.kind === 'front_load'
      ? constraints.maxUpfrontMonthly ?? constraints.maxMonthlyContribution
      : constraints.maxMonthlyContribution;
  if (!cap || cap <= 0 || strategy.recurring.shape === 'none') return undefined;

  const maxBuy = maxRecurringBuyAmount(projection);
  if (maxBuy > cap + 0.01) {
    return {
      label: 'violates',
      message: `This plan has a recurring buy above your ${formatConstraintDollars(cap)}/month limit.`,
    };
  }

  const hasTopUp = projection.audit.auditRows.some((row) =>
    /target top-up after capped/i.test(row.label),
  );
  if (hasTopUp) {
    return {
      label: 'needs_tradeoff',
      message: `Recurring buys stay at or below ${formatConstraintDollars(cap)}/month, but the target needs a later top-up.`,
    };
  }

  return {
    label: 'fits',
    message: `Recurring buys stay at or below ${formatConstraintDollars(cap)}/month.`,
  };
}

export function formatConstraintDollars(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

export function scaleStrategyToTarget(
  strategy: PlanStrategy,
  args: ScaleStrategyArgs,
): PlanStrategy {
  const seeded = seedStrategySchedule(strategy, args.basePlan, args.today, args.monthsToDeadline);
  const seededProjection = projectPlan(strategyToPlan(seeded, args.basePlan), {
    startingBtc: args.basePlan.starting_btc,
    currentBtcPrice: args.currentPrice,
    startDate: args.today,
    contributionOrigin: 'ai_strategy',
  });

  const remainingBtc = Math.max(0, args.basePlan.goal.target_btc - args.basePlan.starting_btc);
  const btcBought = seededProjection.audit.totals.btc_bought;
  if (remainingBtc <= 0 || btcBought <= 0) return seeded;

  const scale = remainingBtc / btcBought;
  const scaled: PlanStrategy = {
    ...seeded,
    recurring: {
      ...seeded.recurring,
      amount_per_month: Math.round(seeded.recurring.amount_per_month * scale),
    },
    // User-stated lumps (from notes / LLM-parsed bonuses + tax refunds)
    // keep their amounts. Only the engine-seeded "Target lump N"
    // placeholders absorb scaling — those start at $1 and were always
    // meant to grow. After scaling, applyStrategyConstraints adds a
    // labeled "Target top-up after capped..." lump to absorb any BTC
    // shortfall that recurring alone can't cover. A user who types
    // "$10K bonus in November" must see "$10K" come back, not a
    // silently-scaled "$27K".
    lump_sums: seeded.lump_sums.map((ls) =>
      isEngineSeededPlaceholder(ls)
        ? { ...ls, amount: Math.round(ls.amount * scale) }
        : ls,
    ),
  };
  const targetScaled = ensureStrategyReachesTarget(scaled, args, args.basePlan.goal.target_btc);
  const constrained = applyStrategyConstraints(targetScaled, args, args.basePlan.goal.target_btc);

  const finalProjection = projectPlan(strategyToPlan(constrained, args.basePlan), {
    startingBtc: args.basePlan.starting_btc,
    currentBtcPrice: args.currentPrice,
    startDate: args.today,
    contributionOrigin: 'ai_strategy',
  });
  const totalAvailable = Math.max(0, args.monthlyAvailable) * Math.max(0, args.monthsToDeadline);
  const usageRate =
    totalAvailable <= 0
      ? finalProjection.totalDollarsDeployed > 0
        ? Infinity
        : 0
      : finalProjection.totalDollarsDeployed / totalAvailable;

  return {
    ...constrained,
    projected_btc: finalProjection.btcAtDeadline,
    total_dollars: finalProjection.totalDollarsDeployed,
    feasibility: cashUsageLabel(usageRate),
    rationale: targetRationale(constrained.kind),
  };
}

function applyStrategyConstraints(
  strategy: PlanStrategy,
  args: ScaleStrategyArgs,
  targetBtc: number,
): PlanStrategy {
  const cap =
    strategy.kind === 'front_load'
      ? args.constraints?.maxUpfrontMonthly ?? args.constraints?.maxMonthlyContribution
      : args.constraints?.maxMonthlyContribution;
  if (
    strategy.recurring.shape === 'none' ||
    !Number.isFinite(cap) ||
    !cap ||
    cap <= 0
  ) {
    return strategy;
  }

  const projection = projectPlan(strategyToPlan(strategy, args.basePlan), {
    startingBtc: args.basePlan.starting_btc,
    currentBtcPrice: args.currentPrice,
    startDate: args.today,
    contributionOrigin: 'ai_strategy',
  });
  const maxRecurringBuy = maxRecurringBuyAmount(projection);
  if (maxRecurringBuy <= cap + 0.01) return strategy;

  let next: PlanStrategy = {
    ...strategy,
    recurring: {
      ...strategy.recurring,
      amount_per_month: Math.max(
        1,
        Math.floor(strategy.recurring.amount_per_month * (cap / maxRecurringBuy)),
      ),
    },
  };

  for (let i = 0; i < 5; i++) {
    const cappedProjection = projectPlan(strategyToPlan(next, args.basePlan), {
      startingBtc: args.basePlan.starting_btc,
      currentBtcPrice: args.currentPrice,
      startDate: args.today,
      contributionOrigin: 'ai_strategy',
    });
    const maxCappedBuy = maxRecurringBuyAmount(cappedProjection);
    if (maxCappedBuy <= cap + 0.01) break;
    next = {
      ...next,
      recurring: {
        ...next.recurring,
        amount_per_month: Math.max(
          1,
          Math.floor(next.recurring.amount_per_month * (cap / maxCappedBuy) * 0.995),
        ),
      },
    };
  }

  const cappedProjection = projectPlan(strategyToPlan(next, args.basePlan), {
    startingBtc: args.basePlan.starting_btc,
    currentBtcPrice: args.currentPrice,
    startDate: args.today,
    contributionOrigin: 'ai_strategy',
  });
  const shortfallBtc = targetBtc - cappedProjection.btcAtDeadline;
  if (shortfallBtc <= 0) return next;

  const topUpDate = chooseConstraintTopUpDate(args.basePlan, args.today);
  const oneDollarTopUp: PlanStrategy = {
    ...next,
    lump_sums: [
      ...next.lump_sums,
      {
        date: topUpDate,
        amount: 1,
        label: `Target top-up after capped ${Math.round(cap).toLocaleString('en-US')}/mo plan`,
      },
    ],
  };
  const oneDollarProjection = projectPlan(strategyToPlan(oneDollarTopUp, args.basePlan), {
    startingBtc: args.basePlan.starting_btc,
    currentBtcPrice: args.currentPrice,
    startDate: args.today,
    contributionOrigin: 'ai_strategy',
  });
  const btcPerTopUpDollar = oneDollarProjection.btcAtDeadline - cappedProjection.btcAtDeadline;
  const topUpAmount =
    btcPerTopUpDollar > 0
      ? Math.max(1, Math.ceil(shortfallBtc / btcPerTopUpDollar))
      : Math.max(1, Math.ceil(shortfallBtc * args.currentPrice));

  next = {
    ...next,
    lump_sums: oneDollarTopUp.lump_sums.map((ls, idx, arr) =>
      idx === arr.length - 1 ? { ...ls, amount: topUpAmount } : ls,
    ),
  };

  for (let i = 0; i < 5; i++) {
    const topUpProjection = projectPlan(strategyToPlan(next, args.basePlan), {
      startingBtc: args.basePlan.starting_btc,
      currentBtcPrice: args.currentPrice,
      startDate: args.today,
      contributionOrigin: 'ai_strategy',
    });
    if (topUpProjection.btcAtDeadline >= targetBtc) return next;
    const remaining = targetBtc - topUpProjection.btcAtDeadline;
    const dollarsToAdd =
      btcPerTopUpDollar > 0 ? Math.max(1, Math.ceil(remaining / btcPerTopUpDollar)) : 1;
    next = {
      ...next,
      lump_sums: next.lump_sums.map((ls, idx, arr) =>
        idx === arr.length - 1 ? { ...ls, amount: ls.amount + dollarsToAdd } : ls,
      ),
    };
  }

  return next;
}

/**
 * True for lumps the engine seeded as $1 placeholders in `defaultTargetLumps`,
 * which exist specifically to absorb scaling. False for user-stated lumps
 * (LLM-parsed bonuses, tax refunds, notes) and for the engine-added
 * "Target top-up after capped..." lump. Keep this string-coupled to
 * `defaultTargetLumps` below.
 */
export function isEngineSeededPlaceholder(lump: { label: string }): boolean {
  return /^Target lump \d+$/.test(lump.label);
}

export function maxRecurringBuyAmount(projection: ReturnType<typeof projectPlan>): number {
  return projection.audit.auditRows
    .filter((row) => /recurring/i.test(row.label))
    .reduce((max, row) => Math.max(max, row.amount_usd), 0);
}

function chooseConstraintTopUpDate(plan: PlanState, today: Date): string {
  const deadline = parseISODateUTC(plan.goal.deadline);
  const preferred = addMonthsUTC(deadline, -1);
  const topUpDate = preferred.getTime() > today.getTime() ? preferred : deadline;
  return isoDateUTC(topUpDate);
}

function ensureStrategyReachesTarget(
  strategy: PlanStrategy,
  args: { basePlan: PlanState; currentPrice: number; today: Date },
  targetBtc: number,
): PlanStrategy {
  let next = strategy;
  for (let i = 0; i < 6; i++) {
    const projection = projectPlan(strategyToPlan(next, args.basePlan), {
      startingBtc: args.basePlan.starting_btc,
      currentBtcPrice: args.currentPrice,
      startDate: args.today,
      contributionOrigin: 'ai_strategy',
    });
    if (projection.btcAtDeadline >= targetBtc) return next;

    const shortfallBtc = targetBtc - projection.btcAtDeadline;
    if (next.recurring.shape !== 'none' && next.recurring.amount_per_month > 0) {
      // Bump recurring AND engine-seeded lumps proportionally so design ratios
      // (e.g. Custom mix's "Jan 1 / Jul 1 = 2× DCA") survive target-reaching.
      // Without this, the scaler sets recurring=$X, engine-seeded lumps=$2X,
      // and then this loop bumps recurring up to $X+N without bumping the
      // lumps — collapsing the 2:1 ratio into something like $X+$N : $2X.
      // User-stated lumps (no `Target lump N` label) keep their amounts.
      const lumpRatios = next.lump_sums.map((ls) =>
        isEngineSeededPlaceholder(ls)
          ? ls.amount / next.recurring.amount_per_month
          : null,
      );
      const bumpProportionally = (recurringAmount: number): PlanStrategy => ({
        ...next,
        recurring: { ...next.recurring, amount_per_month: recurringAmount },
        lump_sums: next.lump_sums.map((ls, idx) => {
          const ratio = lumpRatios[idx];
          return ratio !== null && ratio !== undefined
            ? { ...ls, amount: Math.round(recurringAmount * ratio) }
            : ls;
        }),
      });
      const oneMoreDollar = bumpProportionally(next.recurring.amount_per_month + 1);
      const bumpedProjection = projectPlan(strategyToPlan(oneMoreDollar, args.basePlan), {
        startingBtc: args.basePlan.starting_btc,
        currentBtcPrice: args.currentPrice,
        startDate: args.today,
        contributionOrigin: 'ai_strategy',
      });
      const btcPerMonthlyDollar = bumpedProjection.btcAtDeadline - projection.btcAtDeadline;
      const dollarsToAdd =
        btcPerMonthlyDollar > 0 ? Math.max(1, Math.ceil(shortfallBtc / btcPerMonthlyDollar)) : 1;
      next = bumpProportionally(next.recurring.amount_per_month + dollarsToAdd);
      continue;
    }

    if (next.lump_sums.length > 0) {
      const lastIdx = next.lump_sums.reduce((bestIdx, ls, idx, arr) => {
        const best = arr[bestIdx]!;
        return ls.date >= best.date ? idx : bestIdx;
      }, 0);
      const oneMoreDollar = {
        ...next,
        lump_sums: next.lump_sums.map((ls, idx) =>
          idx === lastIdx ? { ...ls, amount: ls.amount + 1 } : ls,
        ),
      };
      const bumpedProjection = projectPlan(strategyToPlan(oneMoreDollar, args.basePlan), {
        startingBtc: args.basePlan.starting_btc,
        currentBtcPrice: args.currentPrice,
        startDate: args.today,
        contributionOrigin: 'ai_strategy',
      });
      const btcPerLumpDollar = bumpedProjection.btcAtDeadline - projection.btcAtDeadline;
      const dollarsToAdd =
        btcPerLumpDollar > 0 ? Math.max(1, Math.ceil(shortfallBtc / btcPerLumpDollar)) : 1;
      next = {
        ...next,
        lump_sums: next.lump_sums.map((ls, idx) =>
          idx === lastIdx ? { ...ls, amount: ls.amount + dollarsToAdd } : ls,
        ),
      };
      continue;
    }

    return next;
  }

  return next;
}

function seedStrategySchedule(
  strategy: PlanStrategy,
  plan: PlanState,
  today: Date,
  monthsToDeadline: number,
): PlanStrategy {
  if (strategy.kind === 'front_load') {
    return {
      ...strategy,
      recurring: {
        ...strategy.recurring,
        shape: 'front_load',
        amount_per_month:
          strategy.recurring.amount_per_month > 0 ? strategy.recurring.amount_per_month : 1,
      },
      lump_sums: strategy.lump_sums,
    };
  }

  if (strategy.kind === 'monthly') {
    return {
      ...strategy,
      recurring: {
        shape: 'monthly',
        amount_per_month:
          strategy.recurring.amount_per_month > 0 ? strategy.recurring.amount_per_month : 1,
      },
      lump_sums: strategy.lump_sums.filter((ls) => ls.amount > 0),
    };
  }

  const usableLumps = strategy.lump_sums.filter((ls) => ls.amount > 0);
  const lump_sums =
    usableLumps.length > 0 ? usableLumps : defaultTargetLumps(plan, today, monthsToDeadline);
  const lumpTotal = lump_sums.reduce((acc, ls) => acc + ls.amount, 0);
  const starterMonthly = Math.max(
    1,
    Math.round((lumpTotal / Math.max(1, monthsToDeadline)) * 0.5),
  );
  const recurring =
    strategy.recurring.shape !== 'none' && strategy.recurring.amount_per_month > 0
      ? strategy.recurring
      : {
          shape: 'monthly' as const,
          amount_per_month: starterMonthly,
        };
  return {
    ...strategy,
    recurring,
    lump_sums,
  };
}

function defaultTargetLumps(
  plan: PlanState,
  today: Date,
  monthsToDeadline: number,
): LumpSum[] {
  // Custom mix is the "DCA + calendar-anchored rituals" shape. Three recurring
  // events per year give the strategy a recognizable story and produce visible
  // bumps on the accumulation chart:
  //   - Jan 1 and Jul 1 each year — labeled "Target lump N" so the scaler
  //     treats them as placeholders that grow alongside the monthly DCA.
  //     Seeded at $2 so the post-scale ratio lands at 2× DCA.
  //   - Apr 15 each year — labeled "Tax refund {year}" so the scaler treats
  //     it as user-stated and keeps the $5,000 amount fixed. The classic
  //     stack-the-refund move.
  // Schedule per year: 12 monthly DCA + 2× DCA on Jan 1 + 2× DCA on Jul 1 +
  // $5,000 on Apr 15.
  const deadline = parseISODateUTC(plan.goal.deadline);
  const startYear = today.getUTCFullYear();
  const endYear = deadline.getUTCFullYear();

  const lumps: LumpSum[] = [];
  let placeholderIdx = 1;

  for (let year = startYear; year <= endYear; year++) {
    const jan1 = new Date(Date.UTC(year, 0, 1));
    if (jan1.getTime() > today.getTime() && jan1.getTime() <= deadline.getTime()) {
      lumps.push({
        date: isoDateUTC(jan1),
        amount: 2,
        label: `Target lump ${placeholderIdx++}`,
      });
    }
  }

  for (let year = startYear; year <= endYear; year++) {
    const jul1 = new Date(Date.UTC(year, 6, 1));
    if (jul1.getTime() > today.getTime() && jul1.getTime() <= deadline.getTime()) {
      lumps.push({
        date: isoDateUTC(jul1),
        amount: 2,
        label: `Target lump ${placeholderIdx++}`,
      });
    }
  }

  for (let year = startYear; year <= endYear; year++) {
    const apr15 = new Date(Date.UTC(year, 3, 15));
    if (apr15.getTime() > today.getTime() && apr15.getTime() <= deadline.getTime()) {
      lumps.push({
        date: isoDateUTC(apr15),
        amount: 5000,
        label: `Tax refund ${year}`,
      });
    }
  }

  // Fallback for very short windows where none of the calendar dates fall
  // inside [today, deadline]. Drop a single placeholder near the midpoint
  // so the strategy still has *something* to scale into.
  if (lumps.length === 0) {
    const offset = Math.max(1, Math.floor(monthsToDeadline / 2));
    const midDate = addMonthsUTC(today, offset);
    const clamped = midDate.getTime() > deadline.getTime() ? deadline : midDate;
    return [{ date: isoDateUTC(clamped), amount: 1, label: 'Target lump 1' }];
  }

  return lumps.sort((a, b) => a.date.localeCompare(b.date));
}

export function strategyToPlan(strategy: PlanStrategy, plan: PlanState): PlanState {
  return {
    goal: plan.goal,
    starting_btc: plan.starting_btc,
    recurring: strategy.recurring,
    lump_sums: strategy.lump_sums,
  };
}

function targetRationale(kind: PlanStrategyKind): string {
  switch (kind) {
    case 'front_load':
      return 'This path is scaled to reach the target by pulling more dollars into the earlier part of the window, when the catch-up model prices BTC lower. The cash status shows whether that target-reaching pace fits your available BTC budget.';
    case 'monthly':
      return 'This path is scaled to reach the target with the same recurring contribution each month through the deadline. The cash status shows whether the required monthly pace fits your available BTC budget.';
    case 'lump_sums':
      return 'This path is scaled to reach the target with a custom mix of dated buys and DCA. The cash status shows whether that combined deployment fits your available BTC budget.';
  }
}

export function initialPlan(
  today: Date,
  _scenario: Scenario,
  currentPrice: number,
): PlanState {
  const plan: PlanState = {
    goal: {
      target_btc: 0.5,
      deadline: '2030-12-31',
    },
    starting_btc: 0,
    recurring: {
      shape: 'monthly',
      amount_per_month: 1,
    },
    lump_sums: [],
  };
  return retargetManualPlan(plan, currentPrice, today, 0);
}
