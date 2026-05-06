import { anthropicProvider } from './anthropic.js';
import { mapleProvider } from './maple.js';
import { openaiProvider } from './openai.js';

// All three providers are registered. `available` reflects whether their
// respective env var is set — the chat panel reads /api/providers to decide
// which models to surface, so leaving an env var unset just hides those
// models without breaking anything.
export const providers = {
  anthropic: anthropicProvider,
  maple: mapleProvider,
  openai: openaiProvider,
} as const;

export type ProviderName = keyof typeof providers;

export function getProvider(name: string) {
  return providers[name as ProviderName] ?? null;
}
