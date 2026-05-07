// "Want to play with this yourself?" callout that lives below every tab
// body and above the Footer. Encourages technical users to grab the source
// and run it locally / hand it to their coding AI of choice. Lives in App.tsx
// so it appears on every pillar (not inside any one tab body).

export function DownloadRepoCard() {
  return (
    <section className="border-t border-cream-300 bg-cream-50">
      <div className="mx-auto flex max-w-[1180px] flex-col items-start gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-10">
        <div className="flex-1">
          <h2 className="mb-1 text-xl font-semibold leading-tight text-text-primary sm:text-2xl">
            Want to play with this yourself?
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            Stack Buddy is open source. If you want to experiment in Claude Code, Codex, or your favorite coding AI, visit the repo and download everything. Enjoy.
          </p>
        </div>
        <a
          href="https://github.com/orangedaddocs/stack-buddy"
          target="_blank"
          rel="noreferrer"
          className="btc-grad shrink-0 rounded-xl px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          ↓ Get the code on GitHub
        </a>
      </div>
    </section>
  );
}
