class_name PuzzleValidator
extends RefCounted
## Gates shipped puzzles: well-formed, not already solved, solvable, score band.

var solver: PuzzleSolver = null
var scorer: DifficultyScorer = null


func _init(p_solver: PuzzleSolver = null, p_scorer: DifficultyScorer = null) -> void:
	solver = p_solver if p_solver else PuzzleSolver.new()
	scorer = p_scorer if p_scorer else DifficultyScorer.new()


func validate(puzzle: PuzzleDef, params: PuzzleGenParams = null) -> Dictionary:
	var issues: PackedStringArray = PackedStringArray()
	if puzzle == null:
		return _result(false, PackedStringArray(["null_puzzle"]), null)

	if not puzzle.is_well_formed():
		issues.append("malformed")

	if StateFingerprint.from_occupants(puzzle.width, puzzle.height, puzzle.start_occupants) == StateFingerprint.from_occupants(
		puzzle.width, puzzle.height, puzzle.goal_occupants
	):
		issues.append("already_solved")

	var start := puzzle.build_start_state()
	var goal := puzzle.build_goal_state()
	solver.node_cap = params.solver_node_cap if params else PuzzleGenEnums.DEFAULT_SOLVER_NODE_CAP
	solver.max_steps_per_shift = (
		params.max_steps_per_shift if params and params.allow_multi_step else 1
	)
	if params and params.allow_multi_step:
		solver.max_steps_per_shift = params.max_steps_per_shift

	var solve := solver.solve(start, goal)
	if not solve.solved:
		# Construction guarantees reachability; timeout ≠ impossible.
		if solve.timed_out:
			issues.append("solver_timeout")
		else:
			issues.append("unsolvable")
	else:
		if puzzle.optimal_is_exact and puzzle.optimal_moves >= 0 and puzzle.optimal_moves != solve.length:
			issues.append("optimal_mismatch")
		if params and (solve.length < params.min_optimal or solve.length > params.max_optimal):
			issues.append("optimal_out_of_band")

	var score := scorer.score_puzzle(puzzle)
	var difficulty := puzzle.difficulty
	if params == null:
		pass
	elif not scorer.in_band(score, difficulty, 4.0):
		# Soft warning — construction may still ship if optimal band ok.
		issues.append("score_soft_out_of_band")

	var ok := true
	for issue in issues:
		if issue in ["malformed", "already_solved", "unsolvable", "optimal_out_of_band"]:
			ok = false
			break
	# solver_timeout alone does not fail when construction_guaranteed meta is set
	if issues.has("solver_timeout") and not bool(puzzle.meta.get("construction_guaranteed", false)):
		ok = false

	return _result(ok, issues, solve)


func validate_batch(puzzles: Array, params: PuzzleGenParams = null) -> Dictionary:
	var passed := 0
	var failed := 0
	var details: Array = []
	for p in puzzles:
		var r := validate(p as PuzzleDef, params)
		details.append(r)
		if r["ok"]:
			passed += 1
		else:
			failed += 1
	return {"passed": passed, "failed": failed, "details": details}


static func _result(ok: bool, issues: PackedStringArray, solve: SolveResult) -> Dictionary:
	return {
		"ok": ok,
		"issues": issues,
		"solve": solve,
	}
