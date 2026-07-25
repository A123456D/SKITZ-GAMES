# SHIFTR — Game Design Document

| Field | Value |
| --- | --- |
| **Title** | SHIFTR |
| **Version** | 1.0 (Production GDD) |
| **Engine** | Godot 4.x |
| **Platforms** | iOS, Android (primary); Windows, macOS, Linux, Web (secondary) |
| **Genre** | Puzzle — grid shift / pattern solve |
| **Orientation** | Mobile-first, portrait primary, landscape supported |
| **Target rating** | Everyone / PEGI 3 |
| **Monetization** | Free-to-play with cosmetics + optional Battle Pass (no pay-to-win) |
| **Studio bar** | AAA indie — juice, clarity, 60/120 FPS, production architecture |

---

## 1. Executive Summary

**SHIFTR** is a tactile grid-puzzle game where every input is a full-row or full-column circular shift. Players reconstruct target patterns, chain clears in arcade modes, and chase perfect pars under tight move budgets.

The fantasy is simple and addictive:

> One finger. One shift. The whole board moves. Clarity snaps into place.

The product wins on **immediate readability**, **frame-perfect feel**, and **escalating “one more try” loops** — not on opaque rules or grind.

### One-sentence pitch

Swipe to shift rows and columns on a wrapping grid until the board matches the goal — then chase stars, streaks, and infinite cascade flow.

### Design pillars (non-negotiable)

1. **Readable in under one second** — board state, goal, and legal moves are always clear.
2. **Every shift feels physical** — weight, anticipation, settle, and confirmation juice.
3. **Skill > luck** — seeded RNG only where fair; outcomes are player-authored.
4. **Mobile-first precision** — fat-finger safe, latency budget under 50ms to visual response.
5. **Expand without rewrite** — modes, pieces, modifiers as data-driven content packs.

---

## 2. Core Fantasy & Fantasy Verb

### Fantasy

You are a **pattern architect**. Chaos is a scrambled lattice. Order is one elegant sequence of shifts away. Mastery is seeing the fewest moves before you touch the board.

### Primary verb

**SHIFT** — circularly rotate one row left/right or one column up/down by one cell (or by N cells in advanced rules).

### Secondary verbs (modes unlock these)

| Verb | Meaning |
| --- | --- |
| **SOLVE** | Match the board to a Goal Pattern (Campaign / Daily). |
| **CLEAR** | Form match groups that vanish and refill (Cascade / Endless). |
| **LOCK** | Preserve correct cells (assist / late-game constraint). |
| **PULSE** | Trigger a timed board-wide event (modifiers, bosses). |

---

## 3. Core Gameplay Loop

### 3.1 Micro-loop (0.5–3 seconds)

```
Intent → Aim (row/col highlight) → Commit swipe → Shift animation
→ Rule resolution → Juice + SFX → New readable state → Next intent
```

**Dopamine hooks per micro-loop**

- Anticipation: row/col glow before commit
- Confirmation: thud + squash on settle
- Progress: cells that match goal flash mint / correct-lock shimmer
- Mastery: move counter ticks; par ghost updates

### 3.2 Meso-loop (30–180 seconds) — one puzzle

```
Enter puzzle → Read Goal + constraints → Plan → Execute shifts
→ Optional undo/hint → Win condition → Star rating + score
→ Soft celebrate → Next / Retry / Share
```

### 3.3 Macro-loop (session / day / week)

```
Boot → Daily ping → Campaign chapter OR Endless run
→ Earn currency / cosmetics progress → Streak shield check
→ Social proof (ghost replay / friend par) → Queue next
```

### 3.4 Win / fail conditions (Campaign Align)

- **Win:** Board state identical to Goal Pattern (ignoring cosmetic skins).
- **Fail (soft):** Move budget exhausted with mismatch — offer Retry, Undo pack, or Watch-ad Undo (policy configurable; default: Retry free, ads optional regionally).
- **Never hard-lock** without Undo available in early chapters.

### 3.5 Control of pacing

| Moment | Duration target | Feel |
| --- | --- | --- |
| Shift animation | 80–140ms @ 120Hz (scaled) | Snappy |
| Match clear burst | 180–260ms | Juicy |
| Win fanfare | 700–1100ms | Satisfying, skippable after first |
| Between-level UI | ≤ 400ms to “Next” affordance | Unblocking |

---

## 4. Player Psychology

### 4.1 Target motivations (Bartle × puzzle)

| Drive | How SHIFTR feeds it |
| --- | --- |
| **Competence** | Par ratings, move-optimal solutions, mastery medals |
| **Autonomy** | Multiple valid paths; mode choice; cosmetic identity |
| **Relatedness** | Daily seed leaderboards; shareable solution GIFs; friend ghosts |
| **Curiosity** | Modifiers, new tile types, chapter set-pieces |
| **Flow** | Endless Cascade density tuning; Dynamic Difficulty Assist (optional) |

### 4.2 Cognitive load model

- **Working memory budget:** ≤ 4 simultaneous constraints on screen.
- **Chunking:** Color + shape dual-coding (colorblind-safe).
- **Insight puzzles:** Introduce one new rule, then remix — never two new rules same level.
- **Frustration valve:** Undo stack (default 3), Hint (costs currency after chapter 2), Skip (costs more; skips don’t break streak if “Streak Shield” owned).

### 4.3 Emotion curve per puzzle

1. **Recognition** — “I see the mess.”
2. **Hypothesis** — “If I shift row 2…”
3. **Tension** — near-miss almost-solved boards.
4. **Release** — final shift snap + goal complete chord.
5. **Pride** — stars / new PB / clean par.

### 4.4 Anti-patterns we refuse

- Random soft-locks without Undo
- Obfuscated goals
- Timers on learning levels
- Ads interrupting mid-puzzle (only between puzzles / optional reward moments)
- Paywalled puzzle solutions as the only path

---

## 5. Rules — Authoritative Simulation

### 5.1 Board model

- Grid size `W × H` where `W,H ∈ [3,8]` for campaign; Endless may use 6×6 fixed or escalating.
- Each cell holds a `TileId` (enum / resource id) or empty (Cascade modes).
- Shifts are **circular**: cells wrapping off one edge appear on the opposite edge.
- Simulation is **pure data** (`BoardState` resource / value type). Views never mutate rules.

### 5.2 Shift operation

```
shift_row(y, dir, steps=1)
shift_col(x, dir, steps=1)
```

- `dir ∈ {+1, -1}` mapped to Right/Left or Down/Up.
- `steps` default 1; Hold-drag distance can queue multi-step with single commit (accessibility: also stepper buttons).

### 5.3 Goal Pattern (Align mode)

- Goal is a `W × H` matrix of required `TileId`s.
- Optional **wild goal cells** (`ANY`) for tutorial / creative levels.
- Optional **Anchors**: cells that cannot leave their position (late-game).

### 5.4 Cascade match rules (Endless / arcade)

- After any shift settles, detect groups of `K` connected (4-neighbor) identical tiles, `K ≥ 3` (configurable per mode).
- Groups clear → gravity direction applies (default Down) → new tiles spawn from opposite edge using seeded bag RNG.
- Chain reactions score multipliers.
- Optional: clears only if group includes a “Catalyst” tile (chapter variant).

### 5.5 Determinism

- All RNG uses `SeededRNG` from `level_seed` or `daily_seed` or `run_seed`.
- Replays, ghosts, and race modes must bit-match across platforms (fixed-step sim or integer-only board ops; floats only in presentation).

---

## 6. Modes

### 6.1 Campaign — Align (primary onboarding + narrative spine)

- Chapters of 15–25 puzzles.
- Teach → Test → Twist → Set-piece boss puzzle.
- Stars: 1 = clear, 2 = ≤ soft par, 3 = ≤ hard par (optimal band).
- Story dressing is light: abstract “Signal Restoration” theme — never blocks puzzles.

### 6.2 Daily Challenge

- One Align puzzle per UTC day from `hash(date + season_salt)`.
- Global and friend leaderboards: fewest moves, then time-to-solve as tie-break.
- 3 attempts for ranked; practice mode unranked after.
- Reward: Daily Crate currency + streak XP.

### 6.3 Endless Cascade

- Infinite board with rising intensity.
- Survival metric: score + max cascade + time alive.
- Checkpoints every N clears for continue tokens (limited).
- Primary dopamine / retention sink for skill expression.

### 6.4 Rush (optional post-1.0, designed now)

- Solve N Align boards in a time bank.
- Wrong final check costs time, not instant fail.

### 6.5 Zen

- No move limits, no timers, full Undo, ambient audio.
- Accessibility and wellness mode; still awards cosmetics XP at reduced rate.

---

## 7. Puzzle Progression

### 7.1 Teaching curriculum (first 30 clears)

| Levels | Concept introduced | Forbidden |
| --- | --- | --- |
| 1–3 | Row shift only | Columns, limits |
| 4–6 | Column shift | Multi-color complexity |
| 7–9 | Combined row+col | Anchors |
| 10–12 | Move budget + par | Multi-step drag |
| 13–15 | 2-step shift gesture | New tile types |
| 16–20 | Anchors / locks | Cascade |
| 21–25 | Colorblind dual-shape tiles | — |
| 26–30 | First modifier (Mirror Row) | Two modifiers |

### 7.2 Difficulty axes (compose, don’t spike randomly)

1. Grid size
2. Color/type count
3. Entropy vs goal (minimum moves to solve — **true difficulty**)
4. Move budget slack (`budget - optimal`)
5. Anchors / immovable count
6. Modifiers (wrap disabled on one edge, mirror, gravity reverse, fog of war on goal)
7. Time pressure (Rush only)
8. Vision load (high-contrast skins off)

**Authoring rule:** Change **one primary axis** per level; secondary axis ±1 max.

### 7.3 True difficulty metric (tooling)

Level pipeline must compute:

- `optimal_moves` via solver (IDA* / bidirectional BFS with pattern DB for small boards)
- `branching_factor` estimate
- `deceptive_near_miss_count`

CI fails content PRs if `budget < optimal` or if estimated clear-rate band mismatches chapter curve.

### 7.4 Chapter structure template

```
[2 teach] [3 reinforce] [1 twist] [4 remix] [1 boss] [1 palate cleanser Zen-like]
```

Boss: large emotional beat (unique VFX, music stem layer, single new spectacle rule that is fair).

---

## 8. Difficulty Curves

### 8.1 Campaign star curve (target population)

| Chapter | 3★ clear rate target | Median attempts | Rage-quit budget |
| --- | --- | --- | --- |
| 1 | 70% | 1.2 | Near zero |
| 2 | 55% | 1.6 | Low |
| 3 | 40% | 2.2 | Medium |
| 4–5 | 30% | 2.8 | Medium |
| Late | 15–25% | 3.5+ | High but with valves |

### 8.2 Dynamic Difficulty Assist (DDA) — optional, off by default in Competitive

If enabled in Settings:

- After 3 fails: subtle Goal pulse on mismatched cells.
- After 5 fails: free Hint token once per puzzle.
- Never auto-solves; never changes optimal path invisibly.

### 8.3 Endless intensity ramp

```
intensity(t) = base + floor(clears/10)*step + cascade_bonus
```

- Spawn bag weights skew toward “almost groups” then correct toward hostility as intensity rises.
- Fairness: no unavoidable death in first 30s for median skilled player on default.

---

## 9. Reward Systems

### 9.1 Currencies

| ID | Name | Earn | Sink |
| --- | --- | --- | --- |
| `soft` | Sparks | Levels, dailies, achievements | Hints, continues, cosmetic crates |
| `premium` | Prisms | IAP, Battle Pass track | Cosmetic shop, Pass tiers |
| `season_xp` | Signal XP | All modes | Pass progression |

**No power sells.** Prisms never buy stars, solves, or Endless score multipliers that affect leaderboards.

### 9.2 Stars & mastery

- Stars gate soft chapter unlocks (e.g., Chapter N+1 requires `3*(N)` stars cumulative — tuned generously).
- **Mastery Medal**: solve at optimal moves without Undo/Hint.
- **Clean Sweep**: 3★ all chapter without continues.

### 9.3 Cosmetics (identity rewards)

- Tile skins (material + edge light)
- Board frames
- Shift trail VFX
- Win fanfare variants
- Cursor/touch ripple styles
- Music stem packs (same tracks, alternate instruments)

### 9.4 Feedback rewards (non-currency)

- Haptics patterns by event rarity
- Camera micro-zoom on big cascades
- Chorus layer add on streak days

---

## 10. Daily Challenges

### 10.1 Spec

- Seed: `SHA256("SHIFTR" + yyyy-mm-dd + season_id)` → board + goal generation parameters within a validated template pool.
- Templates ensure solvability and target optimal band `moves ∈ [6, 18]` rotating by weekday intensity.
- UI: countdown to next UTC reset; streak flame; “Yesterday’s Top 100” ghost.

### 10.2 Streaks

- +1 streak per day with ≥1 ranked clear.
- Milestones at 7 / 30 / 100 → exclusive cosmetics.
- **Streak Shield** (earn or rare shop): ignore one missed day.

### 10.3 Fairness

- Same puzzle worldwide per day.
- Practice clone available after first ranked attempt.
- Anti-cheat: move log hash verification for top ranks.

---

## 11. Endless Mode

### 11.1 Fantasy

“Stay in flow. One more cascade.”

### 11.2 Run structure

1. Board starts stable with guaranteed opener matches after 1–2 shifts (tutorialized first run).
2. Each clear adds score `base * group_size * chain_mult * intensity_mult`.
3. Periodic **Events**: frozen row, locked color, double-shift only, etc., lasting N moves.
4. Death: no legal shift creates a clear within `deadlock_threshold` OR board fills with unmatchable noise under specific mode rules — prefer **soft deadlock detect + shuffle token** over sudden death early.

### 11.3 Continues

- 1 free continue/day; then Sparks; then optional rewarded ad; then Prism.
- Continue preserves score with a visible “continued” flag on non-competitive boards; competitive season boards: no continues on ladder.

### 11.4 Meta progress

- Endless XP → unlocks Cascade-only cosmetics.
- Personal bests: Score / Max Chain / Longest Run Time / Most Clears.

---

## 12. Achievements

Design achievements as **skill affirmations** and **exploration badges**, not busywork.

### 12.1 Examples (ship set ~40)

| ID | Name | Criteria | Tier |
| --- | --- | --- | --- |
| `first_shift` | Kinetic | Perform first shift | Bronze |
| `par_novice` | On Par | 10× 3★ | Silver |
| `optimalist` | Optimalist | 5× Mastery Medals | Gold |
| `daily_week` | Signal Keeper | 7-day streak | Silver |
| `cascade_10` | Chain Reaction | Cascade ×10 | Gold |
| `no_undo_chapter` | Pure | Finish a chapter with 0 undos | Gold |
| `zen_hour` | Still Mind | 60 min Zen cumulative | Bronze |
| `speed_daily` | Lightning Trace | Daily under 20s | Gold |
| `completionist` | Full Spectrum | 100% Campaign stars | Platinum |

Platform achievements map 1:1 to Google Play / Game Center where possible.

---

## 13. Replayability

| System | Replay hook |
| --- | --- |
| Stars / mastery | Optimize old levels |
| Daily seed | Social + streak |
| Endless | High-score chasing |
| Modifiers weekly | Rotating ruleset playlist |
| Cosmetics | Expression goals |
| Ghost races | Beat your best path |
| Newgame+ chapters | Same boards, Anchors+ / fewer moves |
| User levels (post-1.0) | UG C with solvability stamp |

**Solution replay:** record input stream; scrubbable; export silent GIF/WebM for shares.

---

## 14. Monetization

### 14.1 Principles

1. **Respect attention** — no mid-puzzle ads.
2. **Cosmetics only** for competitive integrity.
3. **Clear value** — Battle Pass shows all track rewards upfront.
4. **Regional ethics** — ad density and IAP pricing via remote config + store rules.
5. **Remove-ads IAP** — one-time; removes interstitial/rewarded *prompts* but keeps optional rewarded doubles if player opts in.

### 14.2 IAP matrix

| SKU | Type | Contents |
| --- | --- | --- |
| `ads_remove` | Non-consumable | No forced ads |
| `prism_pack_S/M/L` | Consumable | Prisms |
| `starter_kit` | Non-consumable | Frame + trail + small Prisms (once) |
| `season_pass` | Season | Premium track + 10% XP |
| `streak_shield` | Consumable | 1 shield |

### 14.3 Battle Pass (12 weeks)

- Free track: Sparks, basic cosmetics, hints.
- Premium track: premium skins, unique win FX, profile badges.
- No board-power rewards on either track.

### 14.4 Live ops (light touch)

- Weekly Modifier Weekend (Endless ruleset).
- Cosmetic drops tied to events — not FOMO loot boxes with cash odds. Prefer **buyout crates with published contents** or direct shop.

### 14.5 Predicted ARPU posture

- Whale ceiling via cosmetics, not power.
- Conversion: Remove-ads after session 3–5; Pass at season start.

---

## 15. Accessibility

### 15.1 Sensory

- Full colorblind palettes (Protan / Deutan / Tritan / High Contrast).
- Dual-encode tile type with shape + icon, not color alone.
- All critical SFX mirrored by visuals; captions for voice lines if any.
- Screen reader labels on all UI chrome; board cell reading mode (“row 2 column 3, blue circle, correct”).

### 15.2 Motor

- Tap-to-select row/col + on-screen arrow steppers (alternative to swipe).
- Adjustable swipe threshold and sticky aim assist.
- Hold-to-repeat shift at accessible rate.
- 100% of campaign completable without timed presses (Rush exempt / optional).

### 15.3 Cognitive

- Zen mode.
- Explicit rule tooltips with examples.
- Reduce motion: cuts squash/zoom; keeps clarity flashes.
- Simplified VFX preset.

### 15.4 Systemic

- Remappable keyboard / gamepad.
- Multiple save slots / cloud save.
- Dyslexia-friendly font option.
- Minimum contrast ratios WCAG AA on UI.

---

## 16. Audio Design

### 16.1 Philosophy

Audio is **tactile confirmation**. Every shift has a physical signature. Music is modular and never masks UI beeps.

### 16.2 Buses (Godot)

```
Master
 ├─ Music
 ├─ SFX_UI
 ├─ SFX_Game
 ├─ SFX_Juice (cascades, win)
 └─ Ambience
```

### 16.3 Sound palette

- Materials: soft polymer + glass — “premium toy,” not arcade bleep spam.
- Shift: whoosh → quantized tick on settle (pitch ↑ slightly if move improves goal Hamming distance).
- Error / illegal: muted rubber thud (rare; prefer prevent illegal).
- Cascade: layered chord arpeggio scaling with chain length (musical key follows chapter).
- Win: resolved major motif; 3★ adds harmonic lift; Mastery adds one pure sine “chime of clarity.”

### 16.4 Music

- Adaptive stems: Calm / Focus / Tension / Victory.
- Intensity tied to: fails count, moves remaining ratio, cascade heat.
- Zen: single stem, no tension layer.

### 16.5 Haptics (paired with audio)

| Event | Haptic |
| --- | --- |
| Aim select | light impact |
| Shift settle | medium impact |
| Correct cell increase | selection tick |
| Cascade ≥5 | heavy + rumble pattern |
| Win | success pattern |
| Fail budget | soft warning |

Respect OS haptic toggles; provide in-app intensity slider.

---

## 17. Animation Principles

### 17.1 Laws for SHIFTR

1. **Anticipation** before shift (2–3 frames aim compress).
2. **Follow-through** on settle (overshoot ≤ 8%, spring damped).
3. **Staging** — only one primary motion focus; UI waits.
4. **Exaggeration** for cascades, restraint for normal shifts (readability > circus).
5. **Appeal** — rounded interpolation, no robotic linear snaps unless Reduce Motion.

### 17.2 Timing bible (at 60 FPS baseline; scale deltas for 120)

| Animation | Duration | Ease |
| --- | --- | --- |
| Row/col aim highlight | 60ms | OutCubic |
| Tile shift travel | 100ms | InOutCubic + settle spring |
| Correct shimmer | 200ms | OutQuad |
| Clear explode | 220ms | OutBack on scale |
| Gravity drop | 120ms + stagger 15ms/row | InQuad |
| Win board pulse | 400ms | Sinusoidal |
| UI button press | 80ms | OutBack (scale 0.96→1) |

### 17.3 Juiciness budget

- Particle count caps by tier (Low / Med / High) with strict pools.
- No full-screen passes that break 16.6ms / 8.3ms frame budgets on mid-tier mobiles.
- Juice is data-driven (`JuiceEvent` resources) so modes share emitters.

### 17.4 Readability overrides juice

If a VFX hides tile identity for >50ms, it is a bug.

---

## 18. Visual Identity

### 18.1 Art direction

**“Luminous precision.”** Soft-edged geometry, disciplined palette, editorial negative space. Think premium puzzle toy meets signal/UI sci-fi — **not** candy crush clutter, **not** grimdark.

**Production reference:** `docs/VISUAL_IDENTITY.md` (tokens, post-FX, UI kit, quality tiers). Shipping play chrome defaults to deep charcoal / cool steel / electric cyan-mint.

### 18.2 Color system (base light theme)

| Token | Hex (guide) | Use |
| --- | --- | --- |
| `bg.deep` | `#0E1116` | Dark theme / void bg (first-class) |
| `bg.play` | `#F3F5F8` | Optional light playfield |
| `ink` | `#12151A` | Primary text (light theme) |
| `ink.light` | `#E8EEF4` | Primary text (dark chrome) |
| `accent.signal` | `#2FE0C5` | Correct / CTA |
| `accent.warn` | `#FF6A3D` | Budgets / alerts |
| `tile.a–f` | curated 6 | Gameplay colors (CB-safe set) |

Dark theme is first-class, not an afterthought — same tokens remapped. Runtime: `resources/configs/visual/default_design_tokens.tres`.

### 18.3 Typography

- Display: distinctive geometric sans (licensed) for logo & titles.
- UI: highly legible grotesk; tabular numbers for moves/timers.
- Avoid default engine font in shipping builds.

### 18.4 Logo / brand

- Wordmark **SHIFTR** with a horizontal offset cut in the stem of **F** or **T** suggesting a shift.
- Motion logo: letters offset then snap into alignment (0.8s, skippable).

### 18.5 Board craft

- Tiles: 12–16px corner radius at reference res; inner glyph; subtle height for parallax on shift.
- Goal panel: miniature board or side strip; never ambiguous scale.
- Background: soft gradient mesh + faint grid; no busy illustration behind active cells.

### 18.6 What we never ship

- Purple-on-white default AI look
- Confetti spam on every move
- Unreadable skeuomorphic wood piles
- Flat grey prototype materials in release

---

## 19. UX Philosophy

### 19.1 Mantras

1. **One job per screen.**
2. **The board is the hero** — chrome is subordinate.
3. **Always show consequence** — aim preview ghost of post-shift state (optional toggle; on for new users).
4. **Safe experimentation** — Undo is a right in learning content.
5. **Exit respect** — state saved on backgrounding mid-puzzle.

### 19.2 Information hierarchy (play screen)

1. Board  
2. Move budget / par  
3. Goal reference  
4. Undo / Hint / Pause  
5. Soft currency (never during critical timing)

### 19.3 Onboarding

- 0 text walls. First failure teaches via ghost arrows.
- Coach marks ≤ 3 words.
- Skip tutorial available; competence quiz optional.

### 19.4 Error prevention

- Illegal actions disabled with reason toast once.
- Confirm only on destructive meta actions (reset progress).

### 19.5 Meta UX

- Home: Daily (primary card), Continue Campaign, Endless, Shop, Cosmetics.
- No more than one promotional modal per session cold start.

---

## 20. Control Schemes

### 20.1 Touch (primary)

| Gesture | Action |
| --- | --- |
| Tap cell | Select row+col crosshair |
| Swipe on row | Shift row by steps∝distance (quantized) |
| Swipe on col | Shift col |
| Tap arrow pads | Nudge selection (accessibility) |
| Two-finger tap | Undo (optional setting) |
| Edge swipe | Disabled for browser conflicts; use buttons |

**Latency budget:** touch → aim highlight ≤ 1 frame; commit → tiles moving ≤ 2 frames.

### 20.2 Keyboard

| Key | Action |
| --- | --- |
| Arrows / WASD | Move selection |
| Q/E | Shift row −/+ |
| R/F | Shift col −/+ |
| Z | Undo |
| H | Hint |
| Enter | Commit if using staged commits |
| Esc | Pause |

### 20.3 Gamepad

- D-pad / stick: selection  
- Shoulder: cycle row vs col focus  
- Face: shift directions  
- West: Undo · North: Hint · Start: Pause  

### 20.4 Input architecture

- `InputActions` resource map → `Intent` commands → `BoardController` validates → `BoardSim` mutates → events to View/Audio/Juice.
- No gameplay logic inside gesture detectors.

---

## 21. Technical Architecture (Godot 4.x)

### 21.1 Why this shape

- **Composition over inheritance:** tiles, modifiers, and modes are components/resources plugged into a thin `Board` host.
- **Sim/View split:** enables determinism, headless solver CI, replays, and multiplayer ghosts later.
- **Data-driven content:** designers ship `.tres` / JSON levels without code.
- **Mobile perf:** object pooling, few draw calls, shader batching, no per-frame GC spikes in GDScript hot paths (prefer typed arrays, cache, `BoardSim` in tight loops; consider GDExtension only if profiling demands).

### 21.2 Folder structure

```
res://
├─ addons/
├─ assets/
│  ├─ art/
│  ├─ audio/
│  ├─ fonts/
│  └─ vfx/
├─ docs/
├─ resources/
│  ├─ levels/
│  ├─ modes/
│  ├─ cosmetics/
│  ├─ juice/
│  └─ themes/
├─ scenes/
│  ├─ boot/
│  ├─ meta/
│  ├─ play/
│  └─ ui/
├─ shaders/
└─ src/
   ├─ app/                 # boot, scene flow, services locator
   ├─ board/               # sim, commands, solvers
   ├─ presentation/        # board view, tweens, VFX bindings
   ├─ input/               # gestures, action maps
   ├─ modes/               # Align, Cascade, Daily adapters
   ├─ meta/                # progress, economy, achievements
   ├─ audio/
   ├─ save/
   ├─ platform/            # IAP, ads, analytics wrappers
   └─ util/
```

### 21.3 Core modules

| Module | Responsibility |
| --- | --- |
| `BoardState` | Immutable-friendly snapshot; apply `BoardCommand` → new state |
| `BoardCommand` | ShiftRow/Col, ClearGroup, Spawn, etc. |
| `BoardSim` | Rules + RNG; emits `SimEvent`s |
| `BoardView` | Binds events to tweens/meshes; never rules |
| `IntentPipe` | Input → commands with validation |
| `LevelResource` | Grid, goal, budget, modifiers, juice profile |
| `ModeController` | Win checks, scoring, spawns mode-specific systems |
| `JuiceDirector` | Maps `SimEvent` → VFX/SFX/haptics |
| `SaveService` | Versioned serialization, cloud hooks |
| `EconomyService` | Currencies, sinks, receipts |
| `DailyService` | Seed schedule, leaderboard API |
| `AchievementService` | Stat hooks, platform unlocks |
| `SceneFlow` | Boot → Home → Play → Results; async loads |

### 21.4 Frame & perf budget (mobile mid-tier)

- 60 FPS mandatory; 120 FPS where display supports (tween times use delta ms, not frames).
- CPU: sim < 0.5ms per input; cascade resolve < 2ms typical.
- GPU: ≤ 50 draw calls play screen target; atlas tiles.
- Memory: pooled tiles for max 8×8 + VFX; streaming unused chapter art.

### 21.5 Rendering

- 2D node board with shared material / custom shader for correct-state rim.
- Optional SDF text for crisp UI.
- Safe area / notch handled by UI root containers.

### 21.6 Networking (minimal at 1.0)

- Auth + leaderboards + cloud save + remote config.
- No realtime PvP required for launch.
- All net I/O behind `IBackend` interface for mock/local.

### 21.7 Analytics events (privacy-first)

`session_start`, `level_start/fail/clear`, `moves`, `undo`, `hint`, `iap_success`, `daily_clear`, `endless_over` — aggregate, exportable opt-out.

### 21.8 Testing strategy

- Unit: board ops, scoring, economy edge cases.
- Property: shift invertibility, seed determinism.
- Content: solver validates all campaign levels in CI.
- Device lab: 5th %ile Android + last2 iPhones; thermal throttling tests with juice maxed.

---

## 22. Content Pipeline

1. Designer drafts level in editor plugin (paint goal + scramble + modifiers).
2. Solver computes optimal + warns.
3. Playtest telemetry band vs target.
4. Juice profile assign.
5. Localization pass for any strings.
6. Lock seed & ship in content pack.

**Localization:** UI strings externalized launch day (EN + figure 2 additional); puzzle content mostly non-linguistic.

---

## 23. Future Expansions

### 23.1 Season 2+ modes

- **Mirrorverse:** shifts reflect across axis.
- **Hex SHIFTR:** hexagonal grid variant.
- **Co-op Assist:** two cursors, shared board async.
- **Raid Boss Pattern:** community HP via daily aggregate clears.

### 23.2 UGC

- In-game editor with solvability badge.
- Rated playlist browser; creator cosmetics.

### 23.3 Platform extras

- Apple Watch / Android tile: daily par glance.
- Steam Deck validation; TV mode focus UI.

### 23.4 Competitive

- Weekly race cups with anti-cheat move validation.
- Spectator ghost overlays.

### 23.5 Tech

- GDExtension sim if CI/device profiling requires.
- Replay share to web viewer.

---

## 24. Production Scope

### 24.1 MVP (playable vertical slice)

- Align mode, 30 levels, Undo/Hint, juice kit v1, soft currency, local save, touch+keyboard, colorblind palette, settings.

### 24.2 1.0 Launch

- Full campaign (100+ levels / 5–7 chapters)
- Daily + streak
- Endless Cascade
- Achievements
- Cosmetics shop + Remove-ads
- Cloud save + leaderboards
- Battle Pass season 1 (if live-ops ready; else cosmetics shop only)

### 24.3 Explicit non-goals for 1.0

- Realtime PvP
- Loot box random IAP
- 3D board (unless prototype proves perf/feel)
- Narrative cutscenes longer than 10s

---

## 25. Success Metrics

| Metric | Target (soft launch) |
| --- | --- |
| D1 retention | ≥ 40% |
| D7 retention | ≥ 20% |
| Tutorial completion | ≥ 85% |
| Time-to-first-delight (first win juice) | < 60s |
| Crash-free sessions | ≥ 99.5% |
| Median level clear FPS | 60 on mid-tier |
| 3★ rate chapter 1 | ≥ 65% |

---

## 26. Open Questions / Locked Decisions

| Topic | Status |
| --- | --- |
| Core verb = circular row/col shift | **LOCKED** for v1 GDD |
| Align + Cascade dual modes | **LOCKED** |
| No pay-to-win | **LOCKED** |
| Narrative depth | Light framing only unless story pitch expands |
| Exact grid max | 8×8 campaign cap unless solver/perf greenlights 9–10 |
| Ad network choice | Platform decision at production |

---

## 27. Appendix A — Example Level Spec

```text
id: ch1_l012
mode: align
size: 4x4
tileset: primary_4
goal: [
  A A B B
  A A B B
  C C D D
  C C D D
]
start: <scrambled; optimal=5>
budget: 8
par_soft: 7
par_hard: 5
modifiers: []
juice_profile: calm_teach
tags: [teach_combined]
```

## 28. Appendix B — SimEvent Catalog (partial)

`ShiftStarted`, `ShiftSettled`, `CellCorrectnessChanged`, `MoveSpent`, `BudgetEmpty`, `GoalMet`, `GroupCleared`, `CascadeStep`, `Spawned`, `DeadlockDetected`, `HintUsed`, `UndoApplied`.

## 29. Appendix C — Team Responsibilities (RACI lite)

| Area | Owner |
| --- | --- |
| Board sim & solver | Gameplay Engineering |
| Feel / juice / shaders | Tech Art + Client Eng |
| Level curriculum | Game Design |
| Economy / live ops | Design + Product |
| UI/UX | UI Design + Client Eng |
| Audio | Audio Design |
| QA / device lab | QA |
| Backend / leaderboards | Server Eng |

---

## Document control

- **This GDD is the source of truth** for systems and player experience.
- Gameplay code must match §5 and §21; deviations require GDD amendment.
- Content may iterate inside locked rules without GDD revisions; **rule changes** require version bump.

**End of GDD v1.0**
