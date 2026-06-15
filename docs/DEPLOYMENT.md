# NeoContra — Deployment Guide

How to deploy **NeoContra: Solana Assault** to [Railway](https://railway.app).
One service runs everything: the built game **and** the leaderboard API are
served from the same origin by `server/index.mjs`. No external database.

---

## 0. Before you start

You'll need:

- A **Railway** account + this repo pushed to **GitHub** (Railway deploys from git).
- Your **treasury wallet** address (a normal Solana wallet pubkey) — this is where
  shop/continue SOL lands.
- A dedicated **RPC URL** (Helius/QuickNode recommended for mainnet).
- *(Optional, later)* your **pump.fun token contract address** — paste it in once
  the token is live to show the copyable CA bar.

> **Node 22+ is required.** The leaderboard uses Node's built-in `node:sqlite`
> (`--experimental-sqlite`), which only exists on Node ≥ 22. This is pinned via
> `.nvmrc` (`22`) and `engines.node` (`>=22`), so Railway picks it up automatically.

---

## 1. Environment variables

Set these as **Railway service Variables** (Service → *Variables* tab).

> ⚠️ **`VITE_*` vars are baked into the client bundle at BUILD time.** They are
> *not* read at runtime — you must set them **before** the build runs. If you
> change one later, you must **redeploy** for it to take effect.

| Variable | When | Value |
|---|---|---|
| `VITE_DEV_WALLET` | build | Your treasury wallet pubkey. **Blank = DEV mode** (shop + continue are free, no wallet/payment). Set it to take real SOL. |
| `VITE_SOLANA_NETWORK` | build | `devnet` to test, `mainnet-beta` to go live. |
| `VITE_RPC_URL` | build | Your dedicated RPC endpoint. Falls back to the public cluster if blank (fine for devnet, **not** for mainnet). |
| `VITE_TOKEN_CA` | build | Token contract address (SPL mint). **Leave blank until launch**; once set, a copyable "CA" bar appears in the UI. |
| `VITE_TOKEN_SYMBOL` | build | Ticker beside the CA, e.g. `$NEO`. Defaults to `$TOKEN`. |
| `VITE_LEADERBOARD_URL` | build | **Leave blank.** The API is same-origin. Only set this if you host the API on a *different* domain than the game. |
| `DATA_DIR` | runtime | `/data` — where the SQLite file lives. Must match your mounted volume (step 3). |
| `PORT` | runtime | **Don't set this** — Railway injects it automatically and the server reads it. |

A copy-paste starting point lives in [`.env.example`](../.env.example).

---

## 2. Create the Railway project

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Railway reads [`railway.json`](../railway.json) and uses:
   - **Build:** `pnpm install --prod=false && pnpm run build`
   - **Start:** `pnpm start`  (→ `node --experimental-sqlite server/index.mjs`)
3. Don't deploy yet — add the volume and variables first (next steps).

---

## 3. Add the persistent volume (so scores survive deploys)

1. Service → **Variables/Settings → Volumes → New Volume**.
2. **Mount path:** `/data`
3. Make sure `DATA_DIR=/data` is set in Variables so the server writes the DB there.

> Without a volume the leaderboard still works, but the SQLite file lives on the
> ephemeral container filesystem and **resets on every redeploy**.

---

## 4. Set variables & deploy

1. Add all the variables from [§1](#1-environment-variables).
   - **First deploy / testing:** leave `VITE_DEV_WALLET` blank and use
     `VITE_SOLANA_NETWORK=devnet` so you can click through the shop for free.
   - **Going live:** set `VITE_DEV_WALLET` to your treasury, `VITE_SOLANA_NETWORK=mainnet-beta`,
     and a real `VITE_RPC_URL`.
2. Trigger a deploy (Railway auto-deploys on push, or hit **Deploy**).
3. Under **Settings → Networking**, generate a public domain.

---

## 5. Verify the deploy

Once it's live (replace `<your-app>` with your Railway URL):

- **Game loads:** open `https://<your-app>.up.railway.app/` → the title screen appears.
- **API healthy:** `https://<your-app>.up.railway.app/api/health` → `{"ok":true}`.
- **Leaderboard persists:** play a game, die, submit a score, then **redeploy** and
  confirm the score is still there (proves the volume is mounted correctly).
- **Payments:**
  - *DEV mode* (`VITE_DEV_WALLET` blank): shop items are granted free.
  - *Live mode*: connect a wallet, buy an item, confirm the SOL arrives in your
    treasury wallet and the item is granted.

---

## 6. Going live with real SOL (checklist)

1. `VITE_DEV_WALLET` = your treasury pubkey.
2. `VITE_SOLANA_NETWORK` = `mainnet-beta`.
3. `VITE_RPC_URL` = a real (paid/dedicated) RPC — the public cluster will rate-limit.
4. **Redeploy** (these are build-time vars).
5. Do one real purchase end-to-end and confirm the SOL lands in the treasury.

Prices (in SOL) live in [`src/config/constants.ts`](../src/config/constants.ts)
under `PRICES` — edit and redeploy to change them.

---

## 7. Adding the pump.fun token CA (after launch)

1. Launch the token, copy its **contract address (SPL mint)**.
2. Set `VITE_TOKEN_CA` = that address (and optionally `VITE_TOKEN_SYMBOL`, e.g. `$NEO`).
3. **Redeploy.** A copyable CA bar now shows at the bottom of the screen.

> This is **display only** today — no payment or gating uses the token yet. Token
> *utility* (holder perks, token checkout, etc.) is a later, additive change and
> won't touch the existing SOL flow.

---

## 8. Security notes

- **Never commit `.env`.** It's gitignored. Set secrets only as Railway variables.
- **The Helius/RPC key ships in the public client bundle** (all `VITE_*` vars do).
  In the Helius dashboard, **lock the key to your Railway domain** (origin
  allowlist) and **rotate it** if it ever leaks. Treat it as public, not secret.
- The treasury wallet pubkey is *meant* to be public (it receives funds) — that's fine.

---

## 9. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Build fails on `pnpm`/Node version | Confirm Railway used Node ≥ 22 (`.nvmrc` = `22`). |
| `/api/health` 404 or "Game not built" | The build step didn't produce `dist/`. Check build logs; `pnpm run build` must succeed. |
| `node:sqlite` / `DatabaseSync` error | Node < 22, or the `--experimental-sqlite` flag missing. Start command must be `pnpm start` (it includes the flag). |
| Scores reset on every deploy | Volume not mounted at `/data`, or `DATA_DIR` ≠ `/data`. |
| Shop charges fail / "Insufficient SOL" | Wrong network, no RPC, or wallet lacks SOL for the item + fee. Verify `VITE_SOLANA_NETWORK` and `VITE_RPC_URL`. |
| Changed a `VITE_*` var but nothing changed | Those are baked at build time — **redeploy**. |
| CA bar not showing | `VITE_TOKEN_CA` blank or you didn't redeploy after setting it. |

---

*Built by Rykiri.*
