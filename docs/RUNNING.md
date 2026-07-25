# Running SHIFTR

## Godot binary

Unpacked under `tools/` (folder named like the zip):

| Binary | Path |
| --- | --- |
| Console (prefer for headless / CI) | `tools/Godot_v4.7.1-stable_win64.exe/Godot_v4.7.1-stable_win64_console.exe` |
| Editor / play | `tools/Godot_v4.7.1-stable_win64.exe/Godot_v4.7.1-stable_win64.exe` |

Verified version string: `4.7.1.stable.official.a13da4feb`

Override with env `GODOT` or `-Godot` on the PowerShell helpers.

## Renderer (Windows)

Project default is **`mobile`** (Vulkan Forward Mobile). Verified on Windows + NVIDIA; canvas shaders use `//` comments only (not GDScript `##`).

| Goal | Command |
| --- | --- |
| Play (recommended) | `.\run_game.bat` or `.\run_game.ps1 -Play` |
| Explicit mobile | `.\run_game.ps1 -Play -RenderingMethod mobile` |
| Driver fallback | `.\run_game.ps1 -Play -RenderingMethod gl_compatibility` |
| Desktop high-end later | export override or `--rendering-method forward_plus` |

Console one-liner (same as `-Play`):

```powershell
$g = ".\tools\Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64_console.exe"
& $g --path . --rendering-method mobile
```

If the window is white and the console spams `version_get_shader` / `Parameter "version" is null`, a canvas `.gdshader` failed to compile. Common Godot **4.7** pitfalls:

- GDScript `##` doc comments in `.gdshader` (use `//` only)
- `return` inside `fragment()` (use if/else; RD rejects early return)

Post-FX soft-fails via `ShaderFx` so bloom/glass skip instead of hard-crashing the frame when code still looks invalid.

## Open in editor (F5)

1. Run `.\run_game.ps1` from the project root (opens the editor), **or** open the project folder in Godot (Import / Open → `C:\Users\PC\Projects\SHIFTR`).
2. Main scene is `res://scenes/ui/main_shell.tscn` (`run/main_scene` in `project.godot`).
3. Press **F5** (or Play) in the editor to run the main scene.
4. From Main Menu, **Play** or **Continue** opens the neon concept play slice (`res://scenes/puzzles/concept_play_slice.tscn`). Level Select cells route there too. Or F6 that scene directly. Feel Lab remains a footer ghost only.

First open may import assets; wait until the editor is idle.

Concept alignment / visual source of truth: `docs/CONCEPT_ALIGNMENT.md`, boards in `assets/reference/concept/`.

## Helper scripts

If PowerShell blocks `.\run_game.ps1` with **ExecutionPolicy Restricted**, use either:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run_game.ps1 -Play
```

or double-click / run `run_game.bat` (no policy change required).

| Script | Purpose |
| --- | --- |
| `run_game.bat` | Play the game (calls the Godot GUI exe with `--rendering-method mobile`). Extra args are forwarded. |
| `run_tests.bat` | Same as `run_tests.ps1`, via `-ExecutionPolicy Bypass`. |
| `.\run_game.ps1` | Launch editor (default). `.\run_game.ps1 -Play` runs the game without the editor UI. Passes `--rendering-method mobile` by default. |
| `.\run_tests.ps1` | Runs all headless validation suites under `tests/unit/`. |
| `.\godot.cmd` | Thin shim: forwards args with `--path` to this project (prefers console exe). |

Examples:

```powershell
.\run_game.bat
powershell -NoProfile -ExecutionPolicy Bypass -File .\run_game.ps1 -Play
.\run_game.ps1
.\run_game.ps1 -Play
.\run_tests.bat
.\run_tests.ps1
.\godot.cmd --headless -s res://tests/unit/board/run_board_validation.gd
```

## Headless import

```powershell
$g = ".\tools\Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64_console.exe"
& $g --headless --path . --import
```

## Notes

- Godot 4.7 ships a built-in `TileData` (TileMap). SHIFTR board cells use `BoardTileData` instead.
- Translations: `LocaleService` loads `localization/shiftr.csv` at boot. Do not list the CSV under `locale/translations` (that caused `Failed loading resource: res://localization/shiftr.csv`).
