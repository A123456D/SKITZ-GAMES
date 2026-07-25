# tools/

Developer and authoring tooling — puzzle editor, debug helpers.

Not shipping content. Prefer true `EditorPlugin`s under `res://addons/`; keep supporting authoring scripts/docs here. Gate any runtime debug hooks behind debug builds / feature tags.

## Puzzle catalog

```bash
godot --headless -s res://tools/developer/generate_puzzle_catalog.gd -- --count=2000 --difficulty=3
```

Or `tools/developer/generate_puzzle_catalog.ps1` (set `GODOT` / `-Godot` if needed).

## Level editor

In-game authoring under `tools/puzzle_editor/` — open via Main Menu → **Create**.

Docs: `docs/LEVEL_EDITOR.md`

```bash
godot --headless -s res://tests/unit/level_editor/run_level_editor_validation.gd
```
