import { useState } from 'react';
import { parseNumeric, clamp } from '../lib/numberInput.js';

/**
 * Number input that shows comma-formatted thousands when blurred,
 * raw digits while focused. Avoids the cursor-jumping / value-corruption
 * that controlled comma-formatted inputs cause when typing over an
 * existing value.
 *
 * Bounds: pass `min` / `max` to clamp the parsed value before it flows
 * to onChange. With `min={0}`, negatives are silently coerced to 0 — the
 * cleanest way to express "this field can't be negative" without state
 * gymnastics. Magnitude suffixes ("$2K", "2.5m", "1,000", "1_000") are
 * accepted by the parser; bare numeric input still works exactly as
 * before.
 */
export function NumberInput(props: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
  placeholder?: string;
  maximumFractionDigits?: number;
  min?: number;
  max?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>('');

  // When a placeholder is provided and the value is 0, render the field as
  // empty so the placeholder shows through (the "blank" state). Without a
  // placeholder, 0 is a real value and renders as "0".
  const treatZeroAsBlank = props.placeholder !== undefined && props.value === 0;

  const display = focused
    ? draft
    : treatZeroAsBlank
      ? ''
      : Number.isFinite(props.value)
        ? props.value.toLocaleString('en-US', {
            maximumFractionDigits: props.maximumFractionDigits ?? 4,
          })
        : '';

  return (
    <div className="flex items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 focus-within:border-btc-orange focus-within:ring-2 focus-within:ring-btc-orange/30">
      {props.prefix && <span className="text-base text-text-muted">{props.prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={props.placeholder}
        onFocus={() => {
          setDraft(Number.isFinite(props.value) && !treatZeroAsBlank ? String(props.value) : '');
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = parseNumeric(raw);
          if (parsed === null) {
            // Empty or partial input ("-", ".", etc) writes 0 — same
            // behavior as the original component, but now we also clamp
            // 0 in case min > 0.
            props.onChange(clamp(0, props.min, props.max));
            return;
          }
          props.onChange(clamp(parsed, props.min, props.max));
        }}
        className="flex-1 bg-transparent text-base text-text-primary outline-none tabular-nums placeholder:text-text-muted/60"
      />
      {props.suffix && <span className="text-base text-text-muted">{props.suffix}</span>}
    </div>
  );
}
