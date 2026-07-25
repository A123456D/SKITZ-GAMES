# Puzzle Engine

Compositional, data-driven puzzle rules for SHIFTR. Board geometry stays in `BoardSim` / `BoardSession`; puzzle objects are bags of **components** resolved by a fixed **RulePipe** after each command (and on discrete ticks).

## Why composition

| Approach | Cost of “Heavy Door” |
| --- | --- |
| `HeavyDoor extends Door extends Wall` | New class, brittle overrides, MP/sim forks |
| **Component bag + Resource def** | Duplicate `door.tres`, change `channel` / tags — **no new GDScript** |

`PuzzleObjectDef` lists `PuzzleComponentSpec` entries (`component_id` + `params`). `PuzzleRegistry` maps ids → scripts. Systems never `match` on object type — they query `objects_with(&"door")`, etc.

## Layout

```text
scripts/systems/puzzle/
  puzzle_engine.gd          # BoardSession facade + resolve / tick
  puzzle_world.gd           # Spatial index (occupant + floor)
  rule_pipe.gd              # Fixed system order
  puzzle_component.gd       # Base hooks
  puzzle_registry.gd
  puzzle_channel_bus.gd     # Soft signals (no hard refs)
  puzzle_event.gd
  puzzle_catalog.gd         # Stock defs (mirrors .tres)
  components/               # One concern each
  systems/                  # Deterministic passes
resources/configs/puzzle/   # PuzzleObjectDef, PuzzleComponentSpec
resources/puzzles/objects/  # .tres per object type
docs/PUZZLE_ENGINE.md       # This file
tests/unit/puzzle/          # Headless validation
```

## Board integration

Tiles store puzzle blobs without subclassing `TileData`:

| Payload key | Role |
| --- | --- |
| `pz` | Occupant puzzle object (`def`, `uid`, `state`) |
| `pz_floor` | Floor layer: ice, pressure plate, fire, gravity field, teleporter pad |

`occupant_id` mirrors the occupant def id for board readability. Shifts move whole `TileData` blobs (payload included); `PuzzleWorld.rebuild_from_board` rebinds components to new cells.

```text
BoardCommand
  → BoardSession.apply          # pure BoardSim (unchanged)
  → PuzzleEngine.resolve_after  # RulePipe cascade
  → puzzle_events signal        # presentation binds later
```

Preferred API:

```gdscript
var session := BoardSession.new()
session.setup_from_config(cfg)

var engine := PuzzleEngine.new()
engine.bind_session(session)
engine.setup_catalog(PuzzleCatalog.build_all())
# or load .tres defs and engine.register_def(def)

engine.place(Vector2i(1, 1), &"door")
engine.place(Vector2i(0, 1), &"switch")
engine.bootstrap_from_board()

engine.shift_row(1, BoardEnums.Direction.POSITIVE, 1)
# or: engine.resolve_after(session.apply(cmd))

engine.tick(100)  # enemies / fire / time — seeded dt_ms, not Node._process
```

`BoardSim` stays pure (no puzzle imports). Undo restores tile payloads; derived channels/lasers recompute on the next resolve.

## System order (deterministic)

1. **Channels** — clear ephemeral strength; restore switch latches; evaluate pressure plates  
2. **Lasers** — emit beams (cap `LASER_PATH_CAP`), mirrors redirect, receivers arm channels  
3. **Doors** — open/close from final channel state  
4. **Magnets** — attract/repel tagged movables along row/col  
5. **Gravity** — fall one cell along gravity dir  
6. **Ice** — continue slide momentum while on ice  
7. **Fire** — damage burnables (tick-gated)  
8. **Teleporters** — move occupant from pad A → linked pad B  
9. **Time** — chronolock / slow markers; rewind pocket on pulse  
10. **Actors** — patrol step (ticks only)  
11. **Apply mutations** — destroys then moves; flush state to tiles  

Ice/gravity/magnet/teleport set `mutated`; `PuzzleEngine` re-runs recompute until stable or `RESOLVE_PASS_CAP`.

## How to add an object (minimal)

1. **If behavior already exists** (e.g. Heavy Door):  
   - Duplicate `resources/puzzles/objects/door.tres` → `heavy_door.tres`  
   - Change `id`, `display_name`, component `params` (channel, tags)  
   - Register in catalog / level load — **done**

2. **If you need new behavior**:  
   - Add `scripts/systems/puzzle/components/my_component.gd` extending `PuzzleComponent`  
   - `PuzzleRegistry.register(&"my_component", MyComponent)`  
   - Optionally add a focused system pass in `RulePipe`  
   - Author a `PuzzleObjectDef` Resource listing the component + params  

Do **not** create `Wall extends Door` hierarchies.

## Time model

| Mode | Meaning |
| --- | --- |
| `REWIND_POCKET` | Ring buffer of local cell snapshots; `pulse_rewind()` restores |
| `SLOW` | Actors in radius only advance every `slow_factor` ticks |
| `CHRONOLOCK` | Actors in radius skip patrol while field active |

All advance via `PuzzleEngine.tick(dt_ms)` — frame-independent, multiplayer-safe if peers share the same tick commands.

## Events (presentation)

`PuzzleEvent.Kind`: `CHANNEL_CHANGED`, `DOOR_OPENED` / `DOOR_CLOSED`, `SWITCH_TOGGLED`, `PRESSURE_CHANGED`, `LASER_BEAM`, `LASER_RECEIVER_HIT` / `CLEAR`, `MAGNET_PULLED`, `TELEPORT`, `GRAVITY_FALL`, `ICE_SLIDE`, `BURN`, `OBJECT_DESTROYED`, `TIME_REWIND`, `TIME_LOCK`, `ACTOR_STEPPED`, `GHOST_PHASE`, `BLOCKING_CHANGED`.

Bind `engine.puzzle_events` the same way views bind `session.events_emitted` — no timing in sim.

## Interaction matrix (short)

| Pair | Result |
| --- | --- |
| Switch / plate → Door | Channel strength/latch opens door (blocking off) |
| Laser → Mirror `/` `\` | Beam redirects per orientation; continues until cap/block |
| Laser → Receiver | Arms channel (optional color filter); may open doors |
| Laser → Wall / closed door | Beam stops |
| Crate on Pressure plate | Plate active while presser occupies floor cell |
| Crate on Ice + slide_dir | Keeps sliding until blocked or off ice |
| Ice + Gravity | Gravity sets slide_dir; ice continues that dir |
| Magnet ↔ tagged movable | Pull/push one cell along clear row/col |
| Teleporter pair | Occupant on pad A moves to pad B (cooldown) |
| Ghost + channel | Phased ⇒ does not block movement/lasers |
| Fire + Burnable | HP decreases; destroy at 0 |
| Chronolock + Enemy | Enemy skips steps inside radius |
| Board shift | All payloads move with tiles; lasers/doors recompute after |

## Tests

```bash
godot --headless -s res://tests/unit/puzzle/run_puzzle_validation.gd
```

Covers: door+switch, pressure plate, laser+mirror path, teleporter, ice slide, enemy tick, HeavyDoor-as-data, determinism.

## Demo

`res://scenes/puzzles/puzzle_engine_demo.tscn` — tiny laser/door/switch sandbox (F6).
