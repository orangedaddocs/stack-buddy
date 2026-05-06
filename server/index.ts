import express from 'express';
import 'dotenv/config';
import { scenariosRouter } from './routes/scenarios.js';
import { providersRouter } from './routes/providers.js';
import { chatRouter } from './routes/chat.js';
import { chatHistoryRouter } from './routes/chatHistory.js';
import { planAdviseRouter } from './routes/planAdvise.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use('/api/scenarios', scenariosRouter);
app.use('/api', providersRouter);
app.use('/api/chat', chatRouter);
app.use('/api/chats', chatHistoryRouter);
app.use('/api/plan/advise', planAdviseRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

const port = Number(process.env.PORT ?? 2034);
app.listen(port, () => {
  console.log(`[financial-buddy] api listening on http://localhost:${port}`);
});

export default app;
