import { formatUSD } from '../../../shared/math/format.js';
import { cashUsageLabel, cashUsageLabelText } from '../../../shared/math/cashFlow.js';

export function PlanFeasibilityNote(props: {
  totalDeployed: number;
  monthsToDeadline: number;
  monthlyAvailableUSD: number;
}) {
  const monthsAvailable = Math.max(0, props.monthsToDeadline);
  const totalAvailable = Math.max(0, props.monthlyAvailableUSD) * monthsAvailable;

  // No deployment AND no income → nothing to say.
  if (props.totalDeployed <= 0 && totalAvailable <= 0) return null;

  // Income is zero but plan still wants to deploy: flat unfunded.
  if (totalAvailable <= 0) {
    return (
      <div className="rounded-2xl border border-error/40 bg-[#fbe9e6] px-5 py-4 text-lg text-error">
        <div className="font-semibold">
          Funding gap — this target-reaching plan deploys {formatUSD(props.totalDeployed)}, but your Simple-tab BTC budget is $0/month.
        </div>
        <div className="mt-1 text-base opacity-80">
          The plan math still works; the cash-flow inputs say you would need new income, lower expenses, or a smaller target.
        </div>
      </div>
    );
  }

  const ratio = props.totalDeployed / totalAvailable;

  const band = cashUsageLabel(ratio);

  const styles =
    band === 'comfortable'
      ? 'border-cream-300 bg-cream-50 text-text-secondary'
      : band === 'manageable'
        ? 'border-[#d4c4a8] bg-[#fffaf0] text-[#6b604d]'
      : band === 'tight'
        ? 'border-[#d4a574] bg-[#fdf6ec] text-[#7a5a40]'
        : band === 'very_tight'
          ? 'border-[#d9814e] bg-[#fff3e8] text-[#9a4f1d]'
        : 'border-error/40 bg-[#fbe9e6] text-error';

  const fundingGap = Math.max(0, props.totalDeployed - totalAvailable);
  const verdict =
    band === 'unfunded'
      ? `Funding gap — this target-reaching plan needs ${pct(ratio)} of your available BTC budget.`
      : `${cashUsageLabelText(band)} — this plan uses ${pct(ratio)} of your available BTC budget.`;
  const detail =
    band === 'unfunded'
      ? `It reaches the BTC target by deploying ${formatUSD(props.totalDeployed)}, which is ${formatUSD(fundingGap)} more than current Simple-tab cash flow across ${monthsAvailable} months.`
      : `Plan needs ${formatUSD(props.totalDeployed)} over ${monthsAvailable} months. Your Simple-tab cash flow projects ${formatUSD(totalAvailable)} available across the same window.`;

  return (
    <div className={`rounded-2xl border px-5 py-4 text-lg ${styles}`}>
      <div className="font-semibold">{verdict}</div>
      <div className="mt-1 text-base opacity-80">
        {detail}
      </div>
    </div>
  );
}

function pct(r: number): string {
  if (!Number.isFinite(r)) return '—';
  return `${Math.round(r * 100)}%`;
}
