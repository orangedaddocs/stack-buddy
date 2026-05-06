import { Router } from 'express';
import { ScenarioSchema } from '../../shared/schema/scenario.js';
import { getProvider } from '../providers/index.js';
import type { ChatMessage } from '../../shared/types.js';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  const { provider: providerName, model, scenario, messages } = req.body as {
    provider: string;
    model: string;
    scenario: unknown;
    messages: ChatMessage[];
  };

  const provider = getProvider(providerName);
  if (!provider) {
    res.status(400).json({ error: `unknown provider: ${providerName}` });
    return;
  }

  let parsedScenario;
  try {
    parsedScenario = ScenarioSchema.parse(scenario);
  } catch (e) {
    res.status(400).json({ error: 'scenario validation failed', details: (e as { issues: unknown }).issues });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (obj: unknown) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  try {
    for await (const chunk of provider.chat({ model, scenario: parsedScenario, messages })) {
      send(chunk);
      if (chunk.done || chunk.error) break;
    }
  } catch (e) {
    send({ error: e instanceof Error ? e.message : String(e) });
  } finally {
    res.end();
  }
});
