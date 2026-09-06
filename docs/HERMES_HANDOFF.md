# Hermes continuation map

Written 2026-09-06. Canonical tree: `C:\Users\PC\Projects\SHIFTR`. Remote: `https://github.com/A123456D/SKITZ-GAMES.git` on **`main`**. Live: **https://skitz-games.pages.dev** (no custom domain in-repo).

Start here after [`AGENTS.md`](../AGENTS.md). Ask the user before commit, push, Cloudflare dashboard changes, or destroying git history.

---

## How work ships

There are **no** first-party `.github/workflows`. Production is **Cloudflare Pages auto-build** from GitHub `main`.

1. Edit the product folder (game, Android app, or `website/`).
2. **Games with Vite in this repo:** `npm run ship` = build + `scripts/copy-to-site.mjs` → `website/public/games/{id}/web/`.
3. **Android APKs:** Gradle/Capacitor release → copy APK into `website/public/apps/{id}/downloads/`.
4. **Catalog copy:** `website/src/content/games/*.md` or `apps/*.md` (title, play path, downloads).
5. User asks to commit → include source **and** the copied `website/public` bits. Message style is short: feat/fix/Ship/Release (see `git log`).
6. User asks to push → `git push origin main`. Pages builds `website` (`NODE_VERSION=22`) → `dist`.
7. Hard-refresh / wait a minute. If Functions or asset routing changed, `cd website && npm run smoke:assets`.

**Do not** add `website/functions/[[path]].js` or `_routes.json` include `/*`. That blanked every game’s art (2026-08-09).

### Cloudflare KV (blocked)

`website/wrangler.toml` Pages project name: **`skitz-games`**. Binding **`BOARD`** is commented (no id).

Pages Functions (`website/functions/api/scores.js`, `progress.js`, `gravity-drift/scores.js`) return **503 `board offline`** on POST when `env.BOARD` is missing. GET returns empty scores so the UI looks fine.

To go live (user must log in to Cloudflare): create KV namespace `BOARD`, bind it to Pages → `skitz-games` → Functions, or uncomment `[[kv_namespaces]]` with the real id and redeploy. Same pattern exists in `breach-riot/wrangler.toml` (`breach-riot-scores` worker) — also unbound.

---

## Catalog (live under pages.dev)

Play URLs: `/games/{id}/play/` or `/apps/{id}/play/` unless noted.

### Games in this repo

| Folder | Catalog id | Title | Ship | Notes |
| --- | --- | --- | --- | --- |
| repo root Godot | (not the web slug) | **SHIFTR** puzzle | Godot export; docs in `docs/` | Mobile-first circular shift puzzle. Store: not ready (`docs/RELEASE_READINESS.md`). |
| `web/` | `shiftr` | **Pulse Link** | `npm run ship` | Vite circuit puzzle. Package name `shiftr-web`. |
| `oculum/` | `oculum` | **OCULUM** beta | `npm run ship` | CCG. Play path `b9/`. WebGL2 board today. North star: `oculum/.cursor/rules/`. Docs: `oculum/docs/`. |
| `breach-riot/` | `breach-riot` | Breach Riot | `npm run ship` | Sticker-punk Breach Protocol. Optional scores worker. |
| `chain-reactor/` | `chain-reactor` | Chain Reactor | `npm run ship` | Grid card battler; optional `godot/`. |
| `riot-cube/` | `riot-cube` | RIOT CUBE | `npm run ship` | Sticker match; later Godot Android / true cube turns. |
| `paper-riot/` | `paper-riot` | Paper Riot | `npm run ship` | Match-3 slice; power-ups/daily/shop not done. |
| `nexus-chess/` | `nexus-chess` | Nexus Chess | `npm run ship` | Zone-control chess + mana. |
| `website/games-src/gravity-drift/` | `gravity-drift` | Gravity Drift | `games-src/gravity-drift/build.sh` → `public/games/gravity-drift/web/` | WebGPU polar Tetris. World board dead until KV. HANDOFF in that folder; **git-reinit proposal is obsolete**. |

### Games / apps whose source lives *outside* this repo

| Disk | Catalog | How it lands on the site |
| --- | --- | --- |
| `C:\Users\PC\Projects\PulseFold` | Pulse Fold (`pulsefold`) | Build there; copy `dist` → `website/public/games/pulsefold/web/` (`website/README.md`). **No git remote** — backup risk. |
| `C:\Users\PC\Projects\invoice-maker` | Ledgerly | GitHub `A123456D/Ledgerly` (`master`). `npm run build:skitz` into site apps. |
| `C:\Users\PC\OneDrive\Desktop\Folders\EMBER` | **RITE** | Vite; copy `dist` → `website/public/apps/rite/web/`. Local-first fitness PWA. |

### Android apps in this repo

| Folder | Catalog | Ship |
| --- | --- | --- |
| `pc-controller/` | Pc Controller | Capacitor + React; same UI in WebView. `npm run sync:android` / release APK → `website/public/apps/pc-controller/downloads/pc-controller.apk`. Play listing: `pc-controller/assets/store/play-listing.md`. Privacy URL on site. Latest line of work: HID + Wi‑Fi TV remotes (Roku, Samsung, LG, Bravia, Android TV). |
| `click-clack/` | Skitz Controller | Kotlin HID mouse/keyboard. `click-clack/android` → `website/public/apps/click-clack/downloads/click-clack.apk`. Untracked `click-clack/design/`. |

### Empty / do not treat as products

- `paper-craft/` — `dist` + `node_modules`, no source.
- `ronin-core/` — `node_modules` only.
- `_export-mouse-kb/` — nested git clone of `A123456D/Mouse-and-Keyboard-Phone-Controller` (HID lineage / export). Untracked in SKITZ-GAMES.

---

## Sibling clones (hygiene)

| Path | Status |
| --- | --- |
| `C:\Users\PC\Projects\SHIFTR` | **Use this.** |
| `C:\Users\PC\Projects\skitz-site` | Same GitHub remote, historically behind. Ignore or delete after confirming SHIFTR is current. |

---

## Godot SHIFTR (repo root)

GDD is source of truth: `docs/GDD_SHIFTR.md`. Run/docs index: `docs/README.md`. Not store-submit ready: Steam/Play/GC plugins + credentials, privacy still `example.com`, crash DSN, real icon, more campaign chapters.

Godot 4.3+; main shell `scenes/ui/main_shell.tscn`. Headless tests in `docs/RELEASE_READINESS.md`.

---

## OCULUM

Loop: Play Veiled → spend Sight to Witness → Gaze / Graft / Rite / Stance → Pass → Resolve High/Mid/Low. Wins: Break / Eclipse / Law. Do not generic-fantasy the schools.

Waves and card text live under `oculum/docs/` (`RULES.md`, `CARD_TEXT.md`, `ART_STYLE.md`, `UI_STYLE.md`, per-school WAVE files). Align printed text, Codex, art, and `match.ts`.

---

## Gravity Drift (current site ops)

Rebuild from lost minified source is **done and committed** (`92cd7b2` and related). Canonical source: `website/games-src/gravity-drift/`. Legacy minified backup: `website/games-src/gravity-drift-legacy/`.

Still open: **bind KV `BOARD`**, then verify POST `/api/gravity-drift/scores` on production. QA notes: `website/qa/report.md`. Do not re-init git.

Local QA gotchas (from that HANDOFF): prefer Playwright headed Chrome with WebGPU flags; headless GPU is flaky here; Cursor browser-exec was unreliable on this machine.

---

## Pc Controller

Workspace often opened as `pc-controller` alone — still part of SKITZ-GAMES. One React UI for web demo + Android. Transport: `src/transport` (`demoTransport` vs `bluetoothTransport` / Capacitor `BluetoothHid`). Phone layout must match device (desktop preview uses a phone stage). Do not ship a desktop-only layout.

---

## GPU policy vs legacy games

Always-on rule: `.cursor/rules/gpu-first.mdc` + user rule **GPU-first games**.

**New** SKITZ titles follow it from commit one. **Existing** Canvas 2D / WebGL2 games (Pulse Link, Breach Riot, Riot Cube, Paper Riot, Chain Reactor, OCULUM board, etc.) stay as they are unless the user asks to migrate.

---

## User habits (from past work)

- Wants things **live**: after a feature, they often say commit and push so Pages picks it up.
- iPhone Safari and Android Chrome matter; PWAs and hard-refresh after deploy are common.
- APK sideload from the site is the Android distribution path unless Play is explicitly in scope (Pc Controller had a Play-prep commit).
- Never invent store credentials or Cloudflare KV ids. User logs into dashboards.

---

## Cursor conversations worth resuming

Local chats (ids are Cursor conversation ids):

| Topic | Id |
| --- | --- |
| This handoff | `80555009-f080-4be4-9839-2134b422f9c0` |
| Gravity Drift WebGPU / catalog | `aa38954c-421f-4a63-a90e-3ac3fdf1f389` |
| OCULUM status | `cc7ff278-54b9-4a73-b933-99959de826ca` |
| OCULUM continuation | `9b52ae6b-5169-4943-a6d4-8108d433e81d` |
| Pc Controller setup / APK | `11a6ba7a-54cb-48bd-9e6a-35fde1a7715e` |
| Pc Controller update plan | `655b95b4-e0a5-4fe4-9fc6-8bc455422211` |
| Pages + GitHub connect | `23b80499-b807-487e-aa5b-a37afb150e52` |
| Skitz access after login | `27fcbe31-6da7-4f4c-be63-9633b77b976c` |
| Ledgerly / RITE-adjacent invoice | `71643c0b-f416-46b7-9b7f-cd7af1474366` |
| Click Clack / HID | `fc65dd90-bf5b-40d7-9d0c-f979b574437b` |
| Breach Riot worker | `16d5d394-76b1-4293-aa7a-3ad4a3009e19` |

---

## Untracked in SKITZ-GAMES (decide with user)

- `.cursor/` (gpu-first + this continuation rule) — **should be committed** so clones get it.
- `_export-mouse-kb/` nested repo — usually leave untracked or keep as its own GitHub remote.
- `click-clack/design/` — design dump; ask before adding.

---

## Checklist when picking up cold

1. `cd C:\Users\PC\Projects\SHIFTR` and `git status` / `git log -5` on `main`.
2. Confirm live site still `https://skitz-games.pages.dev`.
3. If scores/world boards: KV `BOARD` still the first ops fix.
4. If a game: ship via that folder’s `npm run ship` (or Gravity Drift `build.sh`, or sibling copy).
5. If site Functions/routing: smoke assets before calling it live.
6. Commit and push **only on request**.
