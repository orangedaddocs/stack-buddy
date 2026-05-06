import { z } from 'zod';

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

const LockField = z.enum([
  'burn_annual',
  'revenue',
  'profit',
  'estimated_taxes',
  'cash_reserve',
]);

const InflationApplyTo = z.enum(['burn_annual', 'revenue', 'cash_reserve']);

const CustomModelSchema = z.object({
  coefficient: z.number().finite().positive(),
  exponent: z.number().finite().positive(),
  time_unit: z.enum(['days', 'years']),
});

const BtcModelSchema = z
  .object({
    type: z.enum(['catch_up', 'b1m', 'santostasi', 'custom']),
    current_price: z.number().finite().positive(),
    current_date: ISO_DATE,
    catch_up_date: ISO_DATE,
    catch_up_multiplier: z.number().finite().positive(),
    post_catchup_multiplier: z.number().finite().positive(),
    base_model: z.enum(['b1m', 'santostasi', 'custom']),
    custom: CustomModelSchema.nullable(),
  })
  .refine((d) => (d.type === 'custom' ? d.custom !== null : d.custom === null), {
    message: 'btc_model.custom must be set iff type === "custom"',
  });

const YearSchema = z
  .object({
    year: z.number().int().min(2020).max(2050),
    revenue: z.number().finite().nonnegative(),
    profit: z.number().finite().nonnegative(),
    estimated_taxes: z.number().finite().nonnegative(),
    burn_annual: z.number().finite().nonnegative(),
    burn_active_months: z.number().int().min(1).max(12),
    cash_reserve: z.number().finite().nonnegative(),
    locks: z.array(LockField),
  })
  .refine((d) => d.estimated_taxes <= d.profit, {
    message: 'estimated_taxes must be ≤ profit',
  })
  .refine((d) => d.profit <= d.revenue, {
    message: 'profit must be ≤ revenue',
  });

const InflationSchema = z.object({
  rate: z.number().finite(),
  apply_to: z.array(InflationApplyTo),
});

const ContributionsSchema = z.object({
  frequency: z.enum(['monthly', 'quarterly', 'annual']),
  amount_per_period: z.number().finite().nonnegative(),
  start_date: ISO_DATE,
  end_date: ISO_DATE,
});

const LumpSumSchema = z.object({
  date: ISO_DATE,
  amount: z.number().finite().positive(),
  label: z.string(),
});

const OptionsSchema = z.object({
  allow_deficit_plan: z.boolean(),
  solver_uniform_tax_rate: z.number().finite().min(0).max(0.99).nullable(),
  solver_uniform_margin: z.number().finite().min(0.01).max(1).nullable(),
});

export const ScenarioSchema = z.object({
  schema_version: z.literal(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  name: z.string().min(1).max(200),
  created: ISO_DATE,
  updated: ISO_DATE,
  plan: z.object({
    start_date: ISO_DATE,
    end_date: ISO_DATE,
    five_year_mark: ISO_DATE,
  }),
  goal: z.object({
    starting_btc: z.number().finite().nonnegative(),
    target_btc: z.number().finite().positive(),
  }),
  btc_model: BtcModelSchema,
  years: z.array(YearSchema).min(1),
  inflation: InflationSchema,
  contributions: ContributionsSchema,
  lump_sums: z.array(LumpSumSchema),
  options: OptionsSchema,
  notes: z.string().max(50000),
});

export type ScenarioParsed = z.infer<typeof ScenarioSchema>;
