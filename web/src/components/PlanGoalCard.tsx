import type { PlanGoal } from '../../../shared/types.js';
import { NumberInput } from './NumberInput.js';

export function PlanGoalCard(props: {
  goal: PlanGoal;
  userNotes: string;
  onGoalChange: (next: PlanGoal) => void;
  onUserNotesChange: (next: string) => void;
  onAskAI: () => void;
  loading: boolean;
  hasAdvice: boolean;
  aiAvailable: boolean | null;
  /**
   * Plan tab mode. The AI section in this card refers to the three
   * approach cards rendered below it in `approaches` mode. Hidden in
   * `custom` (Build manually) mode, where the user is editing the
   * schedule by hand and the AI explainer would be misleading.
   */
  planMode: 'approaches' | 'custom';
}) {
  const g = props.goal;
  const hasNotes = props.userNotes.trim().length > 0;
  const aiState: 'on' | 'off' | 'unknown' =
    props.aiAvailable === true ? 'on' : props.aiAvailable === false ? 'off' : 'unknown';
  const showAISection = props.planMode === 'approaches';

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

      {showAISection && aiState === 'on' && (
        <div className="mt-5 border-t border-cream-200 pt-5">
          <label className="mb-1.5 block text-base font-medium text-text-primary">
            Ask Stack Buddy AI
            <span className="ml-2 text-base font-normal text-text-muted">(optional)</span>
          </label>
          <p className="mb-3 text-base leading-relaxed text-text-secondary">
            The three approaches below are scaled locally to hit your target. Describe a limit, a bonus, a tax refund, or "front-load only" here and Stack Buddy AI will redo them with that in mind.
          </p>
          <textarea
            value={props.userNotes}
            onChange={(e) => props.onUserNotesChange(e.target.value)}
            rows={3}
            placeholder={
              props.hasAdvice
                ? 'e.g. Cap front-loaded buys at $3,000/month. Or: no dated buys, focus on monthly DCA.'
                : 'e.g. I want to front-load, but cap early buys at $3,000/month. Or: I expect a $10K bonus in Q3 of 2027.'
            }
            className="w-full resize-y rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-base text-text-primary placeholder:text-text-faint outline-none focus:border-btc-orange focus:ring-2 focus:ring-btc-orange/30"
          />

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={props.onAskAI}
              disabled={props.loading}
              className="btc-grad w-full rounded-xl px-7 py-3.5 text-base font-semibold text-white shadow-[0_4px_16px_rgba(247,147,26,0.28)] disabled:opacity-60 sm:w-auto sm:min-w-[320px] sm:shrink-0 sm:whitespace-nowrap"
            >
              {props.loading
                ? 'Asking Stack Buddy AI...'
                : props.hasAdvice
                  ? hasNotes
                    ? 'Stack Buddy AI, update my plan'
                    : 'Stack Buddy AI, revise my plan'
                  : 'Stack Buddy AI, tailor these approaches'}
            </button>
          </div>
        </div>
      )}
      {showAISection && aiState === 'off' && (
        <div className="mt-5 border-t border-cream-200 pt-5 text-base leading-relaxed text-text-muted">
          AI is off. The three approaches below are scaled locally to your target. Pick one, or switch to <span className="font-semibold text-text-primary">Build manually</span> to edit the schedule by hand. Add an API key to <code className="rounded bg-cream-100 px-1.5 py-0.5 text-[0.92em] text-text-primary">.env</code> if you want them tailored.
        </div>
      )}
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
