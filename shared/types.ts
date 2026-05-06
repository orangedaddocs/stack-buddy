// shared/types.ts
export type SchemaVersion = 1;

export type Frequency = 'monthly' | 'quarterly' | 'annual';
export type BtcModelType = 'catch_up' | 'b1m' | 'santostasi' | 'custom';
export type BaseModel = 'b1m' | 'santostasi' | 'custom';
export type LockField = 'burn_annual' | 'revenue' | 'profit' | 'estimated_taxes' | 'cash_reserve';
export type InflationApplyTo = 'burn_annual' | 'revenue' | 'cash_reserve';
export type TimeUnit = 'days' | 'years';

export type CustomModel = {
  coefficient: number;
  exponent: number;
  time_unit: TimeUnit;
};

export type BtcModelConfig = {
  type: BtcModelType;
  current_price: number;
  current_date: string;
  catch_up_date: string;
  catch_up_multiplier: number;
  post_catchup_multiplier: number;
  base_model: BaseModel;
  custom: CustomModel | null;
};

export type YearAssumptions = {
  year: number;
  revenue: number;
  profit: number;
  estimated_taxes: number;
  burn_annual: number;
  burn_active_months: number;
  cash_reserve: number;
  locks: LockField[];
};

export type ContributionSchedule = {
  frequency: Frequency;
  amount_per_period: number;
  start_date: string;
  end_date: string;
};

export type LumpSum = {
  date: string;
  amount: number;
  label: string;
};

export type ScenarioOptions = {
  allow_deficit_plan: boolean;
  solver_uniform_tax_rate: number | null;
  solver_uniform_margin: number | null;
};

export type Scenario = {
  schema_version: SchemaVersion;
  slug: string;
  name: string;
  created: string;
  updated: string;
  plan: { start_date: string; end_date: string; five_year_mark: string };
  goal: { starting_btc: number; target_btc: number };
  btc_model: BtcModelConfig;
  years: YearAssumptions[];
  inflation: { rate: number; apply_to: InflationApplyTo[] };
  contributions: ContributionSchedule;
  lump_sums: LumpSum[];
  options: ScenarioOptions;
  notes: string;
};

// Chat
export type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

export type ChatChunk = {
  text?: string;
  done?: boolean;
  error?: string;
};

export type ProviderName = 'anthropic' | 'openai' | 'maple';

export type ProviderInfo = {
  name: ProviderName;
  available: boolean;
  models: string[];
};

export type ModelInfo = {
  id: string;
  provider: ProviderName;
  display: string;
};

export type ChatTranscript = {
  slug: string;
  created: string;
  provider: ProviderName;
  model: string;
  scenario_ref: string;
  messages: ChatMessage[];
};

// Plan tab — goal-driven AI planner
export type PlanRecurringShape = 'front_load' | 'monthly' | 'none';
export type PlanStrategyKind = 'front_load' | 'monthly' | 'lump_sums';
export type PlanFeasibility =
  | 'comfortable'
  | 'manageable'
  | 'tight'
  | 'very_tight'
  | 'unfunded';

export type PlanGoal = {
  target_btc: number;
  deadline: string; // ISO YYYY-MM-DD
};

export type PlanRecurring = {
  shape: PlanRecurringShape;
  amount_per_month: number;
  // Per-year normalized weights when shape === 'front_load'.
  // E.g. [0.35, 0.25, 0.20, 0.125, 0.075] front-loads a 5-year horizon.
  front_load_weights?: number[];
};

export type PlanState = {
  goal: PlanGoal;
  starting_btc: number;
  recurring: PlanRecurring;
  lump_sums: LumpSum[];
};

export type PlanStrategy = {
  kind: PlanStrategyKind;
  recurring: PlanRecurring;
  lump_sums: LumpSum[];
  projected_btc: number;
  total_dollars: number;
  feasibility: PlanFeasibility;
  rationale: string;
};

export type PlanAdviseRequest = {
  goal: PlanGoal;
  starting_btc: number;
  monthly_available_usd: number;
  current_btc_price: number;
  scenario: Scenario;
  /**
   * Optional free-form note from the user that gets appended to Claude's
   * context for this advise call. Lets the user steer subsequent re-advise
   * passes ("focus on monthly DCA", "I have a $50K bonus in Q3", etc.)
   * without baking those into the structured goal.
   */
  user_notes?: string;
};

export type PlanAdviseResponse = {
  strategies: PlanStrategy[];
};
