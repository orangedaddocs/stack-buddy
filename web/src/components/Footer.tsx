// Small bottom strip linking out to the canonical "how this works" doc on
// GitHub. Replaces the in-app About modal — the AboutPanel content was
// drifting (it still mentioned in-app AI options that no longer exist), so
// the README is the single source of truth.

export function Footer() {
  return (
    <footer className="border-t border-cream-300 bg-cream-50">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-2 px-4 py-4 text-sm text-text-muted sm:flex-row sm:px-8">
        <span>Local-first BTC stacking planner</span>
        <a
          href="https://github.com/orangedaddocs/stack-buddy#readme"
          target="_blank"
          rel="noreferrer"
          className="hover:text-btc-orange-end"
        >
          How this works ↗
        </a>
      </div>
    </footer>
  );
}
