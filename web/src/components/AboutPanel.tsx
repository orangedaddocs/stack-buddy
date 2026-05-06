import { useEffect } from 'react';

export function AboutPanel(props: { open: boolean; onClose: () => void }) {
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
            Every number on this page comes from JavaScript in this repo. The pricing model is the <strong>Catch-Up Power Law</strong> (full writeup is in the Models tab). Your scenarios are JSON files on your disk. There's no account, no database, no AI, nothing syncing to the cloud.
          </p>
        </Section>

        <Section title="Want to talk through your plan with an AI?">
          <p>
            Stack Buddy itself is deterministic — the calculator does not call any LLM. If you want to reason through your plan with an AI, the privacy-respecting path is to paste{' '}
            <code className="rounded bg-cream-100 px-1.5 py-0.5 text-[0.92em] text-text-primary">private-ai/prompt.md</code>{' '}
            into a private AI host:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong className="text-text-primary">Maple AI</strong> — end-to-end encryption plus secure enclaves. Cryptographic proof the server runs the audited code.
            </li>
            <li>
              <strong className="text-text-primary">Venice AI</strong> — zero-knowledge / local-first. Browser-only history, decentralized GPU inference.
            </li>
          </ul>
          <p>
            The prompt has the Catch-Up Power Law math, a worked example, and the posture rules. Hand it your audit packet (the "Copy audit packet" button on the Plan tab) and ask away. The same prompt also works in Claude.ai, ChatGPT, or a local Ollama session — privacy is then whatever that host gives you.
          </p>
          <p className="text-base text-text-muted">
            Not affiliated with either.{' '}
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
