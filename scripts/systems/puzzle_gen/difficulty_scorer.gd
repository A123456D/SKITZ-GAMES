class_name DifficultyScorer
extends RefCounted
## Combines optimal length, branching, pattern tier, and size into a scalar score.
##
## score = 4.0 * optimal
##       + 1.2 * log2(branching + 1)
##       + 2.5 * pattern_tier
##       + 0.35 * (width * height)
##       + 0.8 * color_entropy
##       + 0.5 * scramble_depth_factor

const W_OPTIMAL := 4.0
const W_BRANCH := 1.2
const W_TIER := 2.5
const W_SIZE := 0.35
const W_ENTROPY := 0.8
const W_SCRAMBLE := 0.5


func score(
	optimal_moves: int,
	branching_factor: float,
	pattern_tier: int,
	width: int,
	height: int,
	color_count: int,
	scramble_depth: int = 0
) -> float:
	var opt := float(maxi(0, optimal_moves))
	var branch_term := _log2(maxi(0.0, branching_factor) + 1.0)
	var size_term := float(width * height)
	var entropy := float(maxi(1, color_count) - 1)
	var scramble_term := float(scramble_depth) * 0.25
	return (
		W_OPTIMAL * opt
		+ W_BRANCH * branch_term
		+ W_TIER * float(pattern_tier)
		+ W_SIZE * size_term
		+ W_ENTROPY * entropy
		+ W_SCRAMBLE * scramble_term
	)


func score_puzzle(puzzle: PuzzleDef) -> float:
	assert(puzzle != null)
	var colors := _unique_colors(puzzle.goal_occupants)
	return score(
		puzzle.optimal_moves,
		puzzle.branching_factor,
		puzzle.pattern_tier,
		puzzle.width,
		puzzle.height,
		colors,
		puzzle.scramble_depth
	)


## Expected score band for difficulty 1..10 (approximate curriculum targets).
static func band_for_difficulty(difficulty: int) -> Vector2:
	var d := clampi(difficulty, 1, 10)
	# Low / high inclusive-ish targets; validator uses these with soft margins.
	var lows := [6.0, 10.0, 14.0, 18.0, 24.0, 30.0, 36.0, 44.0, 52.0, 60.0]
	var highs := [16.0, 22.0, 28.0, 36.0, 44.0, 54.0, 64.0, 76.0, 90.0, 110.0]
	return Vector2(lows[d - 1], highs[d - 1])


func in_band(score_value: float, difficulty: int, margin: float = 2.0) -> bool:
	var band := band_for_difficulty(difficulty)
	return score_value >= band.x - margin and score_value <= band.y + margin


static func _log2(x: float) -> float:
	if x <= 0.0:
		return 0.0
	return log(x) / log(2.0)


static func _unique_colors(occupants: PackedStringArray) -> int:
	var seen: Dictionary = {}
	for o in occupants:
		seen[o] = true
	return seen.size()
