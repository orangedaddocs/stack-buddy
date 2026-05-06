import { Router } from 'express';
import { resolve } from 'node:path';
import { ScenarioSchema } from '../../shared/schema/scenario.js';
import {
  SCENARIOS_DIR,
  ensureDir,
  listFiles,
  readJson,
  writeJsonAtomic,
} from '../lib/files.js';
import type { Scenario } from '../../shared/types.js';
import { promises as fs } from 'node:fs';

export const scenariosRouter = Router();

scenariosRouter.get('/', async (_req, res, next) => {
  try {
    await ensureDir(SCENARIOS_DIR);
    const files = await listFiles(SCENARIOS_DIR, '.json');
    const summaries = await Promise.all(
      files.map(async (f) => {
        const s = await readJson<Scenario>(resolve(SCENARIOS_DIR, f));
        return { slug: s.slug, name: s.name, updated: s.updated };
      }),
    );
    res.json(summaries);
  } catch (e) {
    next(e);
  }
});

scenariosRouter.get('/:slug', async (req, res, next) => {
  try {
    const path = resolve(SCENARIOS_DIR, `${req.params.slug}.json`);
    const raw = await readJson<unknown>(path);
    const parsed = ScenarioSchema.parse(raw);
    res.json(parsed);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'scenario not found' });
      return;
    }
    next(e);
  }
});

scenariosRouter.post('/', async (req, res, next) => {
  try {
    const parsed = ScenarioSchema.parse(req.body);
    parsed.updated = new Date().toISOString().slice(0, 10);
    const path = resolve(SCENARIOS_DIR, `${parsed.slug}.json`);
    await writeJsonAtomic(path, parsed);
    res.json({ ok: true, slug: parsed.slug });
  } catch (e) {
    if (e instanceof Error && 'issues' in e) {
      res.status(400).json({ error: 'validation failed', details: (e as { issues: unknown }).issues });
      return;
    }
    next(e);
  }
});

scenariosRouter.delete('/:slug', async (req, res, next) => {
  try {
    if (req.params.slug === 'default') {
      res.status(403).json({ error: 'cannot delete the default scenario' });
      return;
    }
    const path = resolve(SCENARIOS_DIR, `${req.params.slug}.json`);
    await fs.unlink(path);
    res.json({ ok: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'scenario not found' });
      return;
    }
    next(e);
  }
});
