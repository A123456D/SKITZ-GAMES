# Puzzle Editor (tools/puzzle_editor)

In-game / debug level authoring logic. Presentation lives under
`scripts/tools/level_editor/` and `scenes/ui/screens/level_editor/`.

See **`docs/LEVEL_EDITOR.md`** for features, workshop schema, shortcuts, and validation.

## Quick headless check

```bash
godot --headless -s res://tests/unit/level_editor/run_level_editor_validation.gd
```
