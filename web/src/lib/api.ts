import type {
  Scenario,
  ProviderInfo,
  ModelInfo,
  PlanAdviseRequest,
  PlanAdviseResponse,
} from '../../../shared/types.js';

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text();
    // Surface the "no API key" case as a user-facing message instead of a raw
    // 503 — the calculator works without AI, this should not look like a bug.
    if (
      res.status === 503 &&
      /API[_ ]?KEY|API key/i.test(text)
    ) {
      throw new Error(
        'Stack Buddy AI is optional and not currently configured. Add an API key in .env if you want AI-tailored approaches; the deterministic calculator works without it.',
      );
    }
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listScenarios: () => jsonFetch<{ slug: string; name: string; updated: string }[]>('/api/scenarios'),
  getScenario:   (slug: string) => jsonFetch<Scenario>(`/api/scenarios/${slug}`),
  saveScenario:  (s: Scenario) => jsonFetch<{ ok: true; slug: string }>('/api/scenarios', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(s),
  }),
  deleteScenario: (slug: string) => jsonFetch<{ ok: true }>(`/api/scenarios/${slug}`, { method: 'DELETE' }),
  providers: () => jsonFetch<ProviderInfo[]>('/api/providers'),
  models:    () => jsonFetch<(ModelInfo & { available: boolean })[]>('/api/models'),
  listChats: (scenario_ref?: string) =>
    jsonFetch<{ slug: string; provider?: string; model?: string; scenario_ref?: string; created?: string }[]>(
      `/api/chats${scenario_ref ? `?scenario=${scenario_ref}` : ''}`,
    ),
  getChat: (slug: string) =>
    fetch(`/api/chats/${slug}`).then((r) => r.text()),
  saveChat: (transcript: import('../../../shared/types.js').ChatTranscript) =>
    jsonFetch<{ ok: true; slug: string }>('/api/chats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(transcript),
    }),
  planAdvise: (req: PlanAdviseRequest) =>
    jsonFetch<PlanAdviseResponse>('/api/plan/advise', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    }),
};

// SSE chat fetch — returns an async iterator of ChatChunk
export async function* streamChat(args: {
  provider: string;
  model: string;
  scenario: Scenario;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}): AsyncGenerator<{ text?: string; done?: boolean; error?: string }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.body) throw new Error('no response body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const obj = JSON.parse(line.slice(6));
          yield obj;
        } catch {
          // malformed line; skip
        }
      }
    }
  }
}
