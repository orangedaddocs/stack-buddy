import { useEffect } from 'react';
import type { AIStripState } from './PrivacyStrip.js';

export function AboutPanel(props: {
  open: boolean;
  onClose: () => void;
  aiState: AIStripState;
}) {
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How Stack Buddy works"
      onClick={props.onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/50 px-4 py-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[640px] max-h-[calc(100vh-4rem)] overflow-y-auto rounded-2xl border border-cream-300 bg-white p-7 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
              About Stack Buddy
            </div>
            <h2 className="text-2xl font-semibold text-text-primary">How this works</h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="shrink-0 rounded p-1.5 text-text-muted hover:bg-cream-100 hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <Section title="Local, math in plain sight">
          <p>
            Every number on this page comes from JavaScript in this repo. The pricing model is the <strong>Catch-Up Power Law</strong> (full writeup is in the Models tab). Your scenarios are JSON files on your disk. There's no account, no database, nothing syncing to the cloud.
          </p>
        </Section>

        <Section title="Optional AI">
          <p>
            The calculator doesn't need an LLM. AI is for what-ifs the canned model doesn't cover — things like "what if I get a $5K tax refund", "what if my income drops in 2027", "what would have to change for this to work". The numbers still come from the calculator; the LLM is for talking through scenarios.
          </p>
          <p>
            If you turn AI on, your scenario JSON goes to whichever provider you configured. Privacy is on them after that. Don't paste seed phrases, wallet addresses, or tax documents.
          </p>
          <div className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-base">
            {props.aiState === 'ai-on' && (
              <div>
                <span className="font-semibold text-text-primary">AI is on right now.</span>{' '}
                <span className="text-text-secondary">
                  Anything you ask the plan advisor or chat panel sends your scenario to your configured provider. Use the <strong>Turn off for this session</strong> link at the top of the page to pause it without restarting.
                </span>
              </div>
            )}
            {props.aiState === 'ai-paused' && (
              <div>
                <span className="font-semibold text-text-primary">AI is paused for this session.</span>{' '}
                <span className="text-text-secondary">
                  A provider is configured but Stack Buddy will not send anything until you re-enable it from the strip at the top of the page. Reload to fully reset.
                </span>
              </div>
            )}
            {props.aiState === 'local' && (
              <div>
                <span className="font-semibold text-text-primary">AI is off.</span>{' '}
                <span className="text-text-secondary">
                  Add an API key to <code className="rounded bg-cream-100 px-1 py-0.5 text-[0.92em]">.env</code> and restart <code className="rounded bg-cream-100 px-1 py-0.5 text-[0.92em]">npm run dev</code> if you want it on. See <code className="rounded bg-cream-100 px-1 py-0.5 text-[0.92em]">.env.example</code>.
                </span>
              </div>
            )}
            {props.aiState === 'checking' && (
              <div className="text-text-secondary">Checking…</div>
            )}
          </div>
        </Section>

        <Section title="Want private AI? Maple or Venice">
          <p>
            Two private AI hosts work well with Stack Buddy. Both keep your scenario out of the big LLM labs:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong className="text-text-primary">Maple AI</strong> — end-to-end encryption plus secure enclaves. Cryptographic proof that the server is running the audited code. Good if you want a permanent encrypted record synced across devices.
            </li>
            <li>
              <strong className="text-text-primary">Venice AI</strong> — zero-knowledge / local-first. Browser-only history, decentralized GPU inference. Good if you want stateless reasoning that leaves no trace.
            </li>
          </ul>
          <p>
            The simplest way to use either: paste the contents of <code className="rounded bg-cream-100 px-1.5 py-0.5 text-[0.92em] text-text-primary">private-ai/prompt.md</code> into a fresh chat, then paste your audit packet (the "Copy audit packet" button on the Plan tab). The prompt has the Catch-Up Power Law math, a worked example, and the posture rules. The AI has everything it needs to reason about your plan.
          </p>
          <p>
            The same prompt works in any LLM chat (Claude.ai, ChatGPT, local Ollama). The privacy posture is then whatever that host gives you.
          </p>
          <p className="text-base text-text-muted">
            Not affiliated with either. Just pointing at the options that fit Stack Buddy's posture.{' '}
            <a
              href="https://trymaple.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-btc-orange-end underline decoration-btc-orange/40 underline-offset-2 hover:decoration-btc-orange-end"
            >
              trymaple.ai ↗
            </a>{' '}
            ·{' '}
            <a
              href="https://venice.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-btc-orange-end underline decoration-btc-orange/40 underline-offset-2 hover:decoration-btc-orange-end"
            >
              venice.ai ↗
            </a>
          </p>
        </Section>

        <Section title="Or wire up an in-app chat panel">
          <p>
            If you want the chat to live inside Stack Buddy alongside the audit table:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong className="text-text-primary">Anthropic</strong> works out of the box. Set <code className="rounded bg-cream-100 px-1 py-0.5 text-[0.92em]">ANTHROPIC_API_KEY</code> in <code className="rounded bg-cream-100 px-1 py-0.5 text-[0.92em]">.env</code> and restart the dev server.
            </li>
            <li>
              <strong className="text-text-primary">Maple Local Proxy</strong> works too. Enable Local Proxy in the Maple desktop app, then set <code className="rounded bg-cream-100 px-1 py-0.5 text-[0.92em]">MAPLE_BASE_URL</code> and <code className="rounded bg-cream-100 px-1 py-0.5 text-[0.92em]">MAPLE_API_KEY</code> in <code className="rounded bg-cream-100 px-1 py-0.5 text-[0.92em]">.env</code>. Maple's models (Kimi, GLM, DeepSeek, Llama, GPT-OSS) show up in the chat panel's model picker.
            </li>
          </ul>
          <p className="text-base text-text-muted">
            Honestly, the paste path above is simpler AND more private. This in-app path is for users who specifically want the chat inside the app's UI.
          </p>
        </Section>

        <Section title="What this isn't">
          <p className="text-text-muted">
            Not financial, tax, or legal advice. Not a price prediction. Not a Monte Carlo simulator. Not a SaaS. The Catch-Up Power Law is a planning assumption; change it and the plan changes. See <code className="rounded bg-cream-100 px-1.5 py-0.5 text-[0.92em] text-text-primary">DISCLAIMER.md</code> and <code className="rounded bg-cream-100 px-1.5 py-0.5 text-[0.92em] text-text-primary">PRIVACY.md</code>.
          </p>
        </Section>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-xl border border-cream-300 bg-white px-5 py-2.5 text-base font-semibold text-text-primary hover:border-btc-orange hover:text-btc-orange-end"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="mb-2 text-base font-semibold text-text-primary">{props.title}</h3>
      <div className="space-y-3 text-base leading-relaxed text-text-secondary">{props.children}</div>
    </div>
  );
}
