# CHAIN REACTOR — Godot

Portrait mobile-first build mirroring the web Phase-1 rules.

## Open

1. Install **Godot 4.7** (or use the SHIFTR Downloads / tools binary)
2. Open `chain-reactor/godot/` as a project, **or** run `.\run_game.ps1`
3. Run the main scene (`scenes/game.tscn`)

First open may import assets; the playable scene should show the chamber backdrop, logo, and **PLAY**.

## Visuals

Uses the same card/UI PNGs as web (`assets/cards`, `assets/ui`) plus Orbitron / JetBrains Mono. Cascade beams and banners play after each placement (SKIP FX to fast-forward).

**Inspect cards:** tap any board card (including the opponent’s) for a full detail panel. Tap a hand card twice for the same.

## Controls

- **PLAY** → pick faction (Volt / Prismatic / Void)
- Tap a hand card, then tap an empty board tile to place
- **PASS** ends your turn early
- 15s timer auto-passes
- After Round 6 (or board full), highest controlled power wins

## Export (Android later)

Use Godot’s Android export preset once the store path is ready — same approach as Riot Cube. Desktop preview works with the default run.

## Scripts

| Path | Role |
|---|---|
| `scripts/core/types.gd` | Constants + helpers |
| `scripts/core/cards.gd` | Card catalog |
| `scripts/core/deck.gd` | Mono presets |
| `scripts/core/board_ops.gd` | Board queries (`CRBoard`) |
| `scripts/core/cascade.gd` | Beam cascades |
| `scripts/core/match.gd` | Match flow |
| `scripts/core/ai.gd` | Heuristic opponent |
| `scripts/ui/game_screen.gd` | Portrait HUD |

Rules should stay in sync with the TypeScript core under `../src/core/`.
