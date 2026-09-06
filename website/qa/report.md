# Gravity Drift — QA & Design Report
**Tested:** web build `public/games/gravity-drift/web/` (local static + real-API dev server) and production `skitz-games.pages.dev`
**Method:** Playwright-driven gameplay (keyboard + touch), unit tests vs `_lib/gravity-drift-board.js`, live API integration, offline/resize/mobile passes, bundle & CSS forensics, screenshot review.
**Artifacts:** `C:/Users/PC/AppData/Local/Temp/gd-qa/` (screenshots `t1`–`t9`, test scripts, unit suite)

---

## Verified working (evidence)
- **Polar Tetris loop end-to-end:** aim → release → inward drift → ring clears → cascade collapse → combo scoring → core breach on rim-full. Bot run: 10 RINGS / 3,000 pts / LV 3 in one cascade chain.
- **Clock honest:** 1.01× wall over 16s; pause leaks 0s (6s paused → 0 game seconds).
- **Resize:** canvas re-fits 1280→800→1500 px mid-play, run continues.
- **Mobile (390×844, touch):** dock (◀ ↻ ▶ / DROP / HARD) appears during play, all 5 buttons landed taps; well fits; no horizontal scroll; help text hides on coarse pointers.
- **Offline PWA:** SW activates, offline reload works, run playable offline, score saved locally, flushes when online (pending-queue + retry confirmed in bundle and behavior).
- **Username:** gate enforced (empty/short rejected), persists across reload, sanitized identically to server rules.
- **Scoring lib unit tests:** 25/25 pass (boundaries, XSS/emoji/unicode sanitization, tie-break `score desc → lines desc → earliest`, 100-cap).
- **Performance:** ~144 FPS with WebGPU (d3d11); zero page errors across all sessions.
- **Visuals:** polar well renders cleanly; ghost preview; NEXT queue; readable HUD; polished game-over card.

---

## Findings (prioritized)

### 1. HIGH — Production world board is dead: KV binding `BOARD` missing
`POST https://skitz-games.pages.dev/api/gravity-drift/scores` → **503 `{"error":"board offline"}`** (verified by curl and in-game). Every real run queues forever; world board is permanently empty. The game's stated meta ("scores rank on the world board under your username") is nonfunctional in production. GET falls back to `{"scores":[]}` so the UI looks alive — masking the outage.
**Fix:** create a KV namespace and bind it as `BOARD` in Cloudflare Pages → Functions → KV namespace bindings, then redeploy. (The local code already handles GET-missing-BOARD gracefully.)

### 2. HIGH — World board accepts fabricated runs
`POST {"score": 99999999, ...}` with any curl → accepted, **rank 1**. No auth, no rate limit, no score-vs-time sanity. Also: zero-score runs occupy world ranks (a 0-point run ranked #1–#4 during tests).
**Mitigations (cheap first):** per-IP KV rate limit; reject score-0 submissions to world board; heuristic cap (score ≤ f(time, level)); Turnstile on POST. Perfect anti-cheat isn't needed — just raise the bar above curl.

### 3. HIGH (process) — Game source is not in any repository
`SKITZ-GAMES` repo is empty (only `.git`). The only local artifact is the **minified** dist in the website repo. One disk failure and this game is undebuggable.
**Fix:** commit the actual source project (the one whose `dist/` gets copied) and push it.

### 4. MEDIUM — Score stays 000000 until a ring clears
Placement scores nothing (`score += rings×100×combo×level` only, verified in bundle). Casual first runs end at zero after 20–40s of apparently pointless packing — weak feedback for the first 60 seconds, the retention window. Most players will never see a score move.
**Suggestion:** small placement reward (cells × level) or survival tick, keeping clears as the multiplier moments.

### 5. MEDIUM — WebGPU hard gate, no fallback
No adapter ⇒ "GPU REQUIRED" and a dead end (graceful UI, but unplayable). Excludes older Safari/Firefox/Linux combos; the games index advertises iOS + web. A WebGL2 fallback renderer is real work — at minimum, feature-detect on the site's game card and label requirements.

### 6. LOW — World-tab status label sticks on "Loading world board…" (prod)
With POSTs failing and GET returning empty, status stayed "Loading…" instead of an error/empty state (local 404 correctly shows "World board unreachable."). Error-state label handling only covers one failure shape.

### 7. LOW — Depth ceiling by design
12 rings × 10 spokes is shallow; careless play ends in seconds, skilled cascade play snowballs quickly. Consider more spokes at higher levels or rim spawn constraints to extend the skill curve. (No HOLD slot — defensible uniqueness choice, but it will be the first community request.)

---

## Untested / unknown
- Audio output (armAudio exists; not verified audibly).
- Real iOS/Android device behavior (emulated touch only).
- Long-session memory/GPU leaks (sessions were minutes, not hours).
