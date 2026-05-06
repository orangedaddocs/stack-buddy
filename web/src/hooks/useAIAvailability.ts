import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export type AIAvailability = {
  /**
   * At least one provider is configured server-side. Drives the chat panel,
   * the privacy strip's "AI is wired up" framing, and the floating "Ask
   * Stack Buddy" button. Any of Anthropic / Maple / OpenAI being available
   * is enough.
   */
  aiAvailable: boolean | null;
  /**
   * Anthropic specifically is configured. The Plan-tab advisor at
   * `/api/plan/advise` constructs the Anthropic SDK directly and uses tool
   * use to return three structured strategies — no other provider can drive
   * that path right now. If `aiAvailable` is true but `advisorAvailable` is
   * false, the chat works but the Plan advisor must be hidden, otherwise
   * the user clicks a button that 503s.
   */
  advisorAvailable: boolean | null;
};

/**
 * Reports whether AI providers are configured on the backend, split by
 * capability. Stack Buddy's deterministic calculator works without any of
 * this; this hook is used to hide AI-only affordances when no key is set.
 */
export function useAIAvailability(): AIAvailability {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [advisorAvailable, setAdvisorAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .providers()
      .then((list) => {
        if (cancelled) return;
        setAiAvailable(list.some((p) => p.available));
        setAdvisorAvailable(list.some((p) => p.name === 'anthropic' && p.available));
      })
      .catch(() => {
        if (!cancelled) {
          setAiAvailable(false);
          setAdvisorAvailable(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { aiAvailable, advisorAvailable };
}
