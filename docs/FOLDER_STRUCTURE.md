# SHIFTR — Folder Structure

Professional Godot 4.x layout for a mobile-first, cross-platform puzzle game.  
Architecture goals: **composition over inheritance**, **data/logic/presentation separation**, **Resource-driven puzzle content**, and clear isolation of editor tools, tests, and shipping content.

## Full tree

```text
SHIFTR/
├── addons/                          # Godot plugins (EditorPlugin / runtime addons)
│   └── README.md
├── assets/                          # Importable media (textures, audio, fonts, etc.)
│   ├── audio/
│   │   ├── music/
│   │   ├── sfx/
│   │   ├── ui/
│   │   └── voice/
│   ├── fonts/
│   ├── icons/
│   │   ├── app/                     # Launcher / store / adaptive icons
│   │   └── ui/                      # In-game icon atlases & SVGs
│   ├── textures/
│   │   ├── backgrounds/
│   │   ├── effects/
│   │   ├── puzzles/
│   │   └── ui/
│   ├── particles/                   # Particle textures / spritesheets
│   ├── shaders/
│   │   ├── materials/               # .tres ShaderMaterial / VisualShader
│   │   └── source/                  # .gdshader / .gdshaderinc
│   ├── animations/                  # AnimationLibrary, SpriteFrames, etc.
│   └── README.md
├── docs/                            # Design & architecture docs (not shipped)
│   ├── FOLDER_STRUCTURE.md          # This file
│   └── GDD.md                       # Game Design Document (if present — do not overwrite)
├── exports/                         # Build output only (not imported by Godot)
│   ├── android/
│   ├── ios/
│   ├── windows/
│   ├── linux/
│   ├── macos/
│   ├── web/
│   └── .gdignore
├── resources/                       # Runtime .tres/.res data (logic-free content)
│   ├── puzzles/                     # Level / pack definitions (Resource-driven)
│   │   ├── packs/
│   │   └── templates/
│   ├── themes/                      # Theme, StyleBox, font theme overrides
│   ├── localization/                # Translation CSV / PO / custom locale resources
│   ├── materials/                   # Shared material resources (non-shader-authored)
│   ├── configs/                     # Balance, difficulty, feature flags as Resources
│   ├── save/                        # Save schema / default profile Resources
│   └── README.md
├── scenes/                          # .tscn presentation & composition roots
│   ├── bootstrap/                   # Splash, boot, loading shell
│   ├── main/                        # Main game shell / flow scenes
│   ├── puzzles/                     # Puzzle play scenes (compose components)
│   ├── ui/
│   │   ├── components/              # Reusable UI pieces (buttons, panels)
│   │   ├── hud/
│   │   ├── menus/
│   │   └── popups/
│   ├── effects/                     # Particle / VFX scenes
│   └── README.md
├── scripts/                         # .gd / .gdshader-adjacent logic (no level data)
│   ├── components/                  # Small composable behaviors
│   ├── managers/                    # Orchestrators injected/composed (prefer not Autoload)
│   ├── services/                    # Platform / save / meta / privacy (see PLATFORM_SERVICES.md)
│   │   ├── platform/                # Gateway + store adapters + local cloud backend
│   │   └── save/                    # Profile SaveService + SaveMigrator
│   ├── singletons/                  # Autoload scripts ONLY (Project Settings → Autoload)
│   ├── systems/                     # Board, puzzle, puzzle_gen, … (board save via BoardSerializer)
│   ├── puzzles/                     # Puzzle rules, validators, solvers helpers
│   ├── ui/                          # UI controllers / presenters
│   ├── utils/                       # Pure helpers (math, platform, mobile input)
│   └── README.md
├── tests/                           # Automated tests (not shipped)
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── README.md
├── tools/                           # Dev-only / editor-adjacent tooling
│   ├── puzzle_editor/               # In-house level authoring (isolated from runtime)
│   ├── developer/                   # Debug overlays, cheats, profiling helpers
│   └── README.md
└── .gitignore
```

## Why every folder exists

### `addons/`
Godot’s **standard plugin root** (`res://addons/`). Editor and runtime plugins live here so Project Settings → Plugins can discover them. Keep third-party and first-party plugins here; do **not** put one-off game scenes under `addons/`.

### `assets/`
All **importable media**. Godot’s import pipeline (`.import` sidecars) owns this tree. Separating media from `resources/` (game data) and `scripts/` (logic) keeps pipelines and ownership clear.

| Subfolder | Purpose |
|-----------|---------|
| `audio/music` | Looping / adaptive music beds |
| `audio/sfx` | Gameplay sound effects |
| `audio/ui` | Menu / HUD clicks & feedback |
| `audio/voice` | Optional VO / accessibility narration |
| `fonts` | `.ttf` / `.otf` / bitmap fonts for UI & puzzle text |
| `icons/app` | Store, adaptive, and OS launcher icons |
| `icons/ui` | In-game iconography |
| `textures/*` | Backgrounds, puzzle art, UI chrome, effect maps |
| `particles` | Emitter spritesheets / textures (scenes that *use* them live under `scenes/effects/`) |
| `shaders/source` | `.gdshader` / includes |
| `shaders/materials` | ShaderMaterial resources bound to those shaders |
| `animations` | AnimationLibrary, SpriteFrames, and reusable motion assets |

### `docs/`
Human documentation. Never part of an export. Safe home for GDD, architecture notes, and this structure guide. **`docs/GDD.md` is reserved** — create or edit the GDD separately; this structure work must not overwrite it.

### `exports/`
Platform build artifacts. Kept out of Godot’s asset scan via `.gdignore` so APKs/IPAs/ZIPs do not inflate the editor project or get re-imported.

### `resources/`
**Data-only** Godot `Resource` files (`.tres` / `.res`). Puzzle packs, themes, localization tables, balance configs, and save schemas live here so content expands without new scenes/scripts. Prefer `Resource`-driven puzzle definitions for modularity and tooling.

| Subfolder | Purpose |
|-----------|---------|
| `puzzles/` | Level instances & pack catalogs |
| `puzzles/packs/` | Ordered packs / campaigns |
| `puzzles/templates/` | Authoring templates for the puzzle editor |
| `themes/` | UI `Theme` and shared style resources |
| `localization/` | Translation sources & locale resources |
| `materials/` | Shared non-shader-authored materials if needed |
| `configs/` | Tunables (difficulty curves, timers, feature flags) |
| `save/` | Default profiles, schema version Resources |

### `scenes/`
**Presentation & composition**. Scenes compose nodes + scripts; they should not own long-term content data (that belongs in `resources/`). Prefer small reusable scenes under `ui/components/` and `puzzles/` over deep inheritance.

| Subfolder | Purpose |
|-----------|---------|
| `bootstrap/` | Cold start: splash, loading, service wiring |
| `main/` | App shell / navigation host |
| `puzzles/` | Playable puzzle scene graphs |
| `ui/menus` | Title, settings, level select |
| `ui/hud` | In-run HUD |
| `ui/popups` | Modals, dialogs, toasts |
| `ui/components` | Buttons, list rows, reusable widgets |
| `effects/` | GPUParticles / VFX packed scenes |

### `scripts/`
**Logic only** — no baked level data. Supports composition: small components + managers that can be injected or referenced, with Autoloads kept minimal.

| Subfolder | Purpose |
|-----------|---------|
| `components/` | Reusable behavior scripts attached to nodes |
| `managers/` | Session, audio, puzzle-flow orchestrators (compose these; Autoload only when truly global) |
| `singletons/` | **Autoload scripts only** — register in Project Settings → Autoload |
| `services/` | Platform gateway, save/migrate, achievements, analytics, privacy |
| `systems/save/` | _(legacy note)_ Prefer `scripts/services/save/` for profile pipeline |
| `puzzles/` | Rules, validation, generation helpers |
| `ui/` | UI logic / presenters |
| `utils/` | Stateless helpers (safe for reuse everywhere) |

### `tests/`
Isolated from shipping content. Unit and integration tests, plus fixtures. Never referenced by export presets or runtime boot scenes.

### `tools/`
**Not shipping content.** Puzzle editor and developer utilities. Prefer editor plugins under `addons/` when they need `EditorPlugin` APIs; keep non-plugin tooling and documentation here. Gate any runtime debug entry points behind `OS.is_debug_build()` / feature tags.

| Subfolder | Purpose |
|-----------|---------|
| `puzzle_editor/` | Level authoring UI/scripts used in-editor or debug builds |
| `developer/` | Cheats, inspectors, profiling helpers |

## Godot-specific conventions

### `res://` paths
Everything under the project root is addressable as `res://...`. Examples:

- Autoload script: `res://scripts/singletons/game_services.gd`
- Puzzle pack: `res://resources/puzzles/packs/pack_01.tres`
- Menu scene: `res://scenes/ui/menus/title_menu.tscn`
- Shader: `res://assets/shaders/source/soft_glow.gdshader`

Prefer **stable, deep paths** over dumping files at the project root.

### Autoloads / singletons
1. Place Autoload scripts in `scripts/singletons/`.
2. Register them in **Project → Project Settings → Autoload** (writes `[autoload]` in `project.godot`).
3. Prefer **few** Autoloads (e.g. save service, event bus, audio router). Prefer composition via managers under `scripts/managers/` for feature-scoped orchestration.

### Plugins
- Install / author plugins under `addons/<plugin_name>/` with `plugin.cfg`.
- Enable in **Project Settings → Plugins**.
- First-party editor tooling that is a true `EditorPlugin` belongs in `addons/`; supporting assets for authoring may live in `tools/` and be referenced by the plugin.

### Data vs logic vs presentation
| Concern | Home |
|---------|------|
| Content / tunables | `resources/` |
| Behavior | `scripts/` |
| Node graphs / UI layout | `scenes/` |
| Media | `assets/` |

Puzzle content should be **Resource-driven** so new levels are data drops, not new code.

### Editor tools vs runtime
| Kind | Home | Shipped? |
|------|------|----------|
| Runtime game | `scenes/`, `scripts/`, `resources/`, `assets/` | Yes |
| Editor plugins | `addons/` | Editor only |
| Authoring / debug | `tools/` | No (or debug-gated) |
| Tests | `tests/` | No |
| Docs / exports | `docs/`, `exports/` | No |

### Mobile-first notes
- Keep UI scenes under `scenes/ui/` with components sized for touch.
- App icons in `assets/icons/app/` feed export presets.
- Prefer platform helpers in `scripts/utils/` rather than scattered `#ifdef`-style branches.
- Use export feature tags / custom build options to strip `tools/` and `tests/` from release builds.

### Empty folders & ignore files
- Major areas include a short `README.md` describing intent (safe for empty trees).
- Leaf asset folders use `.gitkeep` so Git retains empty directories.
- `exports/.gdignore` prevents Godot from importing build products.
- Root `.gitignore` excludes `.godot/`, `.import/` noise patterns, export binaries, and OS junk.

## Expandability checklist

- New puzzle → add a Resource under `resources/puzzles/` (and pack entry under `packs/`).
- New reusable UI widget → `scenes/ui/components/` + optional script under `scripts/ui/` or `scripts/components/`.
- New global service → justify Autoload; otherwise add a manager and compose it from bootstrap.
- New editor feature → `addons/` if `EditorPlugin`; otherwise `tools/`.
- New test → `tests/unit` or `tests/integration` with fixtures in `tests/fixtures/`.
