import type { PlanGoal } from '../../../shared/types.js';
import { NumberInput } from './NumberInput.js';

export function PlanGoalCard(props: {
  goal: PlanGoal;
  onGoalChange: (next: PlanGoal) => void;
}) {
  const g = props.goal;

  return (
    <div className="rounded-[20px] border border-cream-300 bg-white p-5 sm:p-7">
      <div className="mb-3 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
        Your goal
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="How much BTC do you want to stack?"
          help="If you already hold some, subtract it. This is new BTC to buy — Stack Buddy doesn't ask what you already have."
        >
          <NumberInput
            value={g.target_btc}
            onChange={(n) => props.onGoalChange({ ...g, target_btc: n })}
            suffix="BTC"
            step="0.1"
            min={0}
          />
        </Field>
        <Field label="By when">
          {/* iOS Safari renders <input type="date"> with a minimum intrinsic
              width that often exceeds a 390px-wide phone viewport once you
              add card padding + grid gaps. `min-w-0` + `box-border` lets it
              shrink; `[appearance:none]` strips the native widget styling
              (the picker still works on tap, just no extra chrome). */}
          <input
            type="date"
            value={g.deadline}
            onChange={(e) => props.onGoalChange({ ...g, deadline: e.target.value })}
            className="block w-full min-w-0 box-border rounded-xl border border-cream-300 bg-cream-50 px-3 py-3 text-base text-text-primary outline-none [appearance:none] focus:border-btc-orange focus:ring-2 focus:ring-btc-orange/30 sm:px-4"
          />
        </Field>
      </div>

      {/* See-results button. The plans below this card auto-recalculate as
          you type, but on a phone the keyboard covers them — so this button
          dismisses the keyboard (blurs the focused input) and scrolls to
          the strategy cards. Doubles as the "Calculate" affordance for
          users who expect an explicit commit step. */}
      <button
        type="button"
        onClick={() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          document
            .getElementById('plan-results')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        className="btc-grad mt-5 w-full rounded-xl px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
      >
        See updated plan ↓
      </button>

      <p className="mt-2 text-sm text-text-muted">
        Plans below recalculate as you change these — tap the button if the keyboard is covering them.
      </p>
    </div>
  );
}

function Field(props: { label: string; help?: string; children: React.ReactNode }) {
  // `min-w-0` so this grid cell is allowed to shrink below the intrinsic
  // width of its content (default would be `min-w-auto` which equals the
  // content min-width — that's what was blowing out the date input on iOS).
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-base font-medium text-text-primary">{props.label}</label>
      {props.children}
      {props.help && <div className="mt-1.5 text-base leading-relaxed text-text-muted">{props.help}</div>}
    </div>
  );
}
