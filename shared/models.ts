import type { ModelInfo } from './types.js';

export const MODELS: ModelInfo[] = [
  { id: 'claude-opus-4-7',   provider: 'anthropic', display: 'Claude Opus 4.7' },
  { id: 'claude-sonnet-4-6', provider: 'anthropic', display: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5',  provider: 'anthropic', display: 'Claude Haiku 4.5' },
  // MVP-2 (greyed out in UI until drivers ship):
  { id: 'gpt-5-4',           provider: 'openai',    display: 'GPT-5.4' },
  { id: 'kimi-k2.5',         provider: 'maple',     display: 'Maple · Kimi K2.5' },
  { id: 'gpt-oss-120b',      provider: 'maple',     display: 'Maple · GPT-OSS 120B' },
  { id: 'deepseek-r1-0528',  provider: 'maple',     display: 'Maple · DeepSeek R1' },
  { id: 'llama3-3-70b',      provider: 'maple',     display: 'Maple · Llama 3.3 70B' },
];

export function modelsForProvider(provider: string): ModelInfo[] {
  return MODELS.filter((m) => m.provider === provider);
}
