# SHIFTR — Concept Alignment

**Status:** Phase 2 vertical slice + P1 polish + iteration 6 (authored Signal campaign, locale CSV fix, local LB honesty, placeholder icon).  
**Concept source of truth:** `assets/reference/concept/` (+ workspace ChatGPT boards).  
**Product brief wins** over older charcoal/steel/cyan-mint guidance.

---

## Concept read (what “expensive” means)

| Pillar | Concept signal |
| --- | --- |
| Fantasy | Swipe a row/column → whole line slides → lasers reconnect → chain reactions |
| Palette | Near-black void · **purple primary** · blue secondary · cyan accent · emissive object colors |
| Surfaces | Rounded tiles, frosted glass chrome, thin neon borders, soft bloom |
| Board | Dark glass cells, glowing object icons, purple shift band + arrows, animated laser lines |
| HUD | `LEVEL` centered · circular moves dial (moves + best) · Undo / Restart / Hint / Levels · minimal chrome |
| Menu | Brand **SHIFTR** + tagline **EVERY MOVE CHANGES EVERYTHING** · sparse CTAs |
| Victory | Glass sheet · 3 gold stars · moves / best · calm satisfaction beat |
| Feel | Elastic slides, breathing glow, connection lines that *arrive* — never flat fills |

---

## Current vs concept (gap matrix)

| Area | Was | Concept | Severity | This pass |
| --- | --- | --- | --- | --- |
| Design tokens / theme | Charcoal + mint | Neon purple / blue / cyan glass | P0 | Shipped |
| Main menu tagline | Older line | EVERY MOVE CHANGES EVERYTHING | P0 | Shipped |
| Play HUD | Text budget | LEVEL + dial + 4 actions | P0 | Shipped |
| Board tiles | Glyphs | Dark glass + unique neon icons | P0→P1 | **Baked PNG atlas** (3× supersample + Align A–F) |
| Row/col highlight | Soft band | Purple glass band + arrows | P0 | Shipped + land pulse |
| Laser visualization | Static lines | Draw-along-path + receiver pulse | P0→P1 | Shipped + quality caps |
| Victory UI | Fade only | 3★ glass + celebration | P0→P1 | Star cascade + burst |
| Play routing | Feel lab leaks | Continue / Level Select → concept slice | P1 | Shipped + saved resume |
| Door / switch art | Static glyph | Open/close + toggle states | P1 | Shipped |
| Color blocks | Paint-only IDs | Catalog + modular rules | P1 | Red axis-lock + **cycle-around** |
| Echo / worlds / daily chrome | Absent | Concept meta | P2→P1 | **EchoSim + Worlds + neon cards** |
| Daily / Endless play | Chrome → concept demo | Seeded Align + ramp | P2→P1 | **PuzzleGenerator wired** |
| World skin path | Hint-cycled | Worlds screen only | P1 | **Hint = puzzle tips** |
| Daily soft/hard chrome | Catalog stubs | Live generator pars | P2→P1 | **Shipped** |
| Endless leaderboard | Save-only wave | Submit + local rank | P2→P1 | **Shipped** |
| Align victory juice | Shared path, mode titles weak | Same sheet + `puzzle_solve` as laser | P1 | **Unified `_fire_victory`** |
| Orbitron weights | Documented / missing files | OFL Regular+SemiBold+Bold | P1 | **Shipped under `assets/fonts/`** |
| Authored campaign | Laser demo only | Teaching chapter | P2→P1 | **Signal Awakening 7 levels** |
| Localization load | CSV in `locale/translations` spam | Silent en/es/fr | P1 | **LocaleService CSV register** |
| Global LB UI | Fake catalog names | Honest local | P1 | **Local Daily/Endless only** |

### Mechanical gaps (legend vs sim — honest status)

| Legend object | Sim today | Visual |
| --- | --- | --- |
| **Red block** | Movable + **`axis_lock` horizontal** — **row shifts carry red**; **column shifts leave red fixed** and cycle other cells around it (`AxisLockFilter` → `BoardSession.apply_axis_cycle`) | Neon cube + ←→ axis mark |
| **Blue block** | Movable + self-gravity (`block_blue`) | Cube + fall arrow |
| **Green block** | Clone once into adjacent empty after a shift (`clone` component) | Cube + double-square mark |
| **Yellow block** | Countdown fuse → destroy on 0 (`countdown` component) | Cube + fuse pips |
| Mirror | Yes | Slash / backslash neon bar |
| Magnet | Yes | Purple horseshoe |
| Ghost | Yes | Wireframe phantom |
| Time / rewind | Partial | Hourglass |
| Laser emitter / receiver (goal) | Yes | Emitter chevron / concentric goal |
| Door / switch | Yes | Door splits open; switch lever + lit orb |

---

## Axis-lock cycle-around-fixed (documented behavior)

**Design intent:** Red is horizontal-only. Row swipes move red with the row. Column swipes do **not** reject — they keep red planted and wrap every other cell in that column around it (ring of length `height - 1`).

**Architecture (BoardSim stays pure):**
1. `AxisLockFilter.plan_cycle_around_locks` detects off-axis locked riders on the line.
2. Builds `writes` (destination `BoardTileData`) + presentation `TileMove`s for the movable ring.
3. `PuzzleEngine.apply` / `BoardFeelController` call `BoardSession.apply_axis_cycle` (batch tile writes, one undo unit via `HistoryEntry.previous_tiles` / `redo_tiles`).
4. Connection endpoints on the line are remapped with `AxisLockFilter.remap_connections_for_cycle` (reversed on undo).
5. After cycle: `resolve_after` / `recompute` forces **channel + laser** settle so view matches sim (also on anim finish when `axis_cycle`).
6. Entire-line locked → reject (`axis_lock`). No locks → normal `SHIFT_ROW` / `SHIFT_COLUMN`.

---

## Authored campaign (iteration 6)

**Chapter:** Signal Awakening (`ch_signal`) — 7 handcrafted levels in `CampaignLevelCatalog`.

| # | Id | Teach | Mode |
| --- | --- | --- | --- |
| 1 | `ch_signal_01` | Swipe | Align 3×3 half-shift |
| 2 | `ch_signal_02` | Laser | Clear crate → receiver |
| 3 | `ch_signal_03` | Mirror | Slide mirror into beam |
| 4 | `ch_signal_04` | Switch | Tap switch → door channel |
| 5 | `ch_signal_05` | Latch | Receiver arms door |
| 6 | `ch_signal_06` | Color / red | Axis-lock teaching |
| 7 | `ch_signal_07` | Capstone | Mirror + red + crate |

**Routing:** World Map → Enter → Level Select → `GameServices.set_launch_play({mode:"campaign", chapter_id, level_id})` → `concept_play_slice`.  
**Progress:** `SaveService.record_level_clear` / sequential unlock; Lattice unlocks when Signal is fully cleared. Lattice / Anchor remain stub chapters.

---

## Daily / Endless (iteration 4–5)

| Mode | Seed | Board | Win | Persist |
| --- | --- | --- | --- | --- |
| **Daily** | UTC date via `PuzzleGenerator.generate_daily` | Align occupants | Match goal | Save v5 `daily.completed_utc_date` + `best_moves` + streak; ranked → `LeaderboardService.submit_daily` + local rank on sheet |
| **Endless** | Run seed; next = LCG on clear | Align; difficulty `1 + (wave-1)/2` | Match goal → next wave | `endless.wave_best` / `last_seed`; wave clear + run end → `submit_endless` |
| **Campaign** | Authored layouts | Align or laser objects | Goal match / door channel | Chapter stars + resume |
| **Concept** | Free-play laser demo | PuzzleEngine objects | Door channel | Campaign resume (menu Play) |

**Chrome:** Daily screen + play HUD show **Soft / Hard / target** from live `PuzzleDef` (`par_soft`, `par_hard`, `optimal_moves`). Dial target = hard par. Stars: 3 ≤ hard, 2 ≤ soft, else 1.

**Victory parity:** Align clear and laser door-channel clear both call `_fire_victory` → glass sheet + `puzzle_solve` EffectRecipe + victory music. Mode titles: `DAILY CLEAR` / `WAVE n CLEAR` / campaign title / `LEVEL COMPLETE`.

Launch payload: `GameServices.set_launch_play({mode, seed, difficulty, date?, ranked?, wave?, puzzle?, chapter_id?, level_id?})` → `concept_play_slice` consumes.

Hint in Align modes uses `HintGenerator` (direction → line → full move). Worlds skins are **not** cycled from Hint.

---

## Prioritized backlog

### P0 — shipped
1. Retoken purple/blue/cyan neon; theme + VisualDirector glow tint.
2. Concept Play HUD (LEVEL, dial, Undo/Restart/Hint/Levels).
3. Board glass tiles + purple shift band + arrows.
4. Laser beam layer consuming `PuzzleEvent.LASER_BEAM`.
5. Main menu brand/tagline/CTA language.
6. Victory sheet (3★ + moves/best).
7. Playable `concept_play_slice` wiring BoardSession + PuzzleEngine + feel + HUD.
8. Docs: this file + `VISUAL_IDENTITY.md` realign.

### P1 — shipped (iteration 2–6)
- [x] Richer object art (procedural atlas icons) for mirror / magnet / ghost / time / doors / laser / switch / goal
- [x] Beam draw animation (grow along path) + receiver hit bloom pulse
- [x] Door open/close and switch toggle presentation tied to puzzle events
- [x] Color-block catalog: red movable · blue gravity · green clone · yellow countdown
- [x] Continue / Level Select → `concept_play_slice` (Feel Lab stays footer-only)
- [x] Victory celebration juice (staggered stars + particle burst)
- [x] Shift land connection pulse on band + occupied tiles
- [x] Godot 4.7 shader-safe (no new shaders; canvas Line2D / ImageTexture only)
- [x] **Red axis-lock** — `AxisLockComponent` + `AxisLockFilter` (pre-check + resolve move filter + post-shift swap safety)
- [x] **Cycle-around-fixed red** — column shifts rewrite via puzzle-layer tile writes; row shifts carry red
- [x] **Object icons** — 3× supersample bake → `assets/textures/atlas/objects/*.png`; Align A–F silhouettes; atlas prefers PNG
- [x] **Continue → saved progress** — Save schema v4 `campaign.resume` + `GameServices.launch_resume`
- [x] **EchoSim** — ghost trail + post-K-turn replay of recent board occupant snapshots
- [x] **Worlds carousel** — Neon Grid / Crystal Caves / Nature's Core / Void; applies `WorldSkin` + save
- [x] **Daily / Endless / Achievements** neon glass cards (`NeonGlassCard`)
- [x] **Fonts** — OFL Orbitron Regular/SemiBold/Bold + Rajdhani under `assets/fonts/`
- [x] **Perf** — beam count caps, instant beams + no icon glow on Low, process gating vs `VisualQualityConfig`
- [x] **Real Daily / Endless** — `PuzzleGenerator` + date seed + endless ramp; save v5 completion
- [x] **Desktop 120 feel** — snappier `ShiftFeelConfig`; `PowerPolicy` max_fps 120 + adaptive vsync; physics ticks stay 20
- [x] **Worlds-only skins** — Hint demoted to puzzle tips; Worlds screen is primary skin path
- [x] **Axis-cycle laser sync** — force recompute after cycle; validation tests for red+column + connections
- [x] **Daily live soft/hard/target** — generator metadata on Daily screen + play HUD
- [x] **Endless leaderboard** — `submit_endless` on wave clear + run end; local rank on victory sheet
- [x] **Align ↔ laser victory parity** — shared `_fire_victory` (sheet + `puzzle_solve`)
- [x] **Authored Signal chapter** — 7 levels, sequential unlock, GameServices launch
- [x] **Locale CSV boot** — no Failed loading spam; en/es/fr via LocaleService
- [x] **Honest local LB UI** — plugin hook documented; no fake globals
- [x] **Placeholder app icon** — `assets/icons/app/icon_1024.png`

### P2 — later polish
1. Authored hand-painted PNG atlas (optional) — drop-in documented under `assets/textures/atlas/objects/README.md`.
2. Variable-font Orbitron axes if a VF file is added.
3. Platform plugin for global (non-local) ranks.
4. Authored Lattice / Anchor chapters beyond Signal.

---

## Architecture guardrails (keep)

- `BoardSim` / `BoardSession` stay pure for shift math; axis cycle is puzzle-layer batch writes + history meta.
- Puzzle rules stay in `PuzzleEngine` + components (`countdown`, `clone`, `axis_lock`).
- Axis constraints: `AxisLockFilter` plans cycle-or-reject; feel + engine consume the plan; RulePipe still filters illegal magnet/gravity deltas.
- Presentation: `BoardView`, `ObjectIconAtlas`, `EchoMovesLayer`, `WorldSkin`, `NeonGlassCard`, laser layer, HUD, victory sheet, tokens/theme only.
- No duplicate feel stacks — reuse `BoardFeelController` / `VisualDirector` / glass kit + existing EffectRecipes.
- Align Daily/Endless/campaign Align share `concept_play_slice` presentation; generation stays in `PuzzleGenerator`; authored laser layouts in `CampaignLevelCatalog`.

---

## How to verify this slice

```bat
run_game.bat
```

1. Main menu → **Play** → fresh concept slice; make a few shifts; leave via Menu.
2. Main menu → **Continue** → same board / move count restored (not always demo start).
3. Swipe a **column that contains the red block** → other cells cycle around red (red stays). Swipe that **row** → red rides. Beams/channels refresh after the cycle.
4. Undo after a column cycle → red still fixed; line restored; lasers match.
5. World Map → Enter Signal → level 1 (Swipe) → Align clear; level 2 unlocks. Walk teach arc through Mirror / Switch / Color.
6. Main menu → **Worlds** → pick Crystal / Nature / Void → persists; enter play → skin applied. Hint does **not** change skin.
7. Swipe ~4 turns → EchoSim ghost board frames + band pulse.
8. **Daily** → Soft/Hard/target from generator on card; Play Ranked → HUD shows Soft/Hard/target; clear → streak + local rank on victory sheet.
9. **Endless** → Classic Run → clear → victory sheet + local rank; Continue → next wave; leave → run-end LB submit.
10. Settings → Quality **Low** → beams appear instantly, icon soft-glow off, fewer active beams.
11. Brand on main menu uses Orbitron (`Orbitron-SemiBold.ttf` preferred; Bold/Regular fallback).
12. Desktop: gameplay targets 120 FPS (`PowerPolicy`); physics ticks remain 20.
13. Align clear and laser door clear both show glass victory + `puzzle_solve` juice.
14. Boot log: **no** `Failed loading resource: res://localization/shiftr.csv`. Settings language cycles en/es/fr.
15. Leaderboards → Daily/Endless **local** only; empty until you clear a run (no fake names).

Or F6 `scenes/puzzles/concept_play_slice.tscn`.

Bake icons: `godot --headless -s res://tools/developer/bake_object_icons.gd`  
Puzzle tests: `godot --headless -s res://tests/unit/puzzle/run_puzzle_validation.gd`  
Platform LB: `godot --headless -s res://tests/unit/platform/run_platform_services_validation.gd`  
Mode smoke: `godot --headless -s res://tools/developer/smoke_concept_play_modes.gd`
