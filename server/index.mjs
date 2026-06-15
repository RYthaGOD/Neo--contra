// NeoContra production server: serves the built game and a lightweight SQLite
// leaderboard API. Zero native dependencies — uses Node's built-in node:sqlite
// (run with `node --experimental-sqlite`). Persists to DATA_DIR (mount a Railway
// volume there, e.g. /data) so scores survive deploys/restarts.

import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 3000;

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ── Database ────────────────────────────────────────────────────────────────
const db = new DatabaseSync(join(DATA_DIR, 'leaderboard.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    wallet_address TEXT PRIMARY KEY,
    score          INTEGER NOT NULL,
    level_reached  INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
`);

const topStmt = db.prepare(
  'SELECT wallet_address, score, level_reached, created_at FROM scores ORDER BY score DESC LIMIT ?'
);
const getOneStmt = db.prepare('SELECT score FROM scores WHERE wallet_address = ?');
const upsertStmt = db.prepare(`
  INSERT INTO scores (wallet_address, score, level_reached, created_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(wallet_address) DO UPDATE SET
    score = excluded.score,
    level_reached = excluded.level_reached,
    created_at = excluded.created_at
  WHERE excluded.score > scores.score
`);

// ── App ───────────────────────────────────────────────────────────────────��─
const app = express();
app.use(express.json({ limit: '8kb' }));
// Permissive CORS so a split front/back deploy also works.
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'content-type');
  next();
});
app.options('/api/*', (_req, res) => res.sendStatus(204));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/scores', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  try {
    res.json(topStmt.all(limit));
  } catch (e) {
    console.error('GET /api/scores', e);
    res.status(500).json({ error: 'db_error' });
  }
});

app.post('/api/scores', (req, res) => {
  const { wallet_address, score, level_reached } = req.body || {};
  if (typeof wallet_address !== 'string' || wallet_address.length < 32 || wallet_address.length > 64) {
    return res.status(400).json({ error: 'invalid_wallet' });
  }
  const s = Math.floor(Number(score));
  const lvl = Math.floor(Number(level_reached) || 1);
  if (!Number.isFinite(s) || s < 0 || s > 1e12) return res.status(400).json({ error: 'invalid_score' });
  try {
    upsertStmt.run(wallet_address, s, lvl, new Date().toISOString());
    const best = getOneStmt.get(wallet_address);
    res.json({ ok: true, best: best ? best.score : s });
  } catch (e) {
    console.error('POST /api/scores', e);
    res.status(500).json({ error: 'db_error' });
  }
});

// ── Static game (built by `vite build`) ───────────────────────────────────────
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  // SPA fallback for client routing
  app.get('*', (_req, res) => res.sendFile(join(DIST, 'index.html')));
} else {
  app.get('*', (_req, res) => res.status(503).send('Game not built. Run `npm run build` first.'));
}

app.listen(PORT, () => {
  console.log(`NeoContra server on :${PORT}  (data: ${DATA_DIR}, dist: ${existsSync(DIST)})`);
});
