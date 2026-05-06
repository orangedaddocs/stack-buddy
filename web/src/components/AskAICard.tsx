// Imported via Vite's ?raw query — landed as a string at build time so the
// download works in dev AND in the production bundle without a separate
// file-copy step. The file at private-ai/prompt.md is the single source.
import promptText from '../../../private-ai/prompt.md?raw';

const PROMPT_FILENAME = 'catch-up-power-law-prompt.md';

// GitHub blob URLs so visitors who haven't cloned the repo can preview the
// files. The download button still hands them a local copy directly.
const REPO_BASE = 'https://github.com/orangedaddocs/stack-buddy/blob/main';
const PROMPT_GITHUB_URL = `${REPO_BASE}/private-ai/prompt.md`;
const README_GITHUB_URL = `${REPO_BASE}/private-ai/README.md`;

export function AskAICard() {
  const downloadPrompt = () => {
    const blob = new Blob([promptText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = PROMPT_FILENAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-[20px] border border-cream-300 bg-white p-6">
      <div className="mb-2 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
        Want a custom plan? Talk to an AI
      </div>
      <h3 className="mb-2 text-2xl font-semibold text-text-primary">
        Take the catch-up math somewhere private
      </h3>
      <p className="mb-4 text-base leading-relaxed text-text-secondary">
        The three approaches above were calculated by Stack Buddy's deterministic engine — no AI, no model. To talk through your specific situation with an AI that uses the same Catch-Up Power Law, download the prompt below and paste it into a private AI host.
      </p>

      <div className="mb-5 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={downloadPrompt}
          className="btc-grad inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-base font-semibold text-white shadow-[0_4px_16px_rgba(247,147,26,0.22)] hover:shadow-[0_6px_20px_rgba(247,147,26,0.32)]"
        >
          <span aria-hidden="true">↓</span>
          Download the catch-up prompt
        </button>
        <a
          href="https://trymaple.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-base font-medium text-text-primary hover:border-btc-orange hover:text-btc-orange-end"
        >
          Open Maple AI ↗
          <span className="text-sm font-semibold text-btc-orange-end">· pay with BTC</span>
        </a>
        <a
          href="https://venice.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-base font-medium text-text-primary hover:border-btc-orange hover:text-btc-orange-end"
        >
          Open Venice AI ↗
        </a>
        <a
          href="https://ppq.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-base font-medium text-text-primary hover:border-btc-orange hover:text-btc-orange-end"
        >
          Open PPQ.ai ↗
          <span className="text-sm font-semibold text-btc-orange-end">· pay with BTC</span>
        </a>
      </div>

      <p className="text-base leading-relaxed text-text-secondary">
        <strong className="text-text-primary">How to use it:</strong> open one of the chats above, attach (or paste) the downloaded{' '}
        <a
          href={PROMPT_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-cream-100 px-1 py-0.5 text-[0.92em] text-text-primary underline decoration-cream-400 underline-offset-2 hover:text-btc-orange-end hover:decoration-btc-orange"
          title="View the prompt file on GitHub"
        >
          {PROMPT_FILENAME}
        </a>
        , then describe your situation or paste your plan from below. Maple and PPQ accept Bitcoin payment; Venice is account-optional and decentralized. See{' '}
        <a
          href={README_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-cream-100 px-1 py-0.5 text-[0.92em] text-text-primary underline decoration-cream-400 underline-offset-2 hover:text-btc-orange-end hover:decoration-btc-orange"
        >
          private-ai/README.md ↗
        </a>{' '}
        for the full setup notes.
      </p>
    </div>
  );
}
