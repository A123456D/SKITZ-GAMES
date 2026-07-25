# tests/

Automated tests and fixtures. Not shipped in release exports.

Keep tests isolated from `scenes/` and `resources/` shipping content; reference fixtures under `fixtures/` instead of mutating production packs.

## Board system

```bash
godot --headless -s res://tests/unit/board/run_board_validation.gd
```

## Puzzle engine

```bash
godot --headless -s res://tests/unit/puzzle/run_puzzle_validation.gd
```

Covers door+switch, pressure plate, laser+mirror, teleporter, ice slide, enemy tick, HeavyDoor-as-data, determinism. See `docs/PUZZLE_ENGINE.md`.

## Puzzle generator

```bash
godot --headless -s res://tests/unit/puzzle_gen/run_puzzle_gen_validation.gd
```

Covers reverse-scramble solvability, difficulty band trend, legal progressive hints, uniqueness rate, determinism. See `docs/PUZZLE_GENERATOR.md`.

## Level editor

```bash
godot --headless -s res://tests/unit/level_editor/run_level_editor_validation.gd
```

Covers workshop import/export roundtrip, undo/redo paint, clipboard paste, validation, difficulty analyzer, test session. See `docs/LEVEL_EDITOR.md`.

## Platform / save / achievements

```bash
godot --headless -s res://tests/unit/platform/run_platform_validation.gd
```

Covers save migration v1→current, cloud merge policy, local achievement unlock + persist, daily leaderboard cache, Null adapter gateway. See `docs/RELEASE_READINESS.md`, `docs/SAVE_MIGRATION.md`.
