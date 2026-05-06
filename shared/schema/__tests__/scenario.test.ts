import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ScenarioSchema } from '../scenario.js';

const VALID: unknown = {
  schema_version: 1,
  slug: 'sample',
  name: 'Sample 6 BTC Five-Year Plan',
  created: '2026-04-27',
  updated: '2026-04-27',
  plan: { start_date: '2026-07-01', end_date: '2031-12-31', five_year_mark: '2031-06-30' },
  goal: { starting_btc: 0, target_btc: 6.0 },
  btc_model: {
    type: 'catch_up',
    current_price: 78000,
    current_date: '2026-05-01',
    catch_up_date: '2028-06-30',
    catch_up_multiplier: 1.0,
    post_catchup_multiplier: 1.0,
    base_model: 'b1m',
    custom: null,
  },
  years: [
    {
      year: 2026,
      revenue: 1000000,
      profit: 700000,
      estimated_taxes: 238000,
      burn_annual: 265000,
      burn_active_months: 6,
      cash_reserve: 0,
      locks: [],
    },
  ],
  inflation: { rate: 0.055, apply_to: ['burn_annual'] },
  contributions: {
    frequency: 'quarterly',
    amount_per_period: 75000,
    start_date: '2027-01-01',
    end_date: '2031-12-31',
  },
  lump_sums: [{ date: '2026-07-01', amount: 16000, label: 'Initial' }],
  options: { allow_deficit_plan: false, solver_uniform_tax_rate: null, solver_uniform_margin: null },
  notes: 'Notes here.',
};

describe('ScenarioSchema', () => {
  it('parses a valid scenario', () => {
    expect(() => ScenarioSchema.parse(VALID)).not.toThrow();
  });

  it('rejects schema_version != 1', () => {
    const bad = { ...(VALID as object), schema_version: 2 };
    expect(() => ScenarioSchema.parse(bad)).toThrow();
  });

  it('rejects estimated_taxes > profit', () => {
    const bad = { ...(VALID as object), years: [{ ...(VALID as any).years[0], estimated_taxes: 800000 }] };
    expect(() => ScenarioSchema.parse(bad)).toThrow();
  });

  it('rejects burn_active_months > 12', () => {
    const bad = { ...(VALID as object), years: [{ ...(VALID as any).years[0], burn_active_months: 13 }] };
    expect(() => ScenarioSchema.parse(bad)).toThrow();
  });

  it('rejects btc_model.custom non-null when type !== "custom"', () => {
    const bad = {
      ...(VALID as object),
      btc_model: {
        ...(VALID as any).btc_model,
        type: 'b1m',
        custom: { coefficient: 1, exponent: 5, time_unit: 'days' },
      },
    };
    expect(() => ScenarioSchema.parse(bad)).toThrow();
  });

  it('accepts btc_model.custom when type === "custom"', () => {
    const ok = {
      ...(VALID as object),
      btc_model: {
        ...(VALID as any).btc_model,
        type: 'custom',
        custom: { coefficient: 0.0142, exponent: 5.616, time_unit: 'years' },
      },
    };
    expect(() => ScenarioSchema.parse(ok)).not.toThrow();
  });

  it('rejects solver_uniform_tax_rate >= 1', () => {
    const bad = {
      ...(VALID as object),
      options: { ...(VALID as any).options, solver_uniform_tax_rate: 1.0 },
    };
    expect(() => ScenarioSchema.parse(bad)).toThrow();
  });
});

describe('default scenario file', () => {
  it('parses successfully', () => {
    const here = import.meta.dirname;
    const path = resolve(here, '../../../scenarios/default.json');
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    expect(() => ScenarioSchema.parse(raw)).not.toThrow();
  });
});
