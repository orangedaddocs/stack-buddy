import type { PlanRecurring, PlanRecurringShape } from '../../../shared/types.js';
import { NumberInput } from './NumberInput.js';
import { formatUSD } from '../../../shared/math/format.js';

export function PlanRecurringEditor(props: {
  value: PlanRecurring;
  monthsToDeadline: number;
  onChange: (next: PlanRecurring) => void;
}) {
  const v = props.value;
  const setShape = (shape: PlanRecurringShape) => {
    if (shape === v.shape) return;
    if (shape === 'front_load' && (!v.front_load_weights || v.front_load_weights.length === 0)) {
      const yearCount = Math.max(1, Math.ceil(props.monthsToDeadline / 12));
      props.onChange({ ...v, shape, front_load_weights: defaultWeights(yearCount) });
      return;
    }
    props.onChange({ ...v, shape });
  };

  const yearCount = Math.max(1, Math.ceil(props.monthsToDeadline / 12));
  const weights = v.front_load_weights ?? defaultWeights(yearCount);
  const totalDollars = v.amount_per_month * Math.max(0, props.monthsToDeadline);
  const yearMonthCounts = monthCountsByPlanYear(props.monthsToDeadline, yearCount);
  const yearDollars = dollarsByPlanYear(totalDollars, yearMonthCounts, weights);

  return (
    <div className="rounded-[20px] border border-cream-300 bg-white p-7">
      <div className="mb-3 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
        Recurring contributions
      </div>

      <div className="mb-5 inline-flex rounded-xl border border-cream-300 bg-cream-50 p-1 text-base">
        <ShapeButton active={v.shape === 'monthly'} onClick={() => setShape('monthly')}>
          Flat monthly
        </ShapeButton>
        <ShapeButton active={v.shape === 'front_load'} onClick={() => setShape('front_load')}>
          Front-loaded
        </ShapeButton>
        <ShapeButton active={v.shape === 'none'} onClick={() => setShape('none')}>
          None
        </ShapeButton>
      </div>

      {v.shape !== 'none' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label={v.shape === 'front_load' ? 'Average per month' : 'Per month'}
            help={
              v.shape === 'front_load' && yearMonthCounts[0] && yearDollars[0]
                ? // Spell out the relationship between "Average per month" and what
                  // the audit table actually shows. Year 1 is heaviest, last
                  // populated year is lightest. Without this, a user types
                  // "$2,000" here and gets surprised when audit rows show ~$3,300.
                  `Front-loaded: Year 1 deploys about ${formatUSD(yearDollars[0]! / yearMonthCounts[0]!)}/month, tapering toward ${formatUSD((yearDollars.at(-1) ?? 0) / Math.max(1, yearMonthCounts.at(-1) ?? 1))}/month by Year ${yearCount}.`
                : undefined
            }
          >
            <NumberInput
              value={v.amount_per_month}
              onChange={(n) => props.onChange({ ...v, amount_per_month: Math.round(n) })}
              prefix="$"
              maximumFractionDigits={0}
              min={0}
            />
          </Field>
          <div className="self-end text-base text-text-muted">
            <div>{formatUSD(totalDollars)} over {props.monthsToDeadline} months</div>
          </div>
        </div>
      )}

      {v.shape === 'front_load' && (
        <div className="mt-5 border-t border-cream-200 pt-5">
          <div className="mb-2 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
            Per-year dollars
          </div>
          <p className="mb-3 text-base text-text-secondary">
            How many dollars to deploy in each plan year. Higher early = more buying when BTC is cheaper.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {yearDollars.map((dollars, i) => (
              <Field key={i} label={`Year ${i + 1}`}>
                <NumberInput
                  value={Math.round(dollars)}
                  onChange={(n) => {
                    const nextDollars = [...yearDollars];
                    nextDollars[i] = Math.max(0, Math.round(n));
                    const nextTotal = nextDollars.reduce((acc, amount) => acc + amount, 0);
                    props.onChange({
                      ...v,
                      amount_per_month:
                        props.monthsToDeadline > 0 ? Math.round(nextTotal / props.monthsToDeadline) : 0,
                      front_load_weights: weightsFromYearDollars(nextDollars, yearMonthCounts),
                    });
                  }}
                  prefix="$"
                  maximumFractionDigits={0}
                  min={0}
                />
              </Field>
            ))}
          </div>
          <p className="mt-2 text-base text-text-faint">
            Year dollar amounts drive the front-loaded schedule; the calculator prices each actual buy date.
          </p>
        </div>
      )}
    </div>
  );
}

function ShapeButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        props.active
          ? 'rounded-lg bg-white px-3.5 py-1.5 text-base font-semibold text-text-primary shadow-sm'
          : 'rounded-lg px-3.5 py-1.5 text-base font-medium text-text-muted hover:text-text-primary'
      }
    >
      {props.children}
    </button>
  );
}

function Field(props: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-base font-medium text-text-primary">{props.label}</label>
      {props.children}
      {props.help && (
        <div className="mt-1.5 text-base leading-relaxed text-text-muted">{props.help}</div>
      )}
    </div>
  );
}

function defaultWeights(yearCount: number): number[] {
  if (yearCount === 1) return [1];
  const raw = Array.from({ length: yearCount }, (_, i) => yearCount - i);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

function monthCountsByPlanYear(months: number, yearCount: number): number[] {
  return Array.from({ length: yearCount }, (_, i) =>
    Math.max(0, Math.min(12, months - i * 12)),
  );
}

function dollarsByPlanYear(totalDollars: number, monthCounts: number[], weights: number[]): number[] {
  const weightedMonths = monthCounts.map((monthCount, i) => {
    const fallback = weights.at(-1) ?? 0;
    return Math.max(0, weights[i] ?? fallback) * monthCount;
  });
  const weightedTotal = weightedMonths.reduce((acc, value) => acc + value, 0);
  if (totalDollars <= 0 || weightedTotal <= 0) {
    return monthCounts.map(() => 0);
  }
  return weightedMonths.map((value) => totalDollars * (value / weightedTotal));
}

function weightsFromYearDollars(dollars: number[], monthCounts: number[]): number[] {
  return dollars.map((amount, i) => {
    const monthCount = monthCounts[i] ?? 0;
    return monthCount > 0 ? amount / monthCount : 0;
  });
}
