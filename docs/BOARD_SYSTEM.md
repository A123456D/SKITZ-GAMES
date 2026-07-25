# Board System

## Why this shape

SHIFTR’s fantasy verb is a **circular row/column shift** on a wrapping grid (GDD §5). The board system exists to keep that verb:

1. **Correct** — wrap math and invertibility are unit-tested.
2. **Deterministic** — same initial state + same `BoardCommand` stream ⇒ same `BoardState` on every peer / replay / solver.
3. **Cheap at scale** — thousands of moves without per-move full-board deep copies.
4. **Extensible** — occupants, modifiers, connections, and tile payload are data-driven; modes compose behavior instead of subclassing `BoardState`.
5. **Presentation-safe** — animation timing never lives in the sim (GDD §21 sim/view split).

## Layers

| Layer | Home | Role |
| --- | --- | --- |
| Pure sim | `scripts/systems/board/` | `BoardState`, `BoardCommand`, `BoardSim`, `MoveHistory`, serialization |
| Session facade | `BoardSession` | Undo/redo, save/load, command ids, event fan-out |
| Presentation | `scripts/presentation/board/BoardViewBridge` | Maps `SimEvent` → `animate_moves` / rebuild signals |
| Content defs | `resources/configs/board/` | `BoardConfig`, `TileOccupantDef`, `TileModifierDef` |
| RNG boundary | `scripts/utils/seeded_rng.gd` | Only for future cascade/spawn; **not** used by shift/rotate |

```text
Input / Network
    → BoardCommand (serializable)
        → BoardSession.apply
            → BoardSim (mutates BoardState)
            → MoveHistory.record (compact inverse / delta)
            → SimEvent[] → BoardViewBridge → tweens / juice
```

## Tile model

Every cell is a `TileData` with:

- **Coordinates** (`x`, `y`) — always kept in sync with grid position
- **Occupant** (`occupant_id` → optional `TileOccupantDef` catalog)
- **State** (bitfield `BoardEnums.TileStateFlags`: locked, frozen, correct, …)
- **Modifiers** (`Array[StringName]` → `TileModifierDef`)
- **Connections** (`Array[TileConnection]` with `kind` + `meta`)
- **Payload** (`Dictionary`) for mode-specific JSON-safe extras

Core shift/rotate moves whole `TileData` blobs and remaps connection endpoints that travel with the shifted row/col (or rotate with the board). Mode systems interpret modifier/connection *kinds*; the core never grows a switch on every future mechanic.

## Commands & multiplayer

`BoardCommand` types today: `SHIFT_ROW`, `SHIFT_COLUMN`, `ROTATE`, `SET_TILE`.

- `to_dict()` / `from_dict()` for save and network.
- Optional `command_id` for ordering; optional `rng_seed` for future RNG ops.
- **Forbidden in `BoardSim.apply`:** `Time.get_ticks_*`, `randf` / unseeded random, local-only mutation of authoritative state.

Peers: serialize commands, apply in order via `BoardSession.apply_network_command`. Hash `BoardState.to_dict()` (or a future compact digest) for desync checks.

## Undo / redo memory strategy

| Mechanism | Complexity | Purpose |
| --- | --- | --- |
| Ring buffer of `HistoryEntry` | O(1) record, O(C) memory | Store forward commands (and SET_TILE previous tile), capacity C (default 8192) |
| Inverse ops for shift/rotate | O(n) apply, n = row/col length | Undo without snapshots |
| Periodic checkpoints | Every `checkpoint_interval` (default 256) | Compact `BoardState` dumps in a small ring for rebuild / future non-invertible ops |
| No per-move board clone | — | Avoids O(W×H×moves) memory melt |

Rough bound: ~100 B/entry × 8k ≈ **&lt; 1 MB** for history alone on mobile; checkpoints add a few full boards at most (`checkpoint_capacity` 64).

## Save / load

`BoardSerializer` envelope:

```json
{
  "format": "shiftr_board",
  "schema_version": 1,
  "state": { "width", "height", "cells": [ TileData, ... ] },
  "history": { ... },
  "meta": { }
}
```

API: `BoardSession.save_dict` / `load_dict`, `save_json` / `load_json`, `save_to_file` / `load_from_file`.

## Animation hooks

`SimEvent` carries `moves: Array[TileMove]` with `from_*`, `to_*`, `wrapped`, `occupant_id`, `source_index`.

`BoardViewBridge` signals:

- `animate_moves(moves, context)` — play slide/rotate tweens
- `board_needs_rebuild(state)` — load / set-tile / hard refresh
- `command_rejected(reason, command)` — soft UI feedback

Production juice (elastic travel, shake, trails, blur, SFX, input buffering) is composed by `BoardFeelController` — see **`docs/MOVEMENT_FEEL.md`**. Sim never owns timing.
## Public API (typical)

```gdscript
var session := BoardSession.new()
var cfg := BoardConfig.new()
cfg.width = 6
cfg.height = 6
session.setup_from_config(cfg)

session.shift_row(2, BoardEnums.Direction.POSITIVE, 1)
session.shift_column(1, BoardEnums.Direction.NEGATIVE, 1)
session.rotate_board(1)
session.undo()
session.redo()

var json := session.save_json()
session.load_json(json)

var bridge := BoardViewBridge.new()
add_child(bridge)
bridge.bind_session(session)
bridge.animate_moves.connect(_on_animate)
```

## Tests

```bash
godot --headless -s res://tests/unit/board/run_board_validation.gd
```

Covers wrap slides, invertibility, rotate (square + non-square), undo/redo, serialize roundtrip (including modifiers/connections/payload), history capacity, locked rows, arbitrary sizes, seeded RNG determinism.

## RNG boundaries (document for future Cascade)

- Align shift/rotate: **no RNG**.
- Cascade clear/spawn: seed must be on the command (`rng_seed`) or derived from `run_seed + command_id` via `SeededRNG`.
- Presentation particles may use local random; never feed that back into sim.
