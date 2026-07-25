# Movement Feel System

Production juice for SHIFTR shifts: elastic motion, trauma shake, micro camera nudge, trails, toggleable motion blur, pooled particles, layered SFX, haptics, and gapless input chaining. **Simulation stays pure** — all timing lives in presentation.

## Why this shape

| Concern | Owner |
| --- | --- |
| Wrap math / invertibility | `BoardSim` / `BoardState` (no Time, no juice) |
| Apply + history + events | `BoardSession` |
| Event fan-out | `BoardViewBridge` |
| Queue, animate, juice | `BoardFeelController` + feel components |
| Tunables | `ShiftFeelConfig` resource |

Sim applies on commit (when a buffered command starts playing). The view animates `TileMove` lists using **`source_index`** identity so lookups stay correct after the grid has already mutated.

## Open the demo

1. Open `res://scenes/puzzles/shift_feel_demo.tscn` in Godot 4.3+.
2. Run the scene (F6) — or set it as main temporarily.
3. Swipe the board, or use the input map below.

Optional: set `run/main_scene` in `project.godot` to that path for boot-into-feel-lab.

## Input map

| Device | Action |
| --- | --- |
| **Touch / mouse** | Tap cell → select · Swipe horizontal → shift row · Swipe vertical → shift column · Distance quantizes steps |
| **Keyboard** | WASD / arrows → move selection · **Q/E** → shift row −/+ · **R/F** → shift col −/+ · **Z** undo · **Tab** cycle row/col/both focus |
| **Gamepad** | D-pad → selection · Shoulders → row vs col focus · A/B → shift row ± · Y → shift col − · X → undo |

Project also binds `ui_*` arrows as row/col shift shortcuts for quick keyboard play.

## Chain / buffer policy

```
intent → enqueue (cap = max_command_queue)
       → if idle: apply(session) + ShiftAnimator.play(duration)
       → if busy: stay buffered
       → on animation_finished: if queue non-empty → commit next (shorter duration)
```

**Gapless chains:** the next tween starts on the same frame the previous finishes — no empty idle between shifts.

**Dynamic duration:** `effective_duration(queue_depth) = max(min_shift_duration, shift_duration * pressure^depth)` so skilled spam stays snappy without deleting juice.

**Handoff window:** near tween end, `handoff_ready` fires. Default policy ignores it (finish-current). With `allow_interrupt_blend = true`, handoff **snaps** current visuals to destinations and starts the next command immediately (interrupt-blend).

**Interrupt-blend vs finish-current**

| Mode | Behavior |
| --- | --- |
| Finish-current (default) | Buffer while busy; play next after settle. Safest readability. |
| Interrupt-blend | Kill active tweens, rematerialize indices, commit next now. Higher throughput, slightly less settle punch. |

Drop policy when over cap: oldest buffered command is discarded so the freshest intent always wins.

## Frame independence

- Travel / settle use **Tween durations in seconds** (never “N frames at 60”).
- Trauma decay and camera nudge spring integrate with **`delta`**.
- Trail lifetimes tick with **`delta`**.
- No gameplay motion constants assume 60 FPS; 120 Hz only makes steps finer.

## Component map

| Script | Role |
| --- | --- |
| `resources/configs/feel/shift_feel_config.gd` | All knobs + accessibility |
| `resources/configs/feel/effect_recipe.gd` | Per-interaction juice recipe (data) |
| `resources/configs/feel/satisfaction_catalog.gd` | Recipe lookup + builtins |
| `scripts/presentation/feel/board_feel_controller.gd` | Queue + apply + juice orchestration |
| `scripts/presentation/feel/satisfaction_director.gd` | Plays recipes across camera/tile/UI/audio/time |
| `scripts/presentation/feel/hit_stop_clock.gd` | View-only presentation hitch |
| `scripts/presentation/feel/motion_deform.gd` | Squash / anticipation / secondary helpers |
| `scripts/presentation/feel/ui_feel.gd` | UI recipe API (shared vocabulary) |
| `scripts/presentation/feel/shift_animator.gd` | Elastic/spring travel, wrap ghosts |
| `scripts/presentation/feel/juice_camera.gd` | Trauma shake + nudge + zoom pulse |
| `scripts/presentation/feel/trail_renderer.gd` | Pooled `Line2D` glow trails |
| `scripts/presentation/feel/feel_audio.gd` | Whoosh / tick / land → AudioDirector |
| `scripts/managers/audio/audio_director.gd` | Autoload `Audio` facade |
| `scripts/presentation/feel/procedural_sfx.gd` | Runtime WAV fallback generator |
| `scripts/presentation/feel/feel_haptics.gd` | `Input.vibrate_handheld` hook |
| `scripts/presentation/feel/board_input_controller.gd` | Unified intents |
| `scripts/presentation/board/board_view.gd` | Tile grid + `source_index` map |
| `assets/shaders/source/tile_motion_blur.gdshader` | Streak / sample blur |
| `scenes/effects/land_burst.tscn` / `wrap_spark.tscn` | Pooled particle scenes |

## Tuning knobs (`ShiftFeelConfig`)

Start from `resources/configs/feel/default_shift_feel.tres`.

- **Timing:** `shift_duration`, `min_shift_duration`, `queue_pressure_factor`, `handoff_window`, `max_command_queue`
- **Easing:** `travel_trans` (ELASTIC / SPRING / BACK / …), `travel_ease`, `settle_duration`
- **Camera:** `land_trauma`, `wrap_trauma`, `trauma_decay`, `nudge_pixels`, `shake_intensity`
- **FX:** `trails_enabled`, `motion_blur_enabled` / `disable_motion_blur`, particle amounts
- **A11y:** `reduce_motion` (cuts overshoot/shake/blur/trails; keeps land flash), shake / blur disables
- **Input:** `swipe_threshold_px`, `swipe_axis_bias`, `allow_interrupt_blend`

## Audio

Full system: **`docs/AUDIO_SYSTEM.md`**.

Buses: `Master` → `Music` (Ambient / Bed / Tension / Stinger) → `SFX` (Movement / Puzzle / UI / Juice / Particles / Game) → `Ambience` / `Voice` / `Utility`  
Layout: `assets/audio/default_bus_layout.tres` (referenced from `project.godot`).

Facade: Autoload **`Audio`** (`AudioDirector`). `FeelAudio` routes all feel SFX through it (combo pitch, spatial pan, music states).

Shipped placeholders (regenerate anytime):

```powershell
powershell -ExecutionPolicy Bypass -File tools/developer/generate_audio_assets.ps1
```

**Swap assets:** replace WAV/OGG under `assets/audio/` or assign streams on `AudioEventDef` / `AdaptiveMusicPlayer`. Missing files fall back to `ProceduralSfx` / `ProceduralMusic`.

## Accessibility

Mirrors GDD §15: reduce-motion, disable blur, shake intensity / disable, haptic intensity. Wire these toggles to your settings menu by mutating the active `ShiftFeelConfig` (or duplicating a preset).

**Satisfaction layer:** see `docs/SATISFACTION_JUICE.md` for hit-stop, zoom pulse, effect recipes, and the full interaction→effects matrix. `SatisfactionDirector` + `EffectRecipe` resources compose on top of this shift stack.

## Performance notes

- Particle emitters are **pooled**; bursts sample a few land cells, not every tile.
- Trails use a fixed `Line2D` pool (`POOL_SIZE = 24`).
- Motion blur is toggleable; when amount ≈ 0 the shader early-outs.
- Prefer one `ShiftFeelConfig` shared by the play scene — no per-frame Resource alloc.
