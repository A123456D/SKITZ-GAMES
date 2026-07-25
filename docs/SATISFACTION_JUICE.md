# SHIFTR — Satisfaction / Juice System

Production interaction juice: every player and system beat should feel *expensive*, readable, and intentional. Simulation stays pure. Presentation owns timing, camera, deform, glow, particles, audio layers, and hit-stop.

**Companion docs:** `MOVEMENT_FEEL.md` (shift chaining), `VISUAL_IDENTITY.md` (tiers / glow), `BOARD_SYSTEM.md` (sim/view split), GDD §16–17.

---

## 1. Philosophy

| Pillar | Meaning |
| --- | --- |
| **Dopamine with discipline** | Confirm intent → reward settle → escalate only when the board earned it (combo, solve). |
| **Readability overrides juice** | If VFX hides tile identity >50ms, it is a bug (GDD §17.4). |
| **Never clutter** | Sparse particles, one motion focus, premium restraint — not confetti spam. |
| **Composition over inheritance** | Interactions fire **EffectRecipe** data; systems are thin players. |
| **Sim purity** | `BoardSim` / `BoardSession` never see juice. Hit-stop is **view-only**. |

### Why recipes

Adding a new interaction should mean: author a `.tres` recipe, call `SatisfactionDirector.play(id, ctx)`. No new orchestration branches for “also shake a little.”

Intensity tiers keep the vocabulary shared between board and UI:

| Tier | Role | Typical duration budget |
| --- | --- | --- |
| **Micro** | Confirm without stealing focus | ≤40ms |
| **Medium** | Default shift / UI press weight | 40–120ms |
| **Heavy** | Solve, cascade peak, achievement | 120–400ms (still staged) |

---

## 2. Technique bible

For each technique: definition, tuning, and **when not to use it**.

### 2.1 Hit stop

**What:** Brief freeze of the *presentation clock* so the eye registers impact before motion resumes.

**How (SHIFTR):** `HitStopClock` drops `Engine.time_scale` near zero for a **real-time** window (`SceneTreeTimer` with `ignore_time_scale = true`), then restores the previous scale. Tweens, particles, and camera integrators hitch; **BoardSim does not**. Sim is event-driven and never samples `Engine.time_scale` or `_process` delta for authoritative state.

**Tuning**

| Tier | Real-time freeze | time_scale floor |
| --- | --- | --- |
| Micro | 12–20ms | 0.08–0.12 |
| Medium | 24–40ms | 0.05–0.08 |
| Heavy | 45–70ms | 0.03–0.05 |

Cap concurrent hit-stops (stacking extends slightly, never multiplies forever).

**Do not use when**

- Reduce-motion is on (hard disable).
- Deep command queue pressure (keep chains fluid — micro only or skip).
- Continuous UI scrubbing / slider drag.
- Fail spam (invalid input uses audio thud, not time freeze).

### 2.2 Screen shake

**What:** Trauma-based offset on `JuiceCamera` (directional bias + light perpendicular jitter).

**Tuning:** `land_trauma` ~0.18–0.28; wrap add ~0.08–0.14; max offset ≤8px at 1× intensity. Decay is delta-timed.

**Do not use when** reduce-motion / `disable_shake`; Low quality may keep micro trauma only; never on every UI hover.

### 2.3 Tiny camera zoom

**What:** Sub-2% zoom pulse (in then settle) on land / solve — “punch into” the board without losing framing.

**Tuning:** Micro 0.6–1.0%; Medium 1.2–1.8%; Heavy (solve) 2.0–2.5% peak; settle 80–160ms spring-ish return.

**Do not use when** reduce-motion; chain depth ≥2 (zoom every settle fights readability); screen transitions already scaling the veil.

### 2.4 Particles

**What:** Pooled GPU bursts at land / wrap / UI confirm / solve.

**Tuning:** Land sample ≤4 cells × ~14 particles (High); wrap fewer cooler sparks; Low tier cuts board bursts, keeps tiny UI confirm.

**Do not use when** reduce-motion (board); Low quality board path; never per-frame continuous spray behind readable tiles.

### 2.5 Glow

**What:** Soft additive pulse (`soft_glow` / tile modulate flash / bloom kiss) for confirmation.

**Tuning:** Press glow 80–120ms; land flash ≤120ms; solve board halo ≤400ms with bloom tier gate.

**Do not use when** soft_glow disabled (Low); overlapping full-board glows that wash ink contrast.

### 2.6 Sound layering

**What:** Beds + transients on separate players/buses so layers can overlap without mono chopping.

| Layer | Bus | Role |
| --- | --- | --- |
| Whoosh bed | `SFX_Game` | Travel body |
| Tick transient | `SFX_Game` | Quantized settle click |
| Land body | `SFX_Game` | Soft thud |
| Sub / bass (optional) | `SFX_Juice` | Weight on heavy land / solve |
| Combo / fanfare | `SFX_Juice` | Escalation / win |
| UI click | `SFX_UI` | Chrome confirmation |
| Error | `SFX_UI` | Muted rubber (rare) |

**Do not use when** audio muted; stacking all layers on micro UI (use tick or UI only).

### 2.7 Animation overshoot

**What:** Travel / settle eases past the target (elastic / back / spring) then returns.

**Tuning:** Position overshoot ≤6–8px or ≤8% scale; travel stays in `ShiftFeelConfig` easing.

**Do not use when** reduce-motion (swap to cubic); interrupt-blend mid-flight (snap clean).

### 2.8 Object squash

**What:** Scale compress along motion axis on settle (or press on UI).

**Tuning:** Shift settle ~`(1.04, 0.96)` for 20–25ms then spring back; UI press `0.96` → `1.0` with OutBack (~80ms).

**Do not use when** reduce-motion; tiles already mid-interrupt snap.

### 2.9 Anticipation

**What:** Tiny opposite wind-up before commit (camera nudge opposite / tile scale stretch against swipe / UI dip).

**Tuning:** 20–40ms; scale ~`(0.97, 1.03)` axis-aware; camera pre-nudge opposite then impulse with swipe.

**Do not use when** queue already busy (skip — keep gapless); reduce-motion.

### 2.10 Follow-through

**What:** After primary settle, a softer secondary ease (scale / glow fade / trail die) that finishes the gesture.

**Tuning:** 40–90ms after land; weaker than primary squash.

**Do not use when** next command already committed (hand off; don’t block queue).

### 2.11 Secondary motion

**What:** Child / label / streak lags the parent slightly (inertia) so the object feels massy.

**Tuning:** Label offset lag ≤2–3px for ~60ms; trail lifetime already covers motion secondary.

**Do not use when** Low tier; reduce-motion; dense cascade frames where lag reads as desync.

---

## 3. Layers

| Layer | Owner | Responsibilities |
| --- | --- | --- |
| **Camera** | `JuiceCamera` | Trauma shake, directional nudge, zoom pulse |
| **Tile** | `ShiftAnimator` + `MotionDeform` + `BoardTileView` | Travel, wrap ghosts, squash, anticipation, secondary, glow flash |
| **UI** | `UiFeel` + glass / icon controls | Press squash, glow, confirm particles |
| **Audio** | `FeelAudio` → `Audio` (AudioDirector) | Layered whoosh / tick / land / sub / combo / UI / error / solve + adaptive music |
| **Time** | `HitStopClock` | View-only presentation hitch |
| **Haptics** | `FeelHaptics` | Paired pulses (not a visual layer, same recipes) |

Orchestrator: **`SatisfactionDirector`** plays `EffectRecipe` resources from a **`SatisfactionCatalog`**. `BoardFeelController` and `UiFeel` share intensity enums and recipe ids — one vocabulary.

---

## 4. Interaction → effects matrix

Intensity: **μ** micro · **M** medium · **H** heavy.  
Layers: **C** camera · **T** tile · **U** UI · **A** audio · **⏱** time.

| Interaction | Tier | Hit stop | Shake | Zoom | Particles | Glow | Audio layers | Overshoot | Squash | Anticipation | Follow-through | Secondary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Swipe commit** | M | — | — | — | — | aim row/col soft | whoosh bed | — | — | yes (C+T) | — | — | Fires as travel starts; queue-busy skips anticipation |
| **Shift travel** | M | — | micro nudge | — | trails | streak | whoosh continues | travel ease | — | — | — | trail / label lag | Owned by `ShiftAnimator` |
| **Wrap edge** | M | μ optional | +wrap trauma | — | wrap sparks | ghost fade | tick↑ + land | wrap path | land squash | — | trail end | ghost secondary | Extra trauma on wrap cells |
| **Land / settle** | M | μ–M | land trauma | μ–M | land burst | land flash | tick + land (+sub if M+) | settle spring | yes | — | yes | label settle | Primary “expensive” beat |
| **Chain queue** | μ | — / skip | softer | skip | fewer | flash only | whoosh+tick compressed | less elastic | lighter squash | skip | cut short | skip | Duration from `effective_duration` |
| **Undo / redo** | μ | — | — | — | — | brief dim | UI + soft whoosh | cubic snap | — | — | — | — | Rebuild-friendly; no hit-stop |
| **Invalid input** | μ | — | — | — | — | warn tint flash | error thud | — | tiny reject squash | — | — | — | Prefer prevent; juice is apology not punishment |
| **Button press** | μ–M | — | — | — | optional confirm | press glow | UI click | OutBack | press squash | slight dip | scale settle | icon shimmer opt | `UiFeel` / glass |
| **Screen transition** | M | — | — | — | — | veil glow | soft whoosh / bed | wipe/shift ease | — | cover anticipation | uncover follow | parallax wash | No board hit-stop |
| **Puzzle solve** | H | M–H | M trauma | H pulse | confirm + board dust | bloom kiss + halo | land + sub + solve fanfare | board pulse | board breathe | — | long glow fade | ambient lift | Staging: board first, UI second |
| **Combo / cascade clear** | M→H | μ→M by depth | scales | μ at peaks | clear bursts | channel glow | combo arpeggio layers | OutBack clear | explode squash | — | debris follow | streak kids | Escalates with combo depth |
| **Door open** | M | μ | μ | — | dust line | seam glow | whoosh soft + tick | door ease | — | panel wind-up | latch follow | handle secondary | Puzzle presentation hook |
| **Laser fire** | M | — | — | — | beam motes (High) | beam glow | tick high + bed | — | — | emitter pulse | beam fade | — | Keep path readable |
| **Switch toggle** | μ | — | — | — | — | accent flash | UI tick | — | pad squash | — | — | — | Channel bus visual only |
| **Teleport** | M | μ | μ | μ | spark in/out | flash | whoosh + tick | — | pop scale | — | trail dissolve | ghost lag | Never hide destination >50ms |
| **Ice slide** | M | — | μ continuous | — | frost trail | cool tint | longer whoosh bed | low friction ease | light land | — | slide coast | — | Softer settle than rubber land |
| **Enemy move** | μ–M | — | — | — | — | threat tint | muted tick | cubic | — | — | — | — | Player juice > enemy juice |
| **Achievement / reward** | H | M | M | M | burst | strong glow | fanfare + sub | celebratory | — | — | long fade | confetti sparingly | One focus; no board obscuration |
| **Error / fail** | M | — | μ warn | — | — | warn glow | error + soft land | — | reject squash | — | — | — | No heavy hit-stop; respect player |

### Phase ownership (shift micro-loop)

```
Aim highlight (glow μ)
  → Swipe commit recipe (anticipation C+T, whoosh)
  → Sim apply (instant, no juice)
  → Shift travel (animator + trails)
  → [wrap extras if any]
  → Land / settle recipe (hit-stop μ, shake, zoom, squash, particles, tick+land)
  → Follow-through (non-blocking)
  → If queue: chain recipe (compressed) else idle
```

---

## 5. Frame independence

- All recipe durations are **seconds** (stored as ms in data, converted at play).
- Camera trauma / nudge / zoom springs integrate with **`delta`**.
- Hit-stop duration is **real time** (ignore_time_scale timer), not scaled frames.
- Never encode “N frames at 60”; 120 Hz only refines steps.

---

## 6. Accessibility

| Setting | Effect |
| --- | --- |
| `ShiftFeelConfig.reduce_motion` | Disables hit-stop, shake, zoom pulse, trails, board particles, anticipation/overshoot/squash exaggeration; keeps land flash + audio confirmation |
| `disable_shake` | Trauma → 0 |
| `disable_hit_stop` | HitStopClock no-ops |
| `disable_zoom_pulse` | Zoom pulse no-ops |
| `VisualQualityConfig` Low | Soft glow off, fewer particles; recipes respect `wants_*` gates |
| Haptics slider | Scales / mutes `FeelHaptics` |

`VisualDirector.set_reduce_motion()` keeps feel + quality in sync.

---

## 7. Mobile performance

- Particle **pools**; sample few land cells.
- One shared catalog / feel config — no per-swipe Resource alloc.
- Hit-stop rare and short; never during deep chains.
- Glow uses existing soft_glow / modulate — no extra full-screen passes beyond quality-tier bloom.
- Low tier: skip board particles, zoom, secondary motion; keep audio + flash.

---

## 8. Composition with ShiftFeelConfig & VisualDirector

```
ShiftFeelConfig          → timing, trauma baselines, a11y, audio master
VisualQualityConfig      → bloom / soft_glow / particle caps
EffectRecipe             → per-interaction enable + intensity multipliers
SatisfactionDirector     → gates recipe against feel + quality, fans out to layers
BoardFeelController      → shift queue; calls director at commit / land / reject / combo
UiFeel                   → button / transition / solve hooks via same director
```

Recipe values are **multipliers or absolute overrides** on top of feel defaults (e.g. `trauma` adds to camera; `zoom_pulse` is absolute peak). Quality tier can zero particle/glow channels without editing every recipe.

---

## 9. Implementation map

| Piece | Path |
| --- | --- |
| Design (this) | `docs/SATISFACTION_JUICE.md` |
| `EffectRecipe` | `resources/configs/feel/effect_recipe.gd` |
| `SatisfactionCatalog` | `resources/configs/feel/satisfaction_catalog.gd` |
| Default catalog | `resources/configs/feel/default_satisfaction_catalog.tres` |
| Recipe assets | `resources/configs/feel/recipes/*.tres` |
| `SatisfactionDirector` | `scripts/presentation/feel/satisfaction_director.gd` |
| `HitStopClock` | `scripts/presentation/feel/hit_stop_clock.gd` |
| `MotionDeform` | `scripts/presentation/feel/motion_deform.gd` |
| `UiFeel` | `scripts/presentation/feel/ui_feel.gd` |
| `GlowPulse` | `scripts/presentation/feel/glow_pulse.gd` |
| Camera zoom | `scripts/presentation/feel/juice_camera.gd` |
| Audio layers | `scripts/presentation/feel/feel_audio.gd` |
| Orchestration | `scripts/presentation/feel/board_feel_controller.gd` |

### Feel it in-editor

1. Open `res://scenes/puzzles/shift_feel_demo.tscn` → F6 — swipe for commit/travel/land/wrap/chain; **Solve juice** button for fanfare; UI buttons for press recipe.
2. Open `res://scenes/ui/aesthetic_showcase.tscn` — Confirm CTA uses `UiFeel` + recipe.
3. `res://scenes/ui/main_shell.tscn` — Play / Aesthetic CTAs fire button-press satisfaction before transition.

---

## 10. Why this shape

- **Recipes as data** match GDD §17.3 (`JuiceEvent` resources) and keep modes expandable.
- **Central director** prevents board vs UI drift (“different shake math for buttons”).
- **Hit-stop via time_scale + ignore_time_scale timer** is the industry-standard juice hitch without putting `Time` into `BoardSim`.
- **Chain compression** protects the “every swipe expensive / chaining gapless” bar from stacking heavy recipes into mush.
