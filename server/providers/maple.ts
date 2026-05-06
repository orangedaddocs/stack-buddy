import OpenAI from 'openai';
import type { ChatChunk, ChatMessage, Scenario } from '../../shared/types.js';
import { buildSystemBlocks } from '../../shared/promptBuilder.js';

// Maple Proxy is OpenAI-compatible. The local desktop app or docker image exposes
// /v1 on a localhost port. We use the openai SDK with a custom baseURL.
const baseURL = process.env.MAPLE_BASE_URL || 'http://localhost:8080/v1';
const apiKey = process.env.MAPLE_API_KEY;

const client = apiKey ? new OpenAI({ apiKey, baseURL }) : null;

export const mapleProvider = {
  name: 'maple' as const,
  available: client !== null,
  // Live catalog as of Apr 2026 — fetched from /v1/models on the Maple proxy.
  // To refresh: `curl http://127.0.0.1:8080/v1/models -H "Authorization: Bearer $MAPLE_API_KEY"`
  models: [
    'kimi-k2-6',
    'glm-5-1',
    'deepseek-v4-pro',
    'gemma4-31b',
    'qwen3-vl-30b',
    'llama3-3-70b',
    'gpt-oss-120b',
    'gpt-oss-safeguard-120b',
  ],

  async *chat(args: {
    model: string;
    scenario: Scenario;
    messages: ChatMessage[];
  }): AsyncIterable<ChatChunk> {
    if (!client) {
      yield { error: 'MAPLE_API_KEY is not set' };
      return;
    }

    const { stable, volatile } = buildSystemBlocks(args.scenario);
    // Maple/OpenAI-compatible doesn't support Anthropic's two-block cache_control,
    // so we concatenate stable + volatile into a single system message.
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
