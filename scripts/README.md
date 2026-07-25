# scripts/

GDScript (and related) logic only.

| Folder | Role |
|--------|------|
| `singletons/` | Autoload scripts (register in Project Settings) |
| `managers/` | Composable orchestrators (prefer over new Autoloads) |
| `components/` | Small attachable behaviors |
| `systems/save/` | Persist / migrate player data |
| `systems/board/` | Pure board sim, commands, history, serialization |
| `presentation/board/` | Board view bridges (sim events → animation signals) |
| `puzzles/` | Rules & validation |
| `ui/` | UI presenters |
| `utils/` | Stateless helpers (`NodePool`, `AsyncLoader`, `PowerPolicy`, `SharedAtlas`, budgets) |
| `presentation/` | Board view, feel, UI directors |
