/**
 * Always-visible privacy state. Sits between the header and the tab content
 * so a first-time visitor knows whether their inputs are leaving the machine
 * before they read anything else on the page.
 *
 * Three states:
 *   - 'local'      — no provider is configured. Nothing leaves the computer.
 *                    Action affordances are about turning AI ON: a primary
 *                    "Wire up to AI" button (opens the explainer) and a
 *                    "Use in Maple" link (the privacy-conscious path).
 *   - 'ai-on'      — a provider is configured and the user has explicitly
 *                    enabled it for this session. Scenario JSON gets sent
 *                    when they ask. The action is "Pause for this session".
 *   - 'ai-paused'  — a provider is configured but AI is off for the session.
 *                    Treated like local-only at every UI boundary that sends
 *                    data. The action is "Re-enable AI".
 *
 * Doesn't render during initial provider probe — `state === 'checking'`
 * resolves to `null` so the strip doesn't briefly flash a wrong message.
 */
export type AIStripState = 'checking' | 'local' | 'ai-on' | 'ai-paused';

export function computeAIStripState(args: {
  aiAvailable: boolean | null;
  sessionEnabled: boolean;
}): AIStripState {
  if (args.aiAvailable === null) return 'checking';
  if (args.aiAvailable && args.sessionEnabled) return 'ai-on';
  if (args.aiAvailable && !args.sessionEnabled) return 'ai-paused';
  return 'local';
}

export function PrivacyStrip(props: {
  state: AIStripState;
  onToggleSession: () => void;
  onShowAbout: () => void;
}) {
  if (props.state === 'checking') return null;

  if (props.state === 'ai-on') {
    // Amber: data IS leaving the machine when the user asks.
    return (
      <div className="border-y border-[#d4a574] bg-[#fdf6ec]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6 py-3 text-base text-[#7a5a40]">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-lg">🤖</span>
            <span>
              <strong>AI is wired up</strong>
              <span className="ml-1 text-text-secondary">
                — your scenario gets sent to your configured AI provider when you ask.
              </span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={props.onToggleSession}
              className="rounded-lg border border-[#d4a574] bg-white px-3 py-1.5 text-base font-semibold text-[#7a5a40] hover:border-[#7a5a40] hover:bg-[#fdf6ec]"
            >
              Pause for this session
            </button>
            <button
              type="button"
              onClick={props.onShowAbout}
              className="text-base text-[#7a5a40] hover:underline"
            >
              How this works ↗
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 'local' or 'ai-paused' — both visually green/cream because nothing leaves
  // the machine in either state. The headline text and the primary action
  // differ. We deliberately don't link out to a specific provider here; the
  // About modal lays out Maple and Venice side by side and the user picks.
  const isPaused = props.state === 'ai-paused';
  return (
    <div className="border-y border-[#c9d8c0] bg-[#f0f5ec]">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6 py-3 text-base text-[#3a6b3a]">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">🔒</span>
          <span>
            <strong>
              {isPaused ? 'AI paused this session' : 'Running on your computer'}
            </strong>
            <span className="ml-1 text-text-secondary">
              {isPaused
                ? '. Nothing is being sent right now.'
                : '. Nothing leaves it. Want AI for what-ifs?'}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={isPaused ? props.onToggleSession : props.onShowAbout}
            className="rounded-lg border border-[#c9d8c0] bg-white px-3 py-1.5 text-base font-semibold text-[#3a6b3a] hover:border-[#3a6b3a] hover:bg-[#f0f5ec]"
          >
            {isPaused ? 'Re-enable AI' : 'Want AI? See how ↗'}
          </button>
          <button
            type="button"
            onClick={props.onShowAbout}
            className="text-base text-[#3a6b3a] hover:underline"
          >
            How this works ↗
          </button>
        </div>
      </div>
    </div>
  );
}
