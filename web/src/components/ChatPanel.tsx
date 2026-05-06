import { useEffect, useRef, useState } from 'react';
import type { ProviderInfo, ProviderName, Scenario } from '../../../shared/types.js';
import { useChat } from '../hooks/useChat.js';
import { api } from '../lib/api.js';
import { BtcShineSpinner } from './BtcShineSpinner.js';

const PROVIDER_DISPLAY: Record<ProviderName, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  maple: 'Maple',
};

const PROVIDER_ASSISTANT_LABEL: Record<ProviderName, string> = {
  anthropic: 'Claude',
  openai: 'OpenAI',
  maple: 'Maple',
};

export function ChatPanel(props: { scenario: Scenario; open: boolean; onClose: () => void }) {
  const { messages, send, streaming, provider, setProvider, model, setModel } = useChat(props.scenario);
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow the textarea up to ~12 lines as the user types.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = 320; // px
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [input]);

  // Pull the live provider list once. The chat panel only opens when at least
  // one provider is available (App.tsx hides the floating button otherwise),
  // but the *initial* provider/model defaults in useChat assume Anthropic.
  // If Anthropic isn't the actual available provider, snap to whichever is.
  useEffect(() => {
    let cancelled = false;
    api.providers().then((list) => {
      if (cancelled) return;
      setProviders(list);
      const current = list.find((p) => p.name === provider);
      if (!current?.available || !current.models.includes(model)) {
        const fallback = list.find((p) => p.available && p.models.length > 0);
        if (fallback) {
          setProvider(fallback.name);
          setModel(fallback.models[0]!);
        }
      }
    }).catch(() => {});
    return () => { cancelled = true; };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!props.open) return null;

  const submit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await send(text);
  };

  const widthClass = expanded ? 'w-[min(960px,90vw)]' : 'w-[640px] max-w-full';
  const assistantLabel = PROVIDER_ASSISTANT_LABEL[provider] ?? 'Assistant';
  const availableProviders = (providers ?? []).filter((p) => p.available && p.models.length > 0);

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 flex flex-col border-l border-cream-300 bg-white shadow-xl ${widthClass}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-cream-200 px-5 py-4">
        <div>
          <div className="text-base font-semibold text-text-primary">Ask Stack Buddy</div>
          <div className="mt-0.5 text-base text-text-muted">
            Scenario: {props.scenario.slug} · model has full plan context
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded p-1.5 text-text-muted hover:bg-cream-100"
            title={expanded ? 'Shrink panel' : 'Expand panel'}
          >
            {expanded ? '⇥' : '⇤'}
          </button>
          <button
            onClick={props.onClose}
            className="rounded p-1.5 text-text-muted hover:bg-cream-100"
            title="Close"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="border-b border-cream-200 bg-cream-50 px-5 py-3">
        <label className="mr-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Model
        </label>
        <select
          value={`${provider}/${model}`}
          onChange={(e) => {
            const [p, m] = e.target.value.split('/');
            if (p && m) {
              setProvider(p as ProviderName);
              setModel(m);
            }
          }}
          className="rounded-lg border border-cream-300 bg-white px-2.5 py-1.5 text-base font-semibold text-text-primary outline-none focus:border-btc-orange"
        >
          {availableProviders.length === 0 && (
            <option value={`${provider}/${model}`} disabled>
              No providers configured
            </option>
          )}
          {availableProviders.map((p) => (
            <optgroup key={p.name} label={PROVIDER_DISPLAY[p.name] ?? p.name}>
              {p.models.map((m) => (
                <option key={`${p.name}/${m}`} value={`${p.name}/${m}`}>
                  {m}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="text-base italic text-text-muted">
            Ask Stack Buddy anything about your plan. Your scenario is attached.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            <div
              className={`text-sm font-semibold uppercase tracking-wide text-text-muted ${
                m.role === 'user' ? 'text-right pr-1' : ''
              }`}
            >
              {m.role === 'user' ? 'You' : assistantLabel}
            </div>
            <div
              className={`whitespace-pre-wrap text-base leading-relaxed ${
                m.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-cream-100 px-4 py-3 text-text-primary'
                  : 'max-w-[92%] rounded-2xl rounded-tl-md border border-cream-200 bg-white px-[18px] py-3.5 text-text-primary'
              }`}
            >
              {m.content
                ? m.content
                : streaming && i === messages.length - 1
                  ? (
                    <span className="inline-flex items-center gap-2 text-text-muted">
                      <BtcShineSpinner size={22} />
                      <span className="italic">Thinking…</span>
                    </span>
                  )
                  : ''}
            </div>
          </div>
        ))}
      </div>

      <form
        className="flex items-end gap-2 border-t border-cream-200 px-5 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl + Enter sends; plain Enter inserts a newline so users
            // can write multi-line prompts comfortably.
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="Ask Stack Buddy about your plan… (Cmd/Ctrl+Enter to submit)"
          className="min-h-[56px] flex-1 resize-none overflow-y-auto rounded-xl border border-cream-300 bg-white px-3.5 py-2.5 text-base text-text-primary outline-none focus:border-btc-orange focus:ring-2 focus:ring-btc-orange/30"
        />
        <button
          type="submit"
          disabled={streaming || input.trim().length === 0}
          className="btc-grad shrink-0 rounded-xl px-5 py-3 text-base font-semibold text-white shadow-[0_2px_8px_rgba(247,147,26,0.25)] disabled:opacity-50"
        >
          Submit chat
        </button>
      </form>
    </aside>
  );
}
