# NeoContra: Solana Assault

> "The mission is paramount. The blockchain is the battlefield." - Rykiri

A retro run-and-gun shooter (Contra-style) with native-SOL payments. Built
with **Phaser 3** + **React 18**, fully self-contained art/audio (procedurally
generated — no external asset files), and a lightweight bundled leaderboard.

## 🚀 Features

- **Contra core**: 8-way aiming, prone, **double jump**, hold-to-fire, weapon
  power-ups (M/S/L/F/B) with **upgrade-on-double-pickup**.
- **5 authored levels**: each with scripted set-pieces — drone ambush, wall-cannon
  gates, an **elite mini-boss**, a "hold the line" gauntlet, timed fire-jet
  hazards, a double-jump climb to a weapon reward, and a unique end **boss**.
- **Parallax world**: gradient sky, factory skyline with smokestacks, neon
  billboards, foliage, and rain — themed per level.
- **Solana payments (native SOL only):**
  - In-game **Armory** shop (spend SOL on weapons/lives, incl. the top-tier
    **Genesis Beam**, plus one-time cosmetic **skin** unlocks).
  - **Pay-to-continue** revive on game over (keeps your score).
  - Connect Phantom/Solflare/Mobile wallet; purchases are plain SOL transfers to
    your treasury wallet. No SPL token involved anywhere.
- **Global leaderboard**: bundled **Express + SQLite** API (no external DB
  service required); persists to a Railway volume.
- Procedural WebAudio SFX/music, screen shake, particles, CRT styling, PWA.

## 🛠️ Stack

- **Engine**: Phaser 3.90 · **UI**: React 18 + Tailwind + Lucide
- **Chain**: @solana/web3.js + @solana/wallet-adapter (Phantom / Solflare / Mobile)
- **Server/DB**: Express + Node built-in `node:sqlite` (zero native deps)
- **Build**: Vite + Vite PWA

## 🔌 Local development

```bash
pnpm install
cp .env.example .env      # fill in as needed (DEV mode works with blanks)
pnpm dev                  # game at http://localhost:5173 (leaderboard offline)
```

To run the full stack (game + leaderboard API) locally:

```bash
pnpm build
pnpm start                # serves the built game + /api/scores on :3000
```

## ☁️ Deploy on Railway

1. Create a new Railway project from this repo.
2. Add a **Volume** mounted at `/data` (persists the SQLite leaderboard).
3. Set service **Variables** from `.env.example` (at minimum `DATA_DIR=/data`;
   add the `VITE_*` vars before launch — they're baked in at build time).
4. Railway runs `pnpm install && pnpm run build` then `pnpm start` (see
   `railway.json`). Node 22+ is required (for `node:sqlite`).

## 🪙 Solana payment config

Purchases are **native SOL transfers** to your treasury wallet — no token to
deploy. Set these build-time vars, then redeploy:

| Variable | Value |
|---|---|
| `VITE_DEV_WALLET` | your treasury wallet (receives shop/continue SOL) |
| `VITE_SOLANA_NETWORK` | `devnet` for testing, `mainnet-beta` for launch |
| `VITE_RPC_URL` | a dedicated RPC (Helius/QuickNode); falls back to the public cluster |

Prices (in SOL) live in `src/config/constants.ts` (`PRICES`). Leave
`VITE_DEV_WALLET` blank to run in **DEV mode** (shop + continue are free, no
wallet required) — useful for demos and devnet testing.

## 🎮 Controls (desktop)

- **Move**: ← → / A D · **Jump (×2)**: ↑ / W · **Prone**: ↓ / S
- **Fire**: Space / Z · **Aim**: hold ↑/↓ (8-way) · **Armory**: ESC · **Mute**: M

Mobile shows an on-screen joystick + Jump/Fire buttons automatically (touch only).

---

Developed by **Rykiri**
