# Generated puzzle catalogs

Output of `tools/developer/generate_puzzle_catalog.gd`.

Prefer **seed + params** JSON catalogs for thousands of levels (tiny on disk).
Optionally bake a small sample of full `PuzzleDef` dicts for demos / fixtures.

Regenerate:
```
godot --headless -s res://tools/developer/generate_puzzle_catalog.gd
```
or `tools/developer/generate_puzzle_catalog.ps1`
