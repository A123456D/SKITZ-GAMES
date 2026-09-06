# SKITZ / SHIFTR — agent entry

You are continuing **all** SKITZ games, apps, site, GitHub, and Cloudflare work. Read this, then [`docs/HERMES_HANDOFF.md`](docs/HERMES_HANDOFF.md), before changing anything.

**Brand:** SKITZ (site, catalog, Android apps). **SHIFTR** is the Godot puzzle at repo root *and* the local folder name. Catalog slug `shiftr` is the web game **Pulse Link**.

## Identity and git

| Item | Value |
| --- | --- |
| Canonical disk | `C:\Users\PC\Projects\SHIFTR` |
| GitHub | https://github.com/A123456D/SKITZ-GAMES (`origin`, branch `main`) |
| Live site | https://skitz-games.pages.dev |
| GitHub account | `A123456D` |
| Commits / pushes | **Only when the user asks.** Pushing `main` deploys production. |

Do not use `C:\Users\PC\Projects\skitz-site` (stale clone of the same remote).

## Deploy (no GitHub Actions)

Cloudflare Pages project **`skitz-games`**, connected to `A123456D/SKITZ-GAMES`.

| Pages setting | Value |
| --- | --- |
| Root directory | `website` |
| Build | `npm run build` |
| Output | `dist` |
| Env | `NODE_VERSION=22` |

Workflow:

1. Change game/app source in its folder.
2. Ship into the catalog (`npm run ship` where it exists, or copy APK / Vite `dist` into `website/public/...`).
3. Commit **source + `website/public` copies** together when the user asks.
4. `git push origin main` → Pages rebuilds.
5. After anything that can touch Functions, `_headers`, `_routes.json`, or `/images`: `cd website && npm run smoke:assets` must exit 0.

Never add a catch-all Pages Function. See `website/.cursor/rules/pages-asset-safety.mdc`.

## GPU

New titles: **WebGPU** (browser) or **wgpu** (native). No Canvas 2D gameplay render, no silent fallback. Older catalog games still use Canvas 2D / WebGL2 — do not “fix” them to WebGPU unless the user asks. Gravity Drift already gates on WebGPU.

## Do next (ops)

Production world boards POST **503 `board offline`** until KV namespace **`BOARD`** is bound on Pages project `skitz-games` (see `website/wrangler.toml`). Binding that is the highest-priority site ops task. Do not `git init` or delete `.git` — the GitHub history is real.

## Per-project docs

| Area | Read first |
| --- | --- |
| Full map, siblings, pending | `docs/HERMES_HANDOFF.md` |
| Gravity Drift rebuild | `website/games-src/gravity-drift/HANDOFF.md` (KV still open; git-reinit notes are stale) |
| Godot SHIFTR | `docs/README.md`, `docs/GDD_SHIFTR.md`, `docs/RELEASE_READINESS.md` |
| OCULUM | `oculum/README.md`, `oculum/.cursor/rules/` |
| Site catalog | `website/src/content/games/`, `website/src/content/apps/` |
