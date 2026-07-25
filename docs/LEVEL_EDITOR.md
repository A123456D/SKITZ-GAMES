# SHIFTR — Level Editor

In-game authoring for Align (and object-augmented) puzzles. Desktop-first, touch-usable.

| Piece | Path |
| --- | --- |
| Logic | `tools/puzzle_editor/` |
| UI | `scripts/tools/level_editor/` + `scenes/ui/screens/level_editor/` |
| Workshop example | `resources/puzzles/workshop/example_align_3x3.shiftr.json` |
| Headless checks | `tests/unit/level_editor/` |

---

## How to open

1. Run `scenes/ui/main_shell.tscn` (F6).
2. Main Menu → **Create**.
3. Router id: `UiRouter.SCREEN_LEVEL_EDITOR` (`&"level_editor"`).

---

## Why EditorDocument ≠ BoardSession

Gameplay undo lives in `MoveHistory` as **invertible BoardCommands**. Painting, flood-fill, resize, and metadata are **not** board shifts — cloning a full `BoardState` per brush dab would be wasteful and would pollute sim history.

The editor therefore owns:

1. **`EditorDocument`** — mutable draft (start/goal layers, meta, selection).
2. **`EditorCommand` stack** (`EditorHistory`) — sparse cell patches / resize snapshots / meta diffs.
3. **`BoardSession` + `PuzzleEngine`** — only when **Test** or **Instant Play** starts; discarded on exit so the draft never mutates from play.

`BoardSim` stays pure (no editor imports).

---

## Features

| # | Feature | Behavior |
| --- | --- | --- |
| 1 | Drag and drop | Palette selection + brush stroke; Select tool moves marquee contents |
| 2 | Paint tools | Brush, Erase, Fill, Line (Bresenham), Rect (Shift = filled) |
| 3 | Object palette | Align colors A–F + `PuzzleCatalog` objects (floors tagged `floor`) |
| 4–5 | Undo / Redo | Command stack (capacity 256) |
| 6–7 | Copy / Paste | Selection clipboard + JSON snippet (`shiftr_editor_clipboard`) |
| 8 | Test mode | Overlay play via `EditorTestSession`; chrome stays |
| 9 | Instant play | Same session; toolbar / palette / issues hidden; board focused |
| 10–11 | Export / Import | Workshop JSON (`.shiftr.json` / `.shiftrpz`); clipboard JSON; optional `.tres` via `WorkshopIO.export_tres` |
| 12 | Workshop | Envelope + stable ids + preview hash — see schema below |
| 13 | Difficulty analyzer | `DifficultyScorer` + `PuzzleSolver`; writes optimal / score onto document |
| 14 | Validation | Structured issue list (solvability, empty boards, teleporters, doors, lasers, start==goal) |

---

## Tools

| Tool | Key | Notes |
| --- | --- | --- |
| Brush | `B` | Paint active palette item |
| Erase | `E` | Clears color / object / floor by paint mode |
| Fill | `G` | 4-connected flood fill |
| Line | `L` | Click–drag Bresenham |
| Rect | `R` | Outline; hold Shift for filled |
| Select | `M` | Marquee; drag inside selection to move |

Colors `1`–`6` → A–F and switch to Brush. `Tab` toggles Start / Goal layer.

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` / `Ctrl+V` | Copy / Paste selection |
| `Ctrl+S` | Export (writes `user://workshop_export.shiftr.json` + clipboard JSON) |
| `Ctrl+O` | Import (clipboard workshop JSON, else last export path) |
| `Space` | Toggle Test mode |
| `Esc` | Exit Test / Instant Play |
| `B E G L R M` | Tools |
| `1`–`6` | Colors A–F |
| `Tab` | Start ↔ Goal layer |

Touch: tap/drag paints; in test mode, swipe row/column to shift.

---

## Workshop schema (v1)

**Why `schema_version`:** community levels outlive builds. Importers migrate known older envelopes instead of misreading boards.

```json
{
  "format": "shiftr_workshop_puzzle",
  "schema_version": 1,
  "exported_at": "2026-07-24T12:00:00Z",
  "workshop": {
    "title": "Half Shift",
    "author": "studio",
    "tags": ["intro", "align"],
    "seed": 1,
    "difficulty": 1,
    "preview_hash": "<start_fp>|<goal_fp>",
    "id": "workshop_half_3"
  },
  "puzzle": { /* PuzzleDef.to_dict() */ }
}
```

- File extensions: `.shiftr.json` (preferred) or `.shiftrpz` (same JSON body).
- `puzzle` matches `PuzzleDef` (`start_occupants`, `goal_occupants`, budgets, …).
- Rich object cells live under `puzzle.meta.start_cells` / `goal_cells` (EditorCell dicts) when authored.
- Also accepts bare `PuzzleDef` dicts and `shiftr_puzzle_defs` catalogs (first entry).

Constants: `tools/puzzle_editor/workshop_schema.gd`.

---

## Validation rules

| Code | Severity | Meaning |
| --- | --- | --- |
| `empty_start` / `empty_goal` | error | No occupants on layer |
| `start_equals_goal` | error | Already solved |
| `malformed` | error | Size / array mismatch |
| `unsolvable` | error | Solver found no path |
| `solver_timeout` | warning | Cap hit — may still be solvable |
| `solvable` | info | Confirmed length |
| `orphan_teleporter` | error | Single pad for a `link_id` |
| `teleporter_overlinked` | warning | More than two pads |
| `door_without_channel` | error | Empty door channel |
| `door_unpowered` | warning | Door channel with no switch/plate/receiver |
| `orphan_switch` | warning | Switch with no door |
| `receiver_no_emitter` / `emitter_no_receiver` | warning | Laser pairing |
| `laser_no_path` | warning | Emitter blocked in facing direction |

---

## Difficulty analyzer

Runs bidirectional BFS (`PuzzleSolver`) then `DifficultyScorer.score(...)`.

Reports: scalar score, optimal moves (exact flag), branching estimate, difficulty band for the authored tier, warnings (`score_out_of_band`, `budget_below_optimal`, …).

On success, updates document fields so Export ships scored metadata.

---

## Test / Instant Play

1. Document → `PuzzleDef.apply_to_session(BoardSession)`.
2. Optional `PuzzleEngine` + catalog; places non-color objects / floors from the Start layer.
3. Swipe shifts call `engine.shift_row/column` (or session if no engine).
4. Exit discards the session; document unchanged.

Instant Play = same path with editor chrome hidden.

---

## Module map

```text
tools/puzzle_editor/
  editor_document.gd          # Draft
  editor_cell.gd
  editor_command.gd / editor_history.gd
  editor_clipboard.gd
  commands/                   # CellPatch, Resize, Meta
  tools/                      # Brush, Erase, Fill, Line, Rect, Select
  workshop_schema.gd / workshop_io.gd
  editor_validator.gd
  editor_difficulty_analyzer.gd
  editor_test_session.gd
  level_editor_controller.gd

scripts/tools/level_editor/
  level_editor_screen.gd
  editor_board_view.gd
```

---

## Headless checks

```bash
godot --headless -s res://tests/unit/level_editor/run_level_editor_validation.gd
```

Covers import/export roundtrip, undo/redo paint, validation flags, clipboard paste.
