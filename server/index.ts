import express from 'express';
import 'dotenv/config';
import { scenariosRouter } from './routes/scenarios.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use('/api/scenarios', scenariosRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

const port = Number(process.env.PORT ?? 2034);
app.listen(port, () => {
  console.log(`[stack-buddy] api listening on http://localhost:${port}`);
});

export default app;
