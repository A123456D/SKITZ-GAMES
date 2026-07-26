# RIOT CUBE — Godot (Android path)

Same Phase-1 rules as the web build: twist rows/columns, rip matches of 3+, clear goals, score for stars.

Web stays for browser/PWA. **This Godot project is the native Android (and later iOS) path.**

## Open in Godot

1. Install **Godot 4.7** (mobile export templates).
2. Import / open folder: `riot-cube/godot/`
3. Press Play — portrait 720×1280 slice.

## Controls

- Swipe horizontally on a row to twist it
- Swipe vertically on a column to twist it
- `R` restarts

## Android export (when ready)

1. In Godot: **Editor → Manage Export Templates** — install 4.7 templates.
2. **Project → Export → Add → Android**
3. Configure debug keystore (Godot can generate one).
4. Export APK/AAB with package name e.g. `games.skitz.riotcube`
5. Test on device; install via USB or internal testing track.

Renderer is already set to **mobile**. Orientation is portrait.

## Keep in sync with web

Core rules live in:

| Web (TypeScript) | Godot (GDScript) |
|---|---|
| `riot-cube/src/core/board.ts` | `scripts/core/board.gd` |
| `riot-cube/src/core/session.ts` | `scripts/core/session.gd` |
| `riot-cube/src/core/levels.ts` | `scripts/core/levels.gd` |

When changing match/twist rules, update **both**.
