import Anthropic from '@anthropic-ai/sdk';
import type { TextBlockParam } from '@anthropic-ai/sdk/resources/messages';
import type { ChatChunk, ChatMessage, Scenario } from '../../shared/types.js';
import { buildSystemBlocks } from '../../shared/promptBuilder.js';

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// SDK v0.27 typed TextBlockParam without cache_control (only on beta path),
// but the API accepts it on the standard /messages endpoint. Augment minimally.
type CachedTextBlockParam = TextBlockParam & {
  cache_control?: { type: 'ephemeral' };
};

export const anthropicProvider = {
  name: 'anthropic' as const,
  available: client !== null,
  models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],

  async *chat(args: {
    model: string;
    scenario: Scenario;
    messages: ChatMessage[];
  }): AsyncIterable<ChatChunk> {
    if (!client) {
      yield { error: 'ANTHROPIC_API_KEY is not set' };
      return;
    }

    const { stable, volatile } = buildSystemBlocks(args.scenario);

    const stream = client.messages.stream({
      model: args.model,
      max_tokens: 4096,
      system: [
        { type: 'text', text: stable, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: volatile },
      ] as CachedTextBlockParam[],
      messages: args.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    try {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { text: event.delta.text };
        }
      }
      yield { done: true };
    } catch (e) {
      yield { error: e instanceof Error ? e.message : String(e) };
    }
  },
};
