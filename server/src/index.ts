import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
// Load .env from repo root (works in dev; in Docker we pass env directly)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import { load, resetToSeed } from './store';
import { addClient, removeClient } from './sse';
import { CATEGORIES, WARDS, CITY_CENTER, LEVELS } from './constants';
import { geminiEnabled } from './gemini';
import issuesRouter from './routes/issues';
import usersRouter from './routes/users';
import aiRouter from './routes/ai';
import statsRouter from './routes/stats';

load();

// A live demo must never crash — log and keep serving.
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

// request log (concise)
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) console.log(`${req.method} ${req.path}`);
  next();
});

// ── Meta endpoints ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, gemini: geminiEnabled(), ts: Date.now() }));

app.get('/api/config', (_req, res) => {
  res.json({
    categories: Object.entries(CATEGORIES).map(([key, v]) => ({ key, ...v })),
    wards: WARDS,
    cityCenter: CITY_CENTER,
    levels: LEVELS,
    geminiEnabled: geminiEnabled(),
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  });
});

// dev convenience: reseed
app.post('/api/admin/reseed', (_req, res) => { resetToSeed(); res.json({ ok: true }); });

// ── SSE live stream ───────────────────────────────────────────────
app.get('/api/stream', (req, res) => {
  const id = Math.random().toString(36).slice(2);
  addClient(id, res);
  req.on('close', () => removeClient(id));
});

// ── Feature routers ───────────────────────────────────────────────
app.use('/api', usersRouter);
app.use('/api', issuesRouter);
app.use('/api', aiRouter);
app.use('/api', statsRouter);

// Global error handler so a thrown route never takes down the process
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[route error]', err?.message || err);
  if (!res.headersSent) res.status(500).json({ error: 'internal error' });
});

// ── Serve built client (production) ───────────────────────────────
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`\n🦸 Community Hero server running on http://localhost:${PORT}`);
  console.log(`   Gemini: ${geminiEnabled() ? 'ENABLED ✅ (' + (process.env.GEMINI_MODEL || 'gemini-2.5-flash') + ')' : 'fallback mode (no key)'}\n`);
});
