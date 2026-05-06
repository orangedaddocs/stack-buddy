type Option<T extends string> = { value: T; title: string; meta?: string };

export function PillToggle<T extends string>(props: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`grid gap-2 ${props.className ?? ''}`} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(120px, 1fr))` }}>
      {props.options.map((o) => {
        const selected = o.value === props.value;
        return (
          <button
            key={o.value}
            onClick={() => props.onChange(o.value)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              selected
                ? 'border-btc-orange bg-cream-50 ring-1 ring-btc-orange'
                : 'border-cream-300 bg-white hover:border-cream-400'
            }`}
          >
            <div className="text-base font-semibold text-text-primary">{o.title}</div>
            {o.meta && <div className="text-sm text-text-muted">{o.meta}</div>}
          </button>
        );
      })}
    </div>
  );
}
