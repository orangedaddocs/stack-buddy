import { Router } from 'express';
import { resolve } from 'node:path';
import { CHATS_DIR, ensureDir, listFiles, readText, writeTextAtomic } from '../lib/files.js';
import { slugify } from '../lib/slugify.js';
import type { ChatTranscript } from '../../shared/types.js';

export const chatHistoryRouter = Router();

chatHistoryRouter.get('/', async (req, res, next) => {
  try {
    await ensureDir(CHATS_DIR);
    const files = await listFiles(CHATS_DIR, '.md');
    const scenarioFilter = req.query.scenario as string | undefined;
    const summaries = await Promise.all(
      files.map(async (f) => {
        const text = await readText(resolve(CHATS_DIR, f));
        const fm = parseFrontmatter(text);
        return { slug: f.replace(/\.md$/, ''), ...fm };
      }),
    );
    const filtered = scenarioFilter
      ? summaries.filter((s) => (s as { scenario_ref?: string }).scenario_ref === scenarioFilter)
      : summaries;
    res.json(filtered);
  } catch (e) {
    next(e);
  }
});

chatHistoryRouter.get('/:slug', async (req, res, next) => {
  try {
    const path = resolve(CHATS_DIR, `${req.params.slug}.md`);
    const text = await readText(path);
    res.type('text/markdown').send(text);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'chat not found' });
      return;
    }
    next(e);
  }
});

chatHistoryRouter.post('/', async (req, res, next) => {
  try {
    const transcript = req.body as ChatTranscript;
    const slug =
      transcript.slug ||
      slugify(
        `${new Date().toISOString().slice(0, 10)}-${transcript.messages[0]?.content.slice(0, 40) ?? 'chat'}`,
      );
    const path = resolve(CHATS_DIR, `${slug}.md`);
    const md = renderTranscript(slug, transcript);
    await writeTextAtomic(path, md);
    res.json({ ok: true, slug });
  } catch (e) {
    next(e);
  }
});

function parseFrontmatter(text: string): Record<string, unknown> {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1]!.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) out[kv[1]!] = kv[2]!.trim();
  }
  return out;
}

function renderTranscript(slug: string, t: ChatTranscript): string {
  const fm = [
    '---',
    `slug: ${slug}`,
    `created: ${t.created}`,
    `provider: ${t.provider}`,
    `model: ${t.model}`,
    `scenario_ref: ${t.scenario_ref}`,
    '---',
    '',
  ].join('\n');
  const body = t.messages
    .map((m) => `## ${m.role === 'user' ? 'You' : `Assistant (${t.model})`}\n\n${m.content}\n`)
    .join('\n');
  return fm + '\n' + body;
}
