import { useEffect, useState } from 'react';
import { DEFAULT_SPOT_ANCHOR_PRICE } from '../../../shared/math/catchUp.js';
import { NumberInput } from './NumberInput.js';

export type SimpleInputs = {
  annualIncome: number;     // pre-tax take-home from the business
  taxRatePct: number;       // 0..100
  annualBurn: number;       // personal annual expenses
  annualSavings: number;    // cash set aside (not into BTC)
  btcPrice: number;         // override of live spot price
};

// Middle America $100K household: two-teacher / tradesperson profile.
// Income ~$100K (Missouri/Kansas median is ~$71K, so this is slightly above
// median). Tax rate 20% reflects MFJ at $100K with standard deduction —
// ~7.7% effective federal + 7.65% FICA + ~4–5% state. Expenses of $65K are
// realistic for a household with mortgage, two cars, kids in a Midwest market. Cash
// savings $5K is the non-BTC emergency-fund slice (separate from any 401k).
export const SIMPLE_DEFAULTS: SimpleInputs = {
  annualIncome: 100_000,
  taxRatePct: 20,
  annualBurn: 65_000,
  annualSavings: 5_000,
  btcPrice: DEFAULT_SPOT_ANCHOR_PRICE,
};

export function SimpleCard(props: {
  value: SimpleInputs;
  livePrice: number | null;
  onChange: (next: SimpleInputs) => void;
}) {
  const v = props.value;
  const set = <K extends keyof SimpleInputs>(k: K, n: number) =>
    props.onChange({ ...v, [k]: n });

  // Sync btcPrice to live price ONCE when it first arrives, unless user has
  // overridden. Intentionally only depends on livePrice — we don't want this
  // to re-fire whenever `v` or `props` get a new reference (would loop).
  const [touchedPrice, setTouchedPrice] = useState(false);
  useEffect(() => {
    if (!touchedPrice && props.livePrice && Number.isFinite(props.livePrice)) {
      props.onChange({ ...v, btcPrice: Math.round(props.livePrice) });
    }

  }, [props.livePrice]);

  return (
    <div className="rounded-[20px] border border-cream-300 bg-white p-7">
      <div className="mb-3 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
        Annual numbers
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Annual income (pre-tax)"
          help="Rough numbers are fine. If you'd rather not enter gross income, enter after-tax income and set the tax rate to 0%."
        >
          <NumberInput
            value={v.annualIncome}
            onChange={(n) => set('annualIncome', n)}
            prefix="$"
            placeholder="e.g. 100,000"
            min={0}
          />
        </Field>
        <Field label="Tax rate">
          <NumberInput
            value={v.taxRatePct}
            onChange={(n) => set('taxRatePct', n)}
            suffix="%"
            step="0.5"
            placeholder="e.g. 20"
            min={0}
            max={100}
          />
        </Field>
        <Field label="Annual expenses">
          <NumberInput
            value={v.annualBurn}
            onChange={(n) => set('annualBurn', n)}
            prefix="$"
            placeholder="e.g. 65,000"
            min={0}
          />
        </Field>
        <Field label="Annual cash savings (not BTC)">
          <NumberInput
            value={v.annualSavings}
            onChange={(n) => set('annualSavings', n)}
            prefix="$"
            placeholder="e.g. 5,000"
            min={0}
          />
        </Field>
      </div>

      <div className="mt-6 border-t border-cream-200 pt-5">
        <div className="mb-3 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
          BTC price
        </div>
        <Field
          label="Buy price (override)"
          help={
            props.livePrice
              ? `Live CoinGecko: $${props.livePrice.toLocaleString('en-US')} — click to use`
              : 'Live price unavailable'
          }
        >
          <div className="flex items-center gap-2">
            <NumberInput
              value={v.btcPrice}
              onChange={(n) => {
                setTouchedPrice(true);
                set('btcPrice', n);
              }}
              prefix="$"
              min={0}
            />
            {props.livePrice && Number.isFinite(props.livePrice) && (
              <button
                type="button"
                onClick={() => {
                  setTouchedPrice(false);
                  set('btcPrice', Math.round(props.livePrice as number));
                }}
                className="shrink-0 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm font-medium text-text-muted hover:border-btc-orange hover:text-btc-orange-end"
                title="Use the live CoinGecko price"
              >
                ↻ live
              </button>
            )}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field(props: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="mb-1.5 block text-base font-medium text-text-primary">{props.label}</label>
      {props.children}
      {props.help && <div className="mt-1 text-base text-text-muted">{props.help}</div>}
    </div>
  );
}
