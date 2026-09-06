# GRAVITY DRIFT — REBUILD HANDOFF (session state, Sep 2026)

Read this first. It is the single source of truth for the in-progress rebuild.

## Where things stand

The original game source was **lost** (minified dist only; SKITZ-GAMES repo empty/corrupt).
A full clean-source **rebuild is complete and tested** in this folder
(`games-src/gravity-drift/`), built 1:1 from reverse-engineering the minified bundle
(pieces, gravity, scoring, rotation, shader) plus a juice/art/audio pass.

**Uncommitted** — everything sits in the `SHIFTR/website` working tree, branch `main`.

## DONE + verified (all evidence under %LOCALAPPDATA%/Temp/gd-qa/)

- Rebuild boots clean: 0 page errors, menu→play→death→retry loop works (t10/t13).
- Mechanics ported exactly: 7-bag, gravity 0.38s −0.055/lvl floor 0.07, score = rings×100×combo×level (+2/cell placement, NEW), level=1+⌊lines/4⌋, cascade collapse, top-out. Headless logic test: 30 rings/17,200 pts/Lv 8 (`logic_test.mjs` copied to `qa/`).
- Smart browser bot reproduces same results on screen (`qa/t13_smartbot.py`) — juice (particles, +3000 pop, shockwave, flash, LEVEL pop) confirmed via screenshots.
- Mobile: dock appears during play (`#app.playing .dock`), all 5 buttons work via pointer events; canvas drag-to-aim/tap-to-release added.
- Offline PWA (hand-rolled sw.js), resize mid-play, pause (0s clock leak), name persistence, muted/SND button, NEXT previews (polar-wedge canvases) — all pass.
- API hardened (`functions/_lib/gravity-drift-board.js`): level≡1+⌊lines/4⌋ check, ≤8k pts/s, ≤8 rings/s, min score 8 (1 piece), all caps unit-tested — **31/31 unit tests pass** (`qa/unit_board.mjs`).
- Client↔API integration vs real board logic (`qa/server.mjs` on :8932): POST from live client lands on board; forged 99M curl → 400; honest 17,200 → rank 1. World-board UI renders live ranked data.
- Legacy minified build backed up at `games-src/gravity-drift-legacy/web/`.
- Full original QA report: `qa/report.md` (findings #1 KV dead, #2 forgery, #3 lost source, #4 zero-score runs — #3/#4 now FIXED; #1/#2 need the steps below).

## PENDING — user decisions + actions (was interrupted mid-clarify)

1. **KV binding (production world board is DEAD — 503 `board offline`)**: needs
   `npx wrangler login` then either dashboard: Pages → skitz-games → Settings →
   Functions → KV namespace bindings → add `BOARD`, or `wrangler kv namespace create BOARD`
   + uncomment `[[kv_namespaces]]` in `wrangler.toml` (template already there) + redeploy.
   **This alone makes the world board live.**
2. **SKITZ-GAMES repo**: corrupt `.git` (only empty `objects/`, unrecoverable — verified).
   Proposal was: delete `.git`, `git init -b main`, commit this folder as the canonical
   game source. User approval pending (destructive).
3. **Commit/push website repo**: rebuild + hardened API are uncommitted on `main`.
   Pushing deploys to production (Cloudflare Pages auto-build). User to review.

## How to run things

```bash
# build (copy clean source → public/games/gravity-drift/web)
bash games-src/gravity-drift/build.sh

# static server for the game (:8933)
python -m http.server 8933 --directory "C:/Users/PC/Projects/SHIFTR/website/public/games/gravity-drift/web"

# API server with REAL board logic (:8932)
node "$LOCALAPPDATA/Temp/gd-qa/server.mjs"     # copy in qa/ if Temp was cleaned

# unit tests (31 assertions)
node qa/unit_board.mjs

# headless mechanics test
node qa/logic_test.mjs

# browser QA harness (see qa/harness.py) + smart bot (qa/t13_smartbot.py)
# scripts expect harness.py + server.mjs; GD_URL env sets target URL
```

## Environment gotchas (learned the hard way)

- Hermes `browser_exec` broken on this box ("Chromium missing" persists). **Use pip
  `playwright` directly** (installed in Hermes venv): headed Chrome + `--enable-unsafe-webgpu
  --use-angle=d3d11`. Headless has no WebGPU here (dxil.dll Error 87 = Dawn flakiness
  ~50% of launches → use `relaunch_until_gpu(tries=8)` loop in harness.py).
- Playwright **trusted clicks can hang** on this game after long sessions (EPIPE in
  driver) — fall back to `page.evaluate("el.click()")`; game itself was never at fault.
- `page.tap` needs `has_touch=True` context; `set_viewport_size` is on **page**, not ctx;
  `[data-go=...]` matches 3 hidden buttons — always scope by panel.
- Grid layout: a named grid area must be rectangular — `"rail stage rail"` broke the
  whole page silently. Current layout works (rail left on desktop+fine pointer; rail-top
  row on mobile/coarse).

## File map (new/changed, all uncommitted)

- `games-src/gravity-drift/` — canonical source: index.html, assets/index.css,
  assets/orbitron.woff2, src/{constants,game,juice,sfx,renderer,next,main}.js,
  sw.js, manifest+icons, build.sh
- `games-src/gravity-drift-legacy/web/` — pristine backup of old minified build
- `functions/_lib/gravity-drift-board.js` — hardened sanitizeRun (see above)
- `public/games/gravity-drift/web/` — REBUILT output (replaced legacy)
- `qa/` (this folder) — report.md, unit_board.mjs, logic_test.mjs, server.mjs,
  harness.py + test scripts t10–t15, key screenshots
