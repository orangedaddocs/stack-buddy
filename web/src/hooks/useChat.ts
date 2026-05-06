import { useCallback, useState } from 'react';
import type { ChatMessage, ProviderName, Scenario } from '../../../shared/types.js';
import { streamChat } from '../lib/api.js';

export function useChat(scenario: Scenario | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState<ProviderName>('anthropic');
  const [model, setModel] = useState<string>('claude-opus-4-7');

  const send = useCallback(
    async (text: string) => {
      if (!scenario || !text.trim()) return;
      const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
      setMessages([...next, { role: 'assistant', content: '' }]);
      setStreaming(true);
      let buf = '';
      try {
        for await (const chunk of streamChat({ provider, model, scenario, messages: next })) {
          if (chunk.text) {
            buf += chunk.text;
            setMessages((cur) => {
              const copy = cur.slice();
              copy[copy.length - 1] = { role: 'assistant', content: buf };
              return copy;
            });
          }
          if (chunk.error) {
            setMessages((cur) => {
              const copy = cur.slice();
              copy[copy.length - 1] = { role: 'assistant', content: `Error: ${chunk.error}` };
              return copy;
            });
            break;
          }
          if (chunk.done) break;
        }
      } finally {
        setStreaming(false);
      }
    },
    [scenario, messages, provider, model],
  );

  return { messages, send, streaming, provider, setProvider, model, setModel };
}
