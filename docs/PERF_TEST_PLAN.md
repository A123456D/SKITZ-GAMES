# Performance Test Plan

Complements [PERFORMANCE.md](./PERFORMANCE.md). Use before each release candidate.

## Budgets (fail if violated on mid-tier reference device)

| Metric | Target |
| --- | --- |
| Playable FPS | ≥ 60 locked (120 optional) |
| Touch → highlight | ≤ 1 frame |
| Sim CPU / shift | < 0.5 ms |
| Draw calls (play) | ≤ 50 |
| Audio voices | ≤ 24 |

Reference devices: mid Android (3–4 GB RAM), last-2 iPhone, Steam Deck (for Steam builds), low-end Chromebook/Web.

## Scripted checklist (manual / device lab)

1. Cold boot → Main Menu ≤ 3 s to interactive on mid Android.
2. Main Menu idle: CPU near idle with Battery Saver on; no spin.
3. World Map → Level Select → enter puzzle: no hitch > 100 ms (async screen warm).
4. Shift spam 8×8 board 60 s: FPS stable; pools not growing unboundedly (F3 overlay).
5. Cascade / juice max 30 s then Battery Saver: particles drop; bloom softens.
6. Reduce motion: no shake/parallax; transitions shorten.
7. Background app 30 s → resume: save intact, audio buses restored.
8. Quality High → Low toggle: draw calls and bloom pass change visibly.
9. Web: first load + second load (cache); memory after 10 puzzles.
10. Steam Deck: 60 FPS TDP 7 W playable scene; glyphs readable.

## Headless smoke list

Run on CI / pre-tag:

```bash
godot --headless -s res://tests/unit/board/run_board_validation.gd
godot --headless -s res://tests/unit/puzzle/run_puzzle_validation.gd
godot --headless -s res://tests/unit/puzzle_gen/run_puzzle_gen_validation.gd
godot --headless -s res://tests/unit/level_editor/run_level_editor_validation.gd
godot --headless -s res://tests/unit/platform/run_platform_validation.gd
```

Optional: record pass/fail table in release notes.

## Profiling hooks

- **F3** `PerfOverlay` in debug / editor.
- Godot Debugger → Monitors: FPS, Draw Calls, Memory.
- Android: `adb shell dumpsys gfxinfo` / Perfetto for jank.
- iOS: Xcode Instruments Time Profiler + Core Animation.

## Release sign-off

| Role | Sign |
| --- | --- |
| Eng — headless green | ☐ |
| Eng — device lab checklist | ☐ |
| Design — juice vs reduce-motion | ☐ |
| Prod — no secret in pack | ☐ |
