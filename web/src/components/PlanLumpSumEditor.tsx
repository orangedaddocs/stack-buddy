import { useState } from 'react';
import type { LumpSum } from '../../../shared/types.js';
import { formatUSD } from '../../../shared/math/format.js';
import { parseNumeric, clamp } from '../lib/numberInput.js';

export function PlanLumpSumEditor(props: {
  value: LumpSum[];
  onChange: (next: LumpSum[]) => void;
}) {
  const total = props.value.reduce((acc, ls) => acc + ls.amount, 0);
  const [draftDate, setDraftDate] = useState<string>('2027-04-15');
  const [draftAmount, setDraftAmount] = useState<number>(0);
  const [draftLabel, setDraftLabel] = useState<string>('');

  const add = () => {
    if (!draftDate || draftAmount <= 0) return;
    const next = [
      ...props.value,
      { date: draftDate, amount: draftAmount, label: draftLabel || 'Dated buy' },
    ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    props.onChange(next);
    setDraftAmount(0);
    setDraftLabel('');
  };

  const remove = (idx: number) => {
    const next = props.value.filter((_, i) => i !== idx);
    props.onChange(next);
  };

  const update = (idx: number, patch: Partial<LumpSum>) => {
    const next = props.value.map((ls, i) => (i === idx ? { ...ls, ...patch } : ls));
    next.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    props.onChange(next);
  };

  return (
    <div className="rounded-[20px] border border-cream-300 bg-white p-7">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-base font-bold uppercase tracking-[0.06em] text-text-muted">
          Dated buys
        </div>
        <div className="text-base text-text-muted">
          {props.value.length === 0 ? 'None yet' : `${props.value.length} · ${formatUSD(total)} total`}
        </div>
      </div>

      {props.value.length > 0 && (
        <div className="mb-4 space-y-2">
          {props.value.map((ls, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[140px_1fr_minmax(140px,1fr)_auto] items-center gap-3 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2"
            >
              <input
                type="date"
                value={ls.date}
                onChange={(e) => update(idx, { date: e.target.value })}
                className="rounded-lg border border-cream-300 bg-white px-2 py-1.5 text-base text-text-primary outline-none focus:border-btc-orange"
              />
              <div className="min-w-0">
                <NumberInputCompact
                  value={ls.amount}
                  onChange={(n) => update(idx, { amount: n })}
                />
              </div>
              <input
                type="text"
                value={ls.label}
                placeholder="Label (e.g. Bonus)"
                onChange={(e) => update(idx, { label: e.target.value })}
                className="rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-base text-text-primary outline-none focus:border-btc-orange"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="shrink-0 rounded-lg px-2 py-1 text-base text-text-muted hover:text-error"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[140px_1fr_minmax(140px,1fr)_auto] items-end gap-3 border-t border-cream-200 pt-4">
        <div>
          <label className="mb-1 block text-base font-medium text-text-muted">Date</label>
          <input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            className="w-full rounded-lg border border-cream-300 bg-white px-2 py-1.5 text-base text-text-primary outline-none focus:border-btc-orange"
          />
        </div>
        <div>
          <label className="mb-1 block text-base font-medium text-text-muted">Amount</label>
          <NumberInputCompact value={draftAmount} onChange={setDraftAmount} />
        </div>
        <div>
          <label className="mb-1 block text-base font-medium text-text-muted">Label</label>
          <input
            type="text"
            value={draftLabel}
            placeholder="e.g. Bonus, Tax refund"
            onChange={(e) => setDraftLabel(e.target.value)}
            className="w-full rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-base text-text-primary outline-none focus:border-btc-orange"
          />
        </div>
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-base font-medium text-text-primary hover:border-btc-orange hover:text-btc-orange-end"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function NumberInputCompact(props: { value: number; onChange: (n: number) => void }) {
  // Tighter version of NumberInput for inline rows.
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-3 py-1.5 focus-within:border-btc-orange focus-within:ring-2 focus-within:ring-btc-orange/30">
      <span className="text-base text-text-muted">$</span>
      <NumberInputBare value={props.value} onChange={props.onChange} />
    </div>
  );
}

function NumberInputBare(props: { value: number; onChange: (n: number) => void }) {
  // Lump amounts are always non-negative; the editor's `add` filter rejects
  // <= 0, so a clamp to 0 here is a no-op for the persisted lump and keeps
  // the on-screen value sane while the user is typing.
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>('');
  const display = focused
    ? draft
    : Number.isFinite(props.value)
      ? props.value.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : '';
  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onFocus={() => {
        setDraft(Number.isFinite(props.value) ? String(props.value) : '');
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const parsed = parseNumeric(raw);
        if (parsed === null) {
          props.onChange(0);
          return;
        }
        props.onChange(clamp(parsed, 0));
      }}
      className="w-full bg-transparent text-base text-text-primary outline-none tabular-nums"
    />
  );
}
