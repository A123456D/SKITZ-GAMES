# SHIFTR — Performance

Mobile-first optimization notes for Godot 4.x (60 FPS mandatory, 120 FPS where the display allows). Simulation (`BoardSim` / `BoardSession`) stays deterministic and allocation-light; juice lives in presentation.

Godot was **not assumed on PATH** for this pass — changes are static-audit + production wiring. Verify on device with the checklist below.

---

## Budgets (GDD §21.4 + shipping targets)

| Metric | Target (mid-tier mobile) |
| --- | --- |
| Frame time | ≤ **16.67 ms** (60 FPS); ≤ **8.33 ms** ideal @ 120 |
| Touch → highlight | ≤ 1 frame |
| Commit → tiles moving | ≤ 2 frames |
| Sim CPU / input | < **0.5 ms** |
| Draw calls (play) | ≤ **50** |
| Ambient particles | High **18** / Med **8** / Low **0** |
| Board burst samples | ≤ **4** emitters; amount capped by `board_burst_cap` |
| Audio voices | ≤ **24** (`AudioDirector.MAX_VOICES`); pool **16** mono |
| Trail pool | **24** `Line2D` |
| Tile pool warm | **64** (8×8) |
| Texture soft cap | ~**48 MB** playable + chrome |

Constants live in `scripts/utils/perf_budgets.gd`.

---

## How to toggle quality / battery

| Control | Where |
| --- | --- |
| Quality High / Med / Low | Settings → Quality → `UiSettingsState.quality_tier` → `VisualDirector.set_quality_tier` |
| Reduce motion | Accessibility + feel demo → syncs `VisualQualityConfig` + `ShiftFeelConfig` |
| Bloom | Accessibility / feel demo |
| **Battery saver** | Accessibility (+ feel demo) → `VisualDirector.set_battery_saver` / `PowerPolicy` |
| Perf overlay (dev) | **F3** in editor / debug builds (`PerfOverlay`) |

Battery saver stacks on the active tier: fewer particles, softer bloom, no glass blur / parallax / preprocess, menu idle low-processor mode. **Never** enables low-processor mode during gameplay (latency budget).

---

## 1. Rendering

### Found
- Full-screen bloom + `BackBufferCopy` every quality apply (node thrash).
- Per-tile `StyleBoxFlat` + per-tile `ShaderMaterial` broke canvas batching.
- Y-sort unused; glass blur always sampled noise + multi-tap on Low path risk.
- Mobile renderer already set; physics still defaulted to 60 Hz unused ticks.

### Changed
- `project.godot` — `renderer/rendering_method=mobile`, physics 20 Hz, gravity 0, default clear color.
- `visual_director.gd` — reuse bloom `BackBufferCopy`/`ColorRect`; hide when disabled (no full-screen pass).
- `board_tile_view.gd` — **shared** `StyleBoxFlat`; color via `self_modulate`; **shared** blur material + instance uniforms.
- `board_view.gd` — `y_sort_enabled = false`, `clip_contents = true`.
- Bloom `quality_scale` / sample caps from tier + battery.

### Why
Fewer materials and StyleBoxes → fewer canvas break-batches. Disabling bloom removes a full-screen additive pass (large mobile GPU win). Shared instance uniforms avoid N shader material variants.

### Tradeoffs / tiers
| Tier | Bloom | Glass | Notes |
| --- | --- | --- | --- |
| High | 5 taps, scale 1.0 | 5 taps | Premium unchanged |
| Med | 3 taps, scale 0.75 | 3 taps | Soft bloom |
| Low | Off | Tint only | Static wash |
| Battery | Softens / caps further | Off | On top of tier |

### Verify
Debugger → **Monitors**: Draw Calls, Objects. Feel demo: toggle Bloom / Low / Battery; confirm bloom layer children hidden when off.

---

## 2. Physics

### Found
Puzzle game with no RigidBody usage still paid default **60 physics ticks/sec**.

### Changed
`project.godot`:
```
common/physics_ticks_per_second=20
2d/default_gravity=0.0
```
Documented: do **not** add physics bodies for board play.

### Why
Unused `_physics_process` / broadphase work drops. Presentation uses `_process` + Tweens only.

### Tradeoffs
If a future mode needs physics, raise ticks only for that scene or use a dedicated physics space.

### Verify
Profiler → Physics Process time near zero during play. Confirm swipe/shift still feel snappy (not physics-driven).

---

## 3. Memory

### Found
`BoardView.rebuild` freed/recreated all tiles; string keys `"%d,%d"` allocated on every lookup; particle instantiate without hard pool cap.

### Changed
- `NodePool` for tiles (`board_view.gd`), land/wrap bursts, UI confirm bursts.
- Spatial map uses `Vector2i` keys.
- `SharedAtlas` white/glow textures (disk or runtime ImageTexture).
- Audio already pooled (`AudioDirector`).

### Why
Steady-state memory + fewer allocator spikes on rebuild / juice.

### Tradeoffs
Pool max sizes discard extras via `queue_free` when over cap.

### Verify
Rebuild board repeatedly in feel demo / editor; watch Objects + Memory in Monitors stay flat after warm-up.

---

## 4. Animations

### Found
`flash_land` / UI tweens could stack; hit-stop could leave `Engine.time_scale` stuck on teardown; juice camera / trails processed every frame while idle.

### Changed
- `TweenUtil.replace` / kill helpers.
- `BoardTileView.flash_land` reuses one tween.
- `HitStopClock._exit_tree` restores time scale.
- `JuiceCamera` / `TrailRenderer` `set_process(false)` when settled.

### Why
Less tween spam, no hit-stop leak, idle CPU near zero between shifts.

### Tradeoffs
High tier juice unchanged when active; idle skip only when trauma/trails empty.

### Verify
Spam shifts + undo; no stuck slow-mo after leaving scene. Profiler: `JuiceCamera` / `TrailRenderer` process time drops to 0 when idle.

---

## 5. Particles

### Found
Ambient `preprocess = 2.0` hitch on spawn; UI confirm `queue_free` every press; board bursts weakly pooled; no quality/battery caps wired to feel.

### Changed
- `ambient_dust.tscn` preprocess **0**; runtime sets via `effective_particle_preprocess()`.
- `NodePool` land/wrap/UI bursts; one-shot + `preprocess = 0` on emit.
- Shared glow texture on emitters.
- Caps: `VisualQualityConfig.board_burst_cap` / `effective_*_amount()`.

### Why
Preprocess simulates particles on the main thread at spawn — expensive on mobile. Pooling removes instantiate/free spikes.

### Tradeoffs
Low/Battery: fewer particles (clarity flashes remain). High: same visual density caps as GDD.

### Verify
Toggle tiers; count emitters in Remote scene tree during a land. Confirm Low has no ambient host emission.

---

## 6. Shaders

### Found
Bloom/glass always looped up to 9 taps; motion blur used unique materials; soft glow always evaluated `sin(TIME)`; background beams always branched heavy.

### Changed
- `canvas_bloom.gdshader` — strength early-out; `quality_scale` tap reduction; `mediump`.
- `glass_panel.gdshader` — tint-only path; noise gated.
- `tile_motion_blur.gdshader` — **instance uniforms** + shared material.
- `soft_glow.gdshader` / `dynamic_gradient_bg.gdshader` — early-outs / skip beams & pulse.

### Why
Fewer texture fetches and ALU on Med/Low/Battery; shared materials batch.

### Tradeoffs
High keeps full sample counts. Instance uniforms require Godot 4.x canvas renderer (project is 4.3+).

### Verify
Aesthetic showcase: High vs Low GPU frame time. Force `strength=0` bloom → fragment early-out (no visible haze).

---

## 7. Loading

### Found
`UiRouter` sync-`load`ed every screen at configure; hint sheet sync on open; music stems sync at ready.

### Changed
- `AsyncLoader` (`scripts/utils/async_loader.gd`) — threaded request/poll/await.
- `UiRouter` — sync only **main menu**; warm other screens via `load_threaded_request`; await on navigate race.
- Hint sheet async path.

### Why
Removes multi-scene hitch on boot and first navigation.

### Tradeoffs
First open of a screen before thread finishes may still sync-load once (fallback).

### Verify
Boot main shell; check stdout for no long stalls; navigate Inventory/Map — second visit should be cache-hit.

---

## 8. Garbage collection

### Found
Hot paths built strings for tile map keys; trail fade allocated `Array` every frame; particle emit duplicated arrays; StyleBox per tile.

### Changed
`Vector2i` keys; reused `_release_buf` in trails; capped burst loops without `duplicate()`; shared style/material; typed pools.

### Why
GDScript GC pauses show up as frame spikes on mid Android — fewer temporaries in shift/land paths.

### Tradeoffs
Slightly more careful buffer reuse (clarity comments only where needed).

### Verify
Profiler → Script Memory / GC while spamming shifts for 30s; spikes should be quieter than pre-change.

---

## 9. Object pooling

### Found
Ad-hoc particle arrays; no shared `NodePool` utility; tiles not pooled.

### Changed
| Utility | Path |
| --- | --- |
| `NodePool` | `scripts/utils/node_pool.gd` |
| `RefCountedPool` | `scripts/utils/ref_counted_pool.gd` |
| `TweenUtil` | `scripts/utils/tween_util.gd` |

Wired: board tiles, land/wrap bursts, UI confirm, (audio already).

### Why
Stable frame times under juice pressure.

### Tradeoffs
Must `release()` (parent removed). Over-cap frees nodes.

### Verify
Remote: particle nodes leave board parent after lifetime; pool free count rises.

---

## 10. Texture atlases

### Found
No shared particle/glow atlas; empty `assets/textures/`.

### Changed
- `SharedAtlas` runtime white + soft glow (and loads PNG if present).
- `tools/developer/pack_shared_atlas.gd` bakes `assets/textures/atlas/*.png`.
- README under atlas folder for import workflow.
- Particles assign shared glow texture to cut texture switches.

### Why
Identical textures + shared materials → better batching / lower texture memory.

### Tradeoffs
Procedural tiles remain StyleBox-based (no sprite atlas yet). Future art should import as AtlasTexture / TileSet.

### Verify
After bake, confirm PNGs load; Monitors texture memory flat across bursts.

---

## 11. Battery usage

### Found
Idle menus still full frame rate; music stems kept decoding at −80 dB when OFF; ambient preprocess; continuous camera/trail process.

### Changed
- `PowerPolicy` — `OS.set_low_processor_usage_mode` **only** menu idle, never gameplay.
- Accessibility **Battery saver** flag.
- Adaptive music **stops** stems when state is `OFF` and level ≈ 0.
- Idle process gates; particle/bloom cuts via quality.

### Why
Radio + GPU + audio decode dominate battery on mobile puzzle sessions in menus.

### Tradeoffs
Menu animations may step at ~30 FPS when idle; **gameplay stays full rate**.

### Verify
Main shell idle: CPU % drops. Enter feel demo: low-processor off; input latency unchanged.

---

## 12. Mobile GPU

### Found
Overdraw from bloom + glass screen samples; high ambient preprocess; full bloom on Med.

### Changed
Bloom off/hidden on Low; Med `bloom_resolution_scale=0.75` (fewer taps / wider cheap kernel proxy); glass tint-only; opaque StyleBox tiles (no per-tile additive materials by default); soft glow additive only when used.

### Why
Bandwidth-bound GPUs hate full-screen fetches. Opaque shared panels fill fast.

### Tradeoffs
True half-res bloom RT (SubViewport) not added yet — sample/quality_scale is the cheap proxy. High tier still full.

### Verify
Android GPU counter / RenderDoc: bloom pass absent on Low; Med fewer taps.

---

## 13. CPU spikes

### Found
Editor difficulty analyze ran BFS on main thread; catalog/screen loads sync; quality reapply freed bloom every time.

### Changed
- `EditorDifficultyAnalyzer.analyze_async` → `WorkerThreadPool` + main-thread apply.
- Async screen warm; bloom reuse; process idle gates.

### Why
Authoring and navigation no longer hitch the frame that starts a solve / push.

### Tradeoffs
Async analyze must be `await`ed / callback-driven; sync `analyze()` remains for tests/CI.

### Verify
Level editor: run analyze on large grid — UI stays interactive. Unit tests still call sync `analyze()`.

---

## Shared utilities (quick map)

| File | Role |
| --- | --- |
| `scripts/utils/node_pool.gd` | Node acquire/release |
| `scripts/utils/ref_counted_pool.gd` | RefCounted reuse |
| `scripts/utils/async_loader.gd` | Threaded `ResourceLoader` |
| `scripts/utils/power_policy.gd` | Battery / low-processor policy |
| `scripts/utils/shared_atlas.gd` | White/glow + shared blur mat |
| `scripts/utils/perf_budgets.gd` | Numeric budgets |
| `scripts/utils/tween_util.gd` | Kill/replace tweens |
| `tools/developer/perf_overlay.gd` | F3 FPS overlay |
| `tools/developer/pack_shared_atlas.gd` | Bake atlas PNGs |

---

## Profiling checklist

### Editor / Debugger
1. Run `shift_feel_demo` or `main_shell` (F5/F6).
2. **Debugger → Profiler**: Script, Idle, Physics (expect physics ~0).
3. **Monitors**: FPS, Process, Objects, Draw Calls / Primitive.
4. Toggle **Low** + **Battery saver** — FPS headroom ↑, objects ↓.
5. **F3** overlay: FPS / ms / objects vs 16.7 / 8.3 ms budgets.

### Remote (device)
1. Deploy export template with remote debug.
2. Thermal: 10 min High juice spam → then Battery saver; watch FPS floor.
3. Confirm no bloom ColorRect when Low.
4. Audio: music OFF → no stem `playing`.

### Headless (if Godot installed)
```powershell
godot --headless --path . -s res://tools/developer/pack_shared_atlas.gd
godot --headless --path . -s res://tests/unit/puzzle_gen/run_puzzle_gen_validation.gd
```

### Determinism
BoardSim / session must remain event-driven — **do not** read `Engine.time_scale` or `delta` inside sim. Hit-stop is presentation-only (`HitStopClock`).

---

## Remaining risks (no Godot runtime this pass)

- Instance-uniform blur needs a quick on-device smoke test (Godot 4.3 mobile renderer).
- `WorkerThreadPool` analyze: confirm editor controller is switched to `analyze_async` where UI binds (API ready; callers may still use sync).
- Half-res bloom via SubViewport still optional follow-up for Med.
- Atlas PNGs not baked until headless pack script runs; runtime ImageTexture fallback is active.
