// "Use Your Own AI" pillar body. Curated step-by-step UI (3 step cards +
// host comparison grid + warn callout) — distinct from the long-form README
// at private-ai/README.md, which stays the authoritative deep doc.
//
// The download button serves /prompt.md from web/public/, which mirrors
// private-ai/prompt.md verbatim. CI/dev should keep these two files
// byte-identical (see scripts/check-prompt-mirror.sh).

export function UseYourAITab() {
  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <div>
        <h2 className="mb-2 text-3xl font-bold leading-tight text-text-primary">
          Take this plan to a private LLM
        </h2>
        <p className="text-base leading-relaxed text-text-secondary">
          Stack Buddy never calls AI. To talk through your plan with one,
          follow these 3 steps.
        </p>
      </div>

      <StepCard num="1" title="Pick a private AI host">
        <p className="text-base leading-relaxed text-text-secondary">
          Three options that respect your privacy:
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <HostCard
            name="Maple AI"
            privacy="E2E encryption + secure enclaves"
            payTag="Pay with BTC ✓"
            payAccent
          />
          <HostCard
            name="Venice AI"
            privacy="Browser-only, zero-knowledge"
            payTag="USD only"
          />
          <HostCard
            name="PPQ.ai"
            privacy="Pay-per-query proxy, no account"
            payTag="Pay with BTC ✓"
            payAccent
          />
        </div>
      </StepCard>

      <StepCard num="2" title="Download the catch-up prompt">
        <p className="text-base leading-relaxed text-text-secondary">
          Same Catch-Up Power Law math as the calculator, in text form.
        </p>
        <a
          href={`${import.meta.env.BASE_URL}prompt.md`}
          download="prompt.md"
          className="btc-grad mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          ↓ Download prompt.md
        </a>
      </StepCard>

      <StepCard num="3" title="Paste your plan as the next message">
        <p className="text-base leading-relaxed text-text-secondary">
          Use the <span className="font-semibold text-text-primary">Copy this plan</span> button on Three Approaches, or just type your numbers (target, deadline, monthly available).
        </p>
      </StepCard>

      <div className="rounded-2xl border border-error/40 bg-[#fbe9e6] px-5 py-4 text-base leading-relaxed text-error">
        <div className="font-semibold">⚠ What NOT to paste</div>
        <p className="mt-1">
          No seed phrases. No private keys. No exchange logins. Aggregate numbers (income, target, monthly available) are enough.
        </p>
      </div>

      <div className="text-center text-sm text-text-muted">
        <a
          href="https://github.com/orangedaddocs/stack-buddy/blob/main/private-ai/README.md"
          target="_blank"
          rel="noreferrer"
          className="hover:text-btc-orange-end"
        >
          More detail in the README ↗
        </a>
      </div>
    </div>
  );
}

function StepCard(props: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-cream-300 bg-white p-5 sm:p-6">
      <div className="btc-grad flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm">
        {props.num}
      </div>
      <div className="flex-1">
        <h3 className="mb-2 text-lg font-semibold leading-tight text-text-primary sm:text-xl">
          {props.title}
        </h3>
        {props.children}
      </div>
    </div>
  );
}

function HostCard(props: {
  name: string;
  privacy: string;
  payTag: string;
  payAccent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-cream-300 bg-cream-50 p-3">
      <div className="text-base font-semibold text-text-primary">
        {props.name}
      </div>
      <div className="mt-1 text-sm leading-snug text-text-secondary">
        {props.privacy}
      </div>
      <div
        className={
          props.payAccent
            ? 'mt-2 text-sm font-semibold text-btc-orange-end'
            : 'mt-2 text-sm text-text-muted'
        }
      >
        {props.payTag}
      </div>
    </div>
  );
}
