import OpenAI from 'openai';
import type { ChatChunk, ChatMessage, Scenario } from '../../shared/types.js';
import { buildSystemBlocks } from '../../shared/promptBuilder.js';

// Standard OpenAI API. baseURL defaults to api.openai.com.
const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

export const openaiProvider = {
  name: 'openai' as const,
  available: client !== null,
  models: ['gpt-5', 'gpt-5-mini', 'gpt-4o', 'gpt-4o-mini', 'o3-mini'],

  async *chat(args: {
    model: string;
    scenario: Scenario;
    messages: ChatMessage[];
  }): AsyncIterable<ChatChunk> {
    if (!client) {
      yield { error: 'OPENAI_API_KEY is not set' };
      return;
    }

    const { stable, volatile } = buildSystemBlocks(args.scenario);
    const systemContent = `${stable}\n\n${volatile}`;

    try {
      const stream = await client.chat.completions.create({
        model: args.model,
        stream: true,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemContent },
          ...args.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
        ],
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield { text };
      }
      yield { done: true };
    } catch (e) {
      yield { error: e instanceof Error ? e.message : String(e) };
    }
  },
};
