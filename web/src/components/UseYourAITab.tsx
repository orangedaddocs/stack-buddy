// "Use Your Own AI" pillar body. Curated step-by-step UI (3 step cards +
// host comparison grid + warn callout) — distinct from the long-form README
// at private-ai/README.md, which stays the authoritative deep doc.
//
// The download button serves /prompt.md from web/public/, which mirrors
// private-ai/prompt.md verbatim. The `prompt:check` npm script (wired as
// pretest in package.json) diffs the two and fails CI on drift; resync
// after editing private-ai/prompt.md with `npm run prompt:sync`.

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
            url="https://trymaple.ai"
            privacy="E2E encryption + secure enclaves"
            payTag="Pay with BTC ✓"
            payAccent
          />
          <HostCard
            name="Venice AI"
            url="https://venice.ai"
            privacy="Browser-only, zero-knowledge"
            payTag="USD only"
          />
          <HostCard
            name="PPQ.ai"
            url="https://ppq.ai"
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

      <StepCard num="3" title="Tell the AI your situation">
        <p className="text-base leading-relaxed text-text-secondary">
          Two ways to give the AI your context — pick whichever feels easier.
        </p>

        <div className="mt-4 rounded-xl border border-cream-300 bg-cream-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-btc-orange-end">
            Option A — Paste your plan as JSON
          </div>
          <p className="mt-2 text-base leading-relaxed text-text-secondary">
            Open <span className="font-semibold text-text-primary">Three Approaches</span> and scroll to the bottom. In the <span className="font-semibold text-text-primary">"Every buy"</span> panel header (it's the last card on the page), tap <span className="font-semibold text-text-primary">Copy this plan</span>. That puts your full plan — target, deadline, schedule, every priced buy — on the clipboard as JSON. Paste it to the AI as your next message.
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-cream-300 bg-cream-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-btc-orange-end">
            Option B — Just type your situation
          </div>
          <p className="mt-2 text-base leading-relaxed text-text-secondary">
            If you'd rather skip the JSON, describe your scenario in plain English. Something like:
          </p>
          <blockquote className="mt-3 rounded-lg border-l-4 border-btc-orange-end bg-white px-4 py-3 text-base italic leading-relaxed text-text-secondary">
            "I want to stack 1 BTC by December 31, 2030. I can put about $2,500 a month toward Bitcoin, plus a $5,000 lump every spring from my tax refund. What approach makes the most sense?"
          </blockquote>
          <p className="mt-3 text-sm text-text-muted">
            Mention your <span className="font-semibold text-text-primary">target</span> (how much BTC), your <span className="font-semibold text-text-primary">deadline</span>, and what cash you can deploy (monthly, lumps, both). The prompt does the math — you provide the situation.
          </p>
        </div>
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
  url: string;
  privacy: string;
  payTag: string;
  payAccent?: boolean;
}) {
  // Anchor (not button) so right-click "open in new tab", middle-click,
  // and copy-link-address all work — these are external destinations,
  // not in-app actions.
  return (
    <a
      href={props.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-cream-300 bg-cream-50 p-3 transition hover:border-btc-orange-end hover:bg-cream-100 hover:shadow-sm"
    >
      <div className="text-base font-semibold text-text-primary">
        {props.name} <span className="text-xs font-normal text-text-muted">↗</span>
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
    </a>
  );
}
