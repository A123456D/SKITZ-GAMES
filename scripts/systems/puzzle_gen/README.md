# Puzzle generation system — Align mode procedural content.
#
# Runtime API:
#   PuzzleGenerator.generate(seed, difficulty, params) -> PuzzleDef
#   PuzzleSolver.solve(state, target) -> SolveResult
#   DifficultyScorer.score(...)
#   HintGenerator.hint(puzzle|state) -> PuzzleHint
#   PuzzleValidator.validate(puzzle)
#
# Docs: res://docs/PUZZLE_GENERATOR.md
# Tests: godot --headless -s res://tests/unit/puzzle_gen/run_puzzle_gen_validation.gd
# Catalog: godot --headless -s res://tools/developer/generate_puzzle_catalog.gd
