import type { PlanGoal } from '../../../shared/types.js';
import { NumberInput } from './NumberInput.js';

export function PlanGoalCard(props: {
  goal: PlanGoal;
  onGoalChange: (next: PlanGoal) => void;
}) {
  const g = props.goal;

  return (
    <div className="rounded-[20px] border border-cream-300 bg-white p-7">
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
          <input
            type="date"
            value={g.deadline}
            onChange={(e) => props.onGoalChange({ ...g, deadline: e.target.value })}
            className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-base text-text-primary outline-none focus:border-btc-orange focus:ring-2 focus:ring-btc-orange/30"
          />
        </Field>
      </div>
    </div>
  );
}

function Field(props: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-base font-medium text-text-primary">{props.label}</label>
      {props.children}
      {props.help && <div className="mt-1.5 text-base leading-relaxed text-text-muted">{props.help}</div>}
    </div>
  );
}
