import { Router } from 'express';
import { providers } from '../providers/index.js';
import { MODELS } from '../../shared/models.js';

export const providersRouter = Router();

providersRouter.get('/providers', (_req, res) => {
  const out = Object.values(providers).map((p) => ({
    name: p.name,
    available: p.available,
    models: p.models,
  }));
  res.json(out);
});

providersRouter.get('/models', (_req, res) => {
  // Filter to providers that exist in our local registry; greyed-out flag for unavailable
  const availableProviders = new Set<string>(Object.values(providers).filter((p) => p.available).map((p) => p.name));
  const out = MODELS.map((m) => ({ ...m, available: availableProviders.has(m.provider) }));
  res.json(out);
});
