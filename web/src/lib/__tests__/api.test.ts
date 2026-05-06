import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api.js';

// Bare-bones fetch mocker — vitest's vi.stubGlobal is fine for one-off responses.
function mockFetchOnce(init: { status: number; statusText?: string; body: unknown }) {
  const res = new Response(typeof init.body === 'string' ? init.body : JSON.stringify(init.body), {
    status: init.status,
    statusText: init.statusText ?? '',
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(res));
}

describe('api.planAdvise — error mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps a 503 about a missing API key to a friendly "AI is optional" message', async () => {
    mockFetchOnce({
      status: 503,
      statusText: 'Service Unavailable',
      body: { error: 'ANTHROPIC_API_KEY is not set' },
    });

    await expect(
      api.planAdvise({
        goal: { target_btc: 1, deadline: '2030-12-31' },
        starting_btc: 0,
        monthly_available_usd: 1_000,
        current_btc_price: 75_800,
        // The fetch is mocked, so the scenario contents don't matter — but the
        // function signature requires a Scenario. We send an obvious dummy.
        scenario: { dummy: true } as unknown as Parameters<typeof api.planAdvise>[0]['scenario'],
      }),
    ).rejects.toThrow(/Stack Buddy AI is optional/);
  });

  it('maps a 503 about MAPLE_API_KEY to the same friendly message', async () => {
    mockFetchOnce({
      status: 503,
      body: 'MAPLE_API_KEY is missing',
    });

    await expect(
      api.planAdvise({
        goal: { target_btc: 1, deadline: '2030-12-31' },
        starting_btc: 0,
        monthly_available_usd: 0,
        current_btc_price: 75_800,
        scenario: { dummy: true } as unknown as Parameters<typeof api.planAdvise>[0]['scenario'],
      }),
    ).rejects.toThrow(/Stack Buddy AI is optional/);
  });

  it('passes through other server errors as raw status text instead of swallowing them', async () => {
    mockFetchOnce({
      status: 500,
      statusText: 'Internal Server Error',
      body: { error: 'something blew up' },
    });

    await expect(
      api.planAdvise({
        goal: { target_btc: 1, deadline: '2030-12-31' },
        starting_btc: 0,
        monthly_available_usd: 1_000,
        current_btc_price: 75_800,
        scenario: { dummy: true } as unknown as Parameters<typeof api.planAdvise>[0]['scenario'],
      }),
    ).rejects.toThrow(/500/);
  });
});
