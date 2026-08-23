# NeoContra — Solana dApp Store publishing

How **NeoContra: Solana Assault** is packaged and published to the
[Solana dApp Store](https://docs.solanamobile.com/dapp-publishing/intro)
(the Android app store on Saga / Seeker devices).

The game is a PWA, so it ships as a **Trusted Web Activity (TWA)** — a thin
signed Android app that renders the live site in Chrome's engine, full screen
with no browser UI. This is the path Solana Mobile's own
[PWA publishing guide](https://docs.solanamobile.com/dapp-publishing/publishing-a-pwa)
prescribes, and it means **Mobile Wallet Adapter keeps working**: the page runs
in a real Chrome context, so the `solana-wallet:` intent hand-off to
Phantom/Solflare behaves exactly as it does in the mobile browser.

It also means **shipping a web deploy ships the game**. You only rebuild the APK
when the app's *shell* changes (name, icon, orientation, version) — not for
gameplay changes.

---

## 🔑 Where the keys are

Three different keys matter here. They are **not** interchangeable.

### 1. APK release signing key — `C:\Users\craig\.neocontra-keys\`

```
C:\Users\craig\.neocontra-keys\
  ├── neocontra-release.keystore   ← the key itself (PKCS12)
  └── KEYSTORE-INFO.txt            ← alias, password, fingerprints
```

|              |                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **Alias**    | `neocontra`                                                                                          |
| **Password** | in `KEYSTORE-INFO.txt` (store password == key password)                                              |
| **SHA-256**  | `DF:7B:04:5C:6C:88:CE:39:D3:6A:13:70:1E:23:94:58:93:38:8B:9D:66:2C:70:27:3E:5B:60:78:36:DC:A0:BC` |
| **Expires**  | 2054-01-05                                                                                           |

> ⚠️ **This key can never be rotated.** Lose it and you can never publish an
> update to `com.neocontra.game` again — you would need a brand-new listing under
> a new package name, and every existing install would be orphaned.
>
> **Back this folder up off this machine now.** File into encrypted storage,
> password into a password manager. It is outside the repo on purpose, and
> `*.keystore` is gitignored as a safety net. Never commit it.

Its fingerprint is published in [`public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json).
If you ever regenerate the key, that file must be updated and redeployed or the
app will launch with a Chrome address bar instead of full screen.

Solana Mobile requires this to be a **dedicated** key — do not reuse a Google
Play signing key.

### 2. Publisher wallet — *you connect this; it is not stored here*

The wallet you connect at [publish.solanamobile.com](https://publish.solanamobile.com)
(Phantom, Solflare or Backpack). It mints the publisher/app/release NFTs and
signs the Arweave uploads.

- **Permanent** — it cannot be changed after the first submission, and losing it
  means losing the ability to submit updates.
- Needs **~0.2 SOL** for transaction + ArDrive storage fees.
- Use a wallet you control long-term. A hardware wallet is a reasonable choice.

### 3. Treasury wallet — `VITE_DEV_WALLET`

Unrelated to publishing: this is where in-game SOL purchases land. It already
exists in `.env` and in the Railway service variables. See
[DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Status

|                  |                                        |
| ---------------- | -------------------------------------- |
| Package name     | `com.neocontra.game` *(permanent)*     |
| Bound domain     | `neo-contra-production.up.railway.app` |
| Version          | `1.0.0` (versionCode `1`)              |
| min / target SDK | 21 / 36                                |
| Display          | fullscreen-sticky, landscape-locked    |

**Done**

- [x] PWA manifest corrected — served at `/manifest.json`, real 192/512 icons, a
      dedicated maskable icon, black splash, landscape lock
- [x] `/.well-known/assetlinks.json` served as real JSON (it was returning the
      SPA `index.html`, which would have broken full-screen mode)
- [x] Release keystore generated and verified
- [x] Signed release APK + AAB built and verified (v1/v2/v3 signature schemes)
- [x] Listing assets generated in [`store/`](../store)
- [x] Web changes deployed to Railway and verified live
- [x] Final APK built against the live manifest — no localhost baked in,
      `locales: '--_--'` (English only), landscape locked
- [x] Digital Asset Links confirmed by Google's verifier (see below)

**Left to do** — these need KYC, a wallet, and human review:

- [ ] Publisher Portal account + KYC/KYB
- [ ] Submit, then wait 3–5 business days for review

---

## Submitting

Everything now goes through the **Publisher Portal web UI** at
[publish.solanamobile.com](https://publish.solanamobile.com). The older
`npx dapp-store` CLI flow is only used for *subsequent version* uploads.

1. **Create a publisher account.** Complete the publisher profile and submit
   KYC/KYB verification.
2. **Connect your publisher wallet** (see *Where the keys are* #2). Fund it with
   ~0.2 SOL. *This choice is permanent.*
3. **Pick a storage provider.** ArDrive is recommended; the Portal has a cost
   calculator that sizes the fee against the ~4 MB APK.
4. **Add a dApp** → *New dApp*, and fill in the listing (copy below).
5. **New Version** → upload `android/app-release-signed.apk`, then approve each
   wallet prompt for the Arweave uploads and the release NFT mint.
6. **Submit for review.** Results arrive by email within 3–5 business days from
   `publishersupport@dappstore.solanamobile.com`. Approved apps go live
   immediately.

### Listing assets — all generated, in [`store/`](../store)

| Asset           | Spec                                                    | File                             |
| --------------- | ------------------------------------------------------- | -------------------------------- |
| Icon            | 512×512                                                 | `store/icon-512.png`             |
| Banner          | 1200×600                                                | `store/banner-1200x600.png`      |
| Feature graphic | 1200×1200, optional — Editor's Choice carousel only     | `store/feature-1200x1200.png`    |
| Screenshots     | ≥4, ≥1080px on both axes, equal aspect ratios           | `store/screenshots/*.png` (5 × 1440×1080) |

Screenshots are 4:3 to match the game's native aspect ratio, so they fill the
frame instead of letterboxing inside 16:9.

### Listing copy

**Short description** (30 character limit — this is 29):

```
Run-and-gun shooter on Solana
```

**Long description:**

```
NeoContra: Solana Assault is a retro run-and-gun shooter built for the
Solana mobile era.

Fight through 5 hand-authored levels of neon-soaked industrial sprawl —
drone ambushes, wall-cannon gates, elite mini-bosses, timed fire-jet
hazards and a "hold the line" gauntlet — each ending in a named boss with
its own attack pattern.

- Classic run-and-gun controls: 8-way aiming, prone, double jump and
  hold-to-fire, with on-screen touch controls built for phones.
- Five weapons with upgrade-on-double-pickup, from spread shots to a
  piercing Layer-0 Laser.
- An in-game Armory where you spend SOL on weapons, extra lives and
  permanent cosmetic skins.
- Pay-to-continue revives that keep your score alive.
- A global leaderboard — take a run to the top of High Command.

Connect Phantom or Solflare via Mobile Wallet Adapter. All purchases are
plain SOL transfers; there is no token to buy and nothing is custodial.
```

**Privacy policy URL** (the Portal requires one):

```
https://neo-contra-production.up.railway.app/privacy
```

### What review will look at

- **Payments.** Every purchase is a native `SystemProgram.transfer` of SOL to the
  treasury wallet ([`src/solana/TransactionLogic.ts`](../src/solana/TransactionLogic.ts)).
  Nothing custodial, no SPL token, no in-app currency. Prices live in
  [`src/config/constants.ts`](../src/config/constants.ts).
- **Privacy.** Policy is live at
  **https://neo-contra-production.up.railway.app/privacy** — use that as the
  listing's privacy policy URL. It documents the only two things the app touches:
  `localStorage` for skins/unlocks, and an opt-in leaderboard POST of
  `{wallet address, score, level}` that fires only when the player presses SUBMIT
  SCORE with a wallet connected. There are no analytics, ads or trackers in the
  build. Source: [`public/privacy.html`](../public/privacy.html); served at the
  clean `/privacy` by a route in [`server/index.mjs`](../server/index.mjs)
  registered before the SPA catch-all.
- **Age rating.** The game has cartoon pixel-art violence and real-money (SOL)
  purchases. Rate it honestly.

---

## Rebuilding the APK

You do **not** need this for gameplay changes — those ship with a web deploy.
Rebuild only when the shell changes.

### One-time toolchain setup (already done on this machine)

```bash
npm i -g @bubblewrap/cli
```

Bubblewrap needs a JDK 17 and an Android SDK. On this machine:

- **JDK 17** — Bubblewrap installed its own at `~/.bubblewrap/jdk/jdk-17.0.11+9`.
- **Android SDK** — the existing Android Studio SDK already had the exact
  `build-tools/36.1.0` that Bubblewrap pins, but not the `cmdline-tools` layout
  its path validator insists on. Rather than download a second SDK, there is a
  *shadow SDK root* of directory junctions pointing at the real one:

  ```
  <scratchpad>/android-sdk/
    bin/             (empty — satisfies Bubblewrap's validator)
    build-tools/     → junction to C:\Users\craig\AppData\Local\Android\Sdk\build-tools
    platforms/       → junction to ...\platforms
    platform-tools/  → junction to ...\platform-tools
    licenses/        → junction to ...\licenses
  ```

  This is safe because Bubblewrap only invokes `sdkmanager` when build-tools are
  *missing*, and they are not. Nothing in the real SDK was modified.

  > If the scratchpad is ever cleaned up, recreate the junctions (PowerShell,
  > `New-Item -ItemType Junction`) and re-point Bubblewrap with
  > `bubblewrap updateConfig --androidSdkPath <path>`.

Verify with `bubblewrap doctor`.

### Build steps

```bash
# 1. Ship the web changes first — the build reads the live manifest and icons.
pnpm run build && git push          # Railway auto-deploys

# 2. Regenerate the Android project from android/twa-manifest.json
cd android
bubblewrap update --skipVersionUpgrade

# 3. Restrict declared locales to English. This MUST be re-applied after every
#    `bubblewrap update`, which regenerates app/build.gradle. Without it the
#    dApp Store listing claims the app supports every locale on earth.
#    Add inside android { defaultConfig { ... } } in android/app/build.gradle:
#        resConfigs "en"

# 4. Build + sign
BUBBLEWRAP_KEYSTORE_PASSWORD='<password>' \
BUBBLEWRAP_KEY_PASSWORD='<password>' \
  bubblewrap build --skipPwaValidation
```

Outputs `android/app-release-signed.apk` and `android/app-release-bundle.aab`.
**Submit the `.apk`** — the dApp Store takes APKs, not App Bundles.

> **Windows / Git Bash gotcha:** this environment sets
> `NoDefaultCurrentDirectoryInExePath=1`, which stops `cmd.exe` resolving
> `gradlew.bat` from the working directory, so the build fails with
> *"'gradlew.bat' is not recognized"*. Clear it for the build:
>
> ```powershell
> Remove-Item Env:\NoDefaultCurrentDirectoryInExePath
> ```

### Shipping an update

Bump `appVersionCode` (it must strictly increase) and `appVersionName` in
`android/twa-manifest.json`, rebuild, then upload via **New Version** in the
Portal — or with the CLI:

```bash
npx dapp-store publish --apk-file ./android/app-release-signed.apk \
  --keypair <publisher-keypair.json> --whats-new "..."
```

### Verifying a build

```powershell
$bt  = "C:\Users\craig\AppData\Local\Android\Sdk\build-tools\36.1.0"
$jdk = "C:\Users\craig\.bubblewrap\jdk\jdk-17.0.11+9"

# Signature + certificate fingerprint (must match assetlinks.json)
& "$jdk\bin\java.exe" -jar "$bt\lib\apksigner.jar" verify --verbose --print-certs `
  android\app-release-signed.apk

# Package name, version, SDK levels
& "$bt\aapt.exe" dump badging android\app-release-signed.apk
```

---

## Digital Asset Links

The handshake that lets the app run full screen. Both halves must agree:

| Direction | Where                                                                | Value                                             |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| app → site | `android/app/src/main/res/values/strings.xml` (`assetStatements`)    | `https://neo-contra-production.up.railway.app`    |
| site → app | [`public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json) | `com.neocontra.game` + the SHA-256 above |

The server serves it explicitly in [`server/index.mjs`](../server/index.mjs),
registered **before** the SPA catch-all — otherwise `app.get('*')` answers the
Android verifier with `index.html` and verification silently fails.

Check it after any deploy:

```bash
curl -i https://neo-contra-production.up.railway.app/.well-known/assetlinks.json
# must be 200 with Content-Type: application/json
```

Or ask Google's verifier directly — this is what Android itself consults, so a
matching `packageName` + `sha256Fingerprint` in the response is proof the app
will launch full screen:

```bash
curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://neo-contra-production.up.railway.app&relation=delegate_permission/common.handle_all_urls"
```

If this regresses the app still runs, but with a Chrome address bar across the
top — which review will flag.

### Changing domains later

The app is bound to the Railway subdomain. Moving to a custom domain means:
update `host` in `android/twa-manifest.json`, serve `assetlinks.json` on the new
domain, rebuild, and ship an APK update. Installed copies break until users
update — so if a custom domain is ever on the cards, do it before launch.

---

## Troubleshooting

| Symptom                                                    | Cause / fix                                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| App opens with a Chrome address bar                        | `assetlinks.json` not reachable, wrong fingerprint, or wrong package name. `curl` it (above).                                      |
| `'gradlew.bat' is not recognized`                          | `NoDefaultCurrentDirectoryInExePath=1` — see the gotcha above.                                                                     |
| `Unexpected token '<', "<!doctype "...` on `bubblewrap update` | It fetched an HTML page where JSON was expected — the site is serving the SPA fallback for `/manifest.json`. Deploy the web changes first. |
| `The androidSdkPath isn't correct`                         | The shadow SDK junctions are gone. Recreate them and re-run `bubblewrap updateConfig`.                                             |
| Bubblewrap hangs or throws `ERR_USE_AFTER_CLOSE`           | It is prompting on a stdin-less shell. Pass the flag it wants (`--skipVersionUpgrade`, `--appVersionName`) or run it in a real terminal. |
| Listing claims every language                              | `resConfigs "en"` was lost by a `bubblewrap update`. Re-apply it before building.                                                  |
| Wallet connect fails in-app but works in mobile Chrome     | Check Digital Asset Links first — a failed TWA verification changes the browsing context MWA sees.                                 |

---

## Reference

- [dApp Store publishing overview](https://docs.solanamobile.com/dapp-publishing/intro)
- [Publishing a PWA](https://docs.solanamobile.com/dapp-publishing/publishing-a-pwa)
- [Submit a new app](https://docs.solanamobile.com/dapp-publishing/submit-new-app)
- [Listing page guidelines](https://docs.solanamobile.com/dapp-publishing/listing-page-guidelines)
- [Publisher policy](https://solanamobile.com/publisher-policy-web)
- [Publisher Portal](https://publish.solanamobile.com)

*Built by Rykiri.*
