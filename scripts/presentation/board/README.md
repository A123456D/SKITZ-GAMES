# scripts/presentation/board/

Thin view adapters that consume `SimEvent`s from `BoardSession`. Animation timing and juice live here (or in scenes under `scenes/puzzles/`), never in `scripts/systems/board/`.

| Script | Role |
| --- | --- |
| `board_view_bridge.gd` | Session events → `animate_moves` / rebuild signals |
| `board_view.gd` | Tile grid Control; `source_index` identity for anim |
| `board_tile_view.gd` | Single cell visual + streak / land flash |

Feel orchestration: `scripts/presentation/feel/` + `docs/MOVEMENT_FEEL.md`.
