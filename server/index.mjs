// NeoContra production server: serves the built game and a lightweight SQLite
// leaderboard API. Uses Node's built-in node:sqlite (run with
// `node --experimental-sqlite`, Node >= 22.5). Persists to DATA_DIR (mount a
// Railway volume there, e.g. /data) so scores survive deploys/restarts.
//
// Resilience: the leaderboard is OPTIONAL. If node:sqlite is unavailable (older
// Node, missing flag) or DATA_DIR isn't writable, we log a warning and run with
// the leaderboard disabled — the game itself still serves. The process must
// never crash-loop just because the DB couldn't initialise.

import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 3000;

console.log(`[neocontra] starting — node ${process.version}, port ${PORT}, data ${DATA_DIR}, dist ${existsSync(DIST)}`);

// ── Database (optional) ──────────────────────────────────────────────────────
let db = null;
let topStmt, getOneStmt, upsertStmt;
try {
  const { DatabaseSync } = await import('node:sqlite'); // throws if unavailable / no flag
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(join(DATA_DIR, 'leaderboard.db'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      wallet_address TEXT PRIMARY KEY,
      score          INTEGER NOT NULL,
      level_reached  INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
  `);
  topStmt = db.prepare('SELECT wallet_address, score, level_reached, created_at FROM scores ORDER BY score DESC LIMIT ?');
  getOneStmt = db.prepare('SELECT score FROM scores WHERE wallet_address = ?');
  upsertStmt = db.prepare(`
    INSERT INTO scores (wallet_address, score, level_reached, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(wallet_address) DO UPDATE SET
      score = excluded.score,
      level_reached = excluded.level_reached,
      created_at = excluded.created_at
    WHERE excluded.score > scores.score
  `);
  console.log('[neocontra] leaderboard DB ready');
} catch (e) {
  db = null;
  console.warn(`[neocontra] leaderboard DISABLED (DB init failed): ${e?.message || e}`);
}

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

app.get('/api/health', (_req, res) => res.json({ ok: true, leaderboard: !!db }));

app.get('/api/scores', (req, res) => {
  if (!db) return res.json([]); // leaderboard disabled — empty board, no error
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  try {
    res.json(topStmt.all(limit));
  } catch (e) {
    console.error('GET /api/scores', e);
    res.status(500).json({ error: 'db_error' });
  }
});

app.post('/api/scores', (req, res) => {
  if (!db) return res.status(503).json({ error: 'leaderboard_unavailable' });
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

// ── Digital Asset Links ─────────────────────────────────────────────
// Must be real JSON with an application/json content type, served from the
// site root. It proves to Android that this domain owns the dApp Store TWA
// build, which is what lets the app run fullscreen instead of showing
// Chrome's address bar. Served from the repo copy (not dist/) so it never
// depends on whether the bundler copied a dot-directory, and registered
// BEFORE the SPA catch-all below, which would otherwise answer it with
// index.html.
const ASSETLINKS = join(ROOT, 'public', '.well-known', 'assetlinks.json');
app.get('/.well-known/assetlinks.json', (_req, res) => {
  if (!existsSync(ASSETLINKS)) return res.status(404).json({ error: 'not_configured' });
  res.type('application/json').sendFile(ASSETLINKS);
});

// ── Privacy policy ─────────────────────────────────────────────────
// The Solana dApp Store listing requires a privacy policy URL. Served at a
// clean /privacy (as well as /privacy.html via express.static) and registered
// before the SPA catch-all, which would otherwise answer it with index.html.
app.get('/privacy', (_req, res) => {
  const f = join(DIST, 'privacy.html');
  if (!existsSync(f)) return res.status(404).send('Not found');
  res.sendFile(f);
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
  console.log(`[neocontra] listening on :${PORT} (leaderboard: ${db ? 'on' : 'off'})`);
});

// Last-resort guards so a stray async error can't crash-loop the container.
process.on('unhandledRejection', (e) => console.error('[neocontra] unhandledRejection', e));
process.on('uncaughtException', (e) => console.error('[neocontra] uncaughtException', e));
