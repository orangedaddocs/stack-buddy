import type { Scenario } from '../../../shared/types.js';

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text();
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
};
