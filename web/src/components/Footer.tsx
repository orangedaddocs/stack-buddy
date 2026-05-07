// Footer surfaces three things: a back-to-top affordance, contact rails
// (Lightning tip + Nostr identity for the Bitcoin/Nostr-native audience),
// and a docs link to the README. Items wrap naturally on mobile.

export function Footer() {
  return (
    <footer className="border-t border-cream-300 bg-cream-50">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 text-sm text-text-muted sm:px-8">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="hover:text-btc-orange-end"
        >
          ↑ Back to top
        </button>

        {/* Lightning address — clicks via lightning: URI scheme will open
            the user's wallet (Strike, Alby, Phoenix, Zeus, etc.). The full
            address stays visible so non-Lightning users can copy it. */}
        <a
          href="lightning:orangedad@rizful.com"
          className="inline-flex items-center gap-1.5 hover:text-btc-orange-end"
        >
          <span className="text-base text-btc-orange-end" aria-hidden="true">
            ⚡
          </span>
          orangedad@rizful.com
        </a>

        {/* Nostr NIP-05 — opens the profile via njump.me, which resolves
            the address to whatever Nostr client/relay the visitor uses. */}
        <a
          href="https://njump.me/orangedad85@happytavern.co"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-[#a855f7]"
        >
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#a855f7] text-[10px] font-bold leading-none text-white"
            aria-hidden="true"
          >
            N
          </span>
          orangedad85@happytavern.co
        </a>

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
