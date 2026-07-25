# SHIFTR Puzzle Generator

Intelligent, deterministic **Align** puzzle generation for circular row/column shifts. Integrates with `BoardState` / `BoardSession` via serializable `PuzzleDef` resources.

| Piece | Path |
| --- | --- |
| Runtime API | `scripts/systems/puzzle_gen/` |
| Pattern motifs | `resources/puzzles/patterns/` (+ `PatternLibrary`) |
| Catalog tool | `tools/developer/generate_puzzle_catalog.gd` |
| Validation | `tests/unit/puzzle_gen/run_puzzle_gen_validation.gd` |

---

## 1. Goals (product requirements)

1. **Always solvable** — no impossible puzzles ship.
2. **Increasing complexity** — difficulty axes compose (GDD §7.2).
3. **Pattern recognition** — players learn motif families over chapters.
4. **No impossibles** — construction proof + validator gate.
5. **Difficulty scoring** — scalar combining optimal length, branch, tier, size.
6. **AI validation** — forward solver confirms / measures distance.
7. **Hint generation** — progressive spoilers from an optimal (or good) path.
8. **Thousands of unique levels** — seeded catalogs + fingerprint dedup.
9. **Explained algorithms** — this document.

---

## 2. Core algorithm: solve-by-construction (reverse play)

### Why reverse scramble

Forward random boards are often **unreachable** under row/col circular shifts (or reachable only at pathological depths). Reverse play avoids that class of bug:

```
target BoardState  (pattern template)
        │
        │  apply N random *legal* shifts
        ▼
start BoardState   (scrambled)
```

Every scramble step is a legal `SHIFT_ROW` / `SHIFT_COLUMN`. The start state therefore lies on the orbit of the target under the move group ⇒ **there exists a solution of length ≤ N** (invert the scramble sequence). That is an existence proof of solvability **even if** the forward search for the *shortest* path times out.

### Pipeline

```
seed + difficulty (+ optional PuzzleGenParams)
        │
        ├─ map difficulty → axes (size, colors, tier, scramble depth, optimal band)
        ├─ pick PatternTemplate (seeded; tier-gated)
        ├─ build goal BoardState from palette
        ├─ reverse-scramble N steps (avoid immediate undo pairs)
        ├─ optional bidirectional BFS:
        │     confirm solvable, measure optimal (or bound), seed first hint move
        ├─ DifficultyScorer → scalar; reject/regenerate if outside band
        ├─ fingerprint dedup against catalog set
        └─ emit PuzzleDef (or seed+params catalog entry)
```

### API

```gdscript
var gen := PuzzleGenerator.new()
var puzzle: PuzzleDef = gen.generate(seed, difficulty, params)  # params optional

var session := BoardSession.new()
puzzle.apply_to_session(session)  # loads start; goal in session.meta["goal"]
```

Dailies:

```gdscript
var daily := gen.generate_daily("2026-07-24", "season_01", 5)
```

Seed derivation is deterministic (`FNV`-style mix of `SHIFTR|date|salt`). Swap for SHA256 later if you need cross-language bit-identity with a backend; the important property is **stability**.

---

## 3. Pattern recognition curriculum

Motifs live as `PatternTemplate` resources (`cells` = color indices into a palette).

| Tier | Family | Player lesson |
| --- | --- | --- |
| 0 | Solid blocks / halves / quads | Large regions move together |
| 1 | Stripes (H/V) | Whole-line identity |
| 2 | Checker / multi-band | Alternation; higher entropy |
| 3 | Frames / rings | Border vs interior |
| 4 | Letter-like (L, T, C, H, S, cross) | Sparse figure/ground |

`PuzzleGenParams.pattern_tier_max` unlocks families. Difficulty curves raise tier slowly so recognition compounds (GDD: teach → reinforce → twist).

Built-ins cover **3×3 … 6×6** in `PatternLibrary`. Authored `.tres` under `resources/puzzles/patterns/` mirror key 4×4 motifs for editor visibility.

---

## 4. Forward solver (AI validation)

`PuzzleSolver` runs **bidirectional BFS** on a compact occupant layout (`AlignStateCodec`), not full `TileData` graphs — same shift semantics as `BoardState.shift_row/column`.

### Move set

For steps `1..max_steps_per_shift` (campaign default: 1):

- For each row `y`: shift ±steps
- For each column `x`: shift ±steps
- Skip no-ops (`steps ≡ 0 mod dimension`)

Branching ≈ `2 · (W + H) · max_steps` (≈ 16 on 4×4 / step=1).

### Bidirectional BFS

1. Frontier A from start, frontier B from goal; expand the smaller side.
2. Meet-in-the-middle reconstructs start→goal by walking forward parents and inverting the goal-side edges.
3. **Node cap** (`solver_node_cap`, default 80 000) bounds mobile/CI cost.

### Timeout policy

| Outcome | Meaning | Ship? |
| --- | --- | --- |
| Exact path | `optimal_is_exact = true` | Yes |
| Node cap hit | Use scramble depth as **upper bound** estimate; `construction_guaranteed` meta | Yes (still solvable) |
| True disconnect | Should not occur under construction; attempt discarded | No |

**Never** mark a construction puzzle “impossible.” Caps only affect *optimality knowledge*, not existence.

Complexity (rough):

- Time/memory `O(min(b^{d/2}, node_cap))` with branching `b` and depth `d`.
- 3×3–4×4 with depth ≤ 8: usually exact under default cap.
- 6×6 deep scrambles: often bound-only — acceptable for Endless/catalog bulk; campaign bosses should keep params in the exact band or raise the cap in CI.

---

## 5. Difficulty scoring

```
score = 4.0 * optimal_moves
      + 1.2 * log2(branching + 1)
      + 2.5 * pattern_tier
      + 0.35 * (width * height)
      + 0.8 * (color_count - 1)
      + 0.5 * (scramble_depth * 0.25)
```

Weights prioritize **true distance** (GDD §7.3) while still reflecting vision load (size/entropy) and curriculum tier.

`DifficultyScorer.band_for_difficulty(1..10)` provides soft target windows. Generator retries (`regen_attempts`) when optimal length or score falls outside `PuzzleGenParams` bands.

### Complexity axes (composed, not random spikes)

| Axis | Params field |
| --- | --- |
| Grid size | `width`, `height` |
| Color entropy | `color_count` |
| Scramble depth | `scramble_depth` |
| Optimal band | `min_optimal`, `max_optimal` |
| Pattern family | `pattern_tier_max` / `pattern_id` |
| Multi-step shifts | `allow_multi_step`, `max_steps_per_shift` |
| Budget slack | `budget_slack`, `soft_par_slack` → `move_budget` / pars |

`PuzzleGenParams.from_difficulty(d)` encodes the campaign curve (3×3 teach → 6×6 late).

---

## 6. Hint policy

`HintGenerator.hint(puzzle, stage, current_state?)` returns a `PuzzleHint`.

| Stage | Spoiler | Example blurb |
| --- | --- | --- |
| 0 `DIRECTION` | Axis only | “Try a row shift.” |
| 1 `LINE` | Which row/col | “Focus on row 2.” |
| 2 `FULL_MOVE` | Exact command | “Shift row 2 right.” |

Source of truth for the first move:

1. Cached `puzzle.hint_first_move` when the board still matches the authored start.
2. Otherwise re-solve from `current` → goal (mid-puzzle hints).

Always verify with `HintGenerator.is_legal_on(state, cmd)` before presenting (locked/frozen future-proofing).

UI cost curve (GDD): free early chapters → Sparks after chapter 2 — presentation concern; generator only supplies content.

---

## 7. Uniqueness & thousands of levels

### Fingerprint

`StateFingerprint` hashes width/height + row-major occupant ids. Catalog builders skip collisions.

### Two shipping formats

| Format | Size | Use |
| --- | --- | --- |
| **Seed + params** JSON catalog | Tiny | Thousands of dailies / Endless / chapter fills |
| **Baked `PuzzleDef`** JSON / `.tres` | Larger | Hand-picked campaign, demos, CI fixtures |

Regenerate:

```bash
godot --headless -s res://tools/developer/generate_puzzle_catalog.gd -- --count=2000 --difficulty=3 --base-seed=42
```

PowerShell: `tools/developer/generate_puzzle_catalog.ps1 -Count 5000`.

Output lands in `resources/puzzles/generated/`. Runtime reconstructs any entry with `PuzzleGenerator.generate(seed, difficulty, PuzzleGenParams.from_dict(entry.params))`.

Expected uniqueness at moderate difficulties is very high (≫ 95% on 2k samples); exact rate is asserted in unit validation.

---

## 8. Validator gate

`PuzzleValidator.validate(puzzle)` fails hard on:

- malformed dimensions / occupant arrays
- already solved (start == goal)
- proven unsolvable (should be impossible for construction output)
- optimal length outside authoring band when exact

Soft issues (logged, not always fatal):

- solver timeout (allowed if `meta.construction_guaranteed`)
- score slightly outside curriculum band

CI entry:

```bash
godot --headless -s res://tests/unit/puzzle_gen/run_puzzle_gen_validation.gd
```

Checks: 100% solvability on a sample batch, monotonic-ish difficulty bands, legal hints, uniqueness rate.

---

## 9. Board integration (no sim hacks)

- Generator mutates **copies** of `BoardState` for scramble only.
- `BoardSim` stays pure — no generator imports.
- `PuzzleDef.apply_to_session` installs start state and stores goal occupants in `session.meta`.
- Future Cascade / puzzle-object overlays can extend `PuzzleDef.meta` or add occupant payloads without changing reverse-scramble for Align colors.

---

## 10. Mobile / performance limits

| Concern | Mitigation |
| --- | --- |
| BFS memory | Compact `PackedStringArray` keys; node cap |
| Deep 6×6 | Prefer bound from construction; raise cap only in tooling |
| Catalog size | Ship seeds, not boards |
| Frame budget | Generation is offline / load-time, never per-frame |

Rule of thumb: keep **campaign** puzzles in the exact-optimal regime (≤ 5×5 or shallow 6×6). Use bulk seed catalogs for volume content.

---

## 11. Extension points

- New motifs → `PatternTemplate` `.tres` or `PatternLibrary` entries.
- Cascade mode → different construction (bag RNG + clear rules); keep Align path intact.
- Pattern databases / IDA* → drop-in replace `PuzzleSolver` while preserving `SolveResult`.
- Anchors / locks → filter `AlignStateCodec.legal_moves` to skip blocked lines (BoardState already blocks locked rows/cols).

---

## 12. Quick reference

```gdscript
var puzzle := PuzzleGenerator.new().generate(12345, 4)
var solve := PuzzleSolver.new().solve(puzzle.build_start_state(), puzzle.build_goal_state())
var score := DifficultyScorer.new().score_puzzle(puzzle)
var hint := HintGenerator.new().hint(puzzle, PuzzleGenEnums.HintStage.LINE)
var gate := PuzzleValidator.new().validate(puzzle)
```
