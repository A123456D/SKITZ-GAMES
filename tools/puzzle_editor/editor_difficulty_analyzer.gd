class_name EditorDifficultyAnalyzer
extends RefCounted
## Wires PuzzleSolver + DifficultyScorer for live authoring feedback.

var solver: PuzzleSolver = null
var scorer: DifficultyScorer = null


func _init(p_solver: PuzzleSolver = null, p_scorer: DifficultyScorer = null) -> void:
	solver = p_solver if p_solver else PuzzleSolver.new()
	scorer = p_scorer if p_scorer else DifficultyScorer.new()


func analyze(doc: EditorDocument) -> Dictionary:
	assert(doc != null)
	var puzzle := doc.to_puzzle_def()
	var warnings: PackedStringArray = PackedStringArray()
	if not puzzle.is_well_formed():
		return {
			"ok": false,
			"error": "malformed",
			"score": 0.0,
			"optimal_moves": -1,
			"optimal_is_exact": false,
			"branching_factor": 0.0,
			"band": DifficultyScorer.band_for_difficulty(doc.difficulty),
			"in_band": false,
			"warnings": PackedStringArray(["malformed"]),
		}

	solver.node_cap = PuzzleGenEnums.DEFAULT_SOLVER_NODE_CAP
	var solve := solver.solve(puzzle.build_start_state(), puzzle.build_goal_state())
	var optimal := solve.length if solve.solved else -1
	var exact := solve.optimal_is_exact and solve.solved
	var branching := solve.branching_estimate if solve.solved or solve.timed_out else float(doc.width + doc.height) * 2.0

	if solve.timed_out:
		warnings.append("solver_timeout")
		## Fall back to move_budget as soft estimate for scoring.
		optimal = maxi(doc.scramble_depth, doc.move_budget / 2)
		exact = false
	elif not solve.solved:
		warnings.append("unsolvable")
		return {
			"ok": false,
			"error": "unsolvable",
			"score": 0.0,
			"optimal_moves": -1,
			"optimal_is_exact": false,
			"branching_factor": branching,
			"band": DifficultyScorer.band_for_difficulty(doc.difficulty),
			"in_band": false,
			"warnings": warnings,
			"solve": solve,
		}

	var colors := _unique_colors(puzzle.goal_occupants)
	var score := scorer.score(
		optimal,
		branching,
		doc.pattern_tier,
		doc.width,
		doc.height,
		colors,
		doc.scramble_depth
	)
	var band := DifficultyScorer.band_for_difficulty(doc.difficulty)
	var in_band := scorer.in_band(score, doc.difficulty, 4.0)
	if not in_band:
		warnings.append("score_out_of_band")
	if exact and optimal == 0:
		warnings.append("already_solved")
	if exact and optimal > doc.move_budget:
		warnings.append("budget_below_optimal")

	## Write back analysis onto document (author may export with scores).
	doc.optimal_moves = optimal
	doc.optimal_is_exact = exact
	doc.difficulty_score = score
	doc.branching_factor = branching
	doc.state_fingerprint = StateFingerprint.from_occupants(
		doc.width, doc.height, doc.occupants_packed(EditorDocument.Layer.START)
	)
	if solve.solved and not solve.path.is_empty():
		doc.hint_first_move = solve.path[0].to_dict()

	return {
		"ok": true,
		"score": score,
		"optimal_moves": optimal,
		"optimal_is_exact": exact,
		"branching_factor": branching,
		"band": band,
		"in_band": in_band,
		"color_count": colors,
		"warnings": warnings,
		"solve": solve,
	}


## Off-main-thread analyze for editor UI. Callback(result: Dictionary) on main thread.
## Copies puzzle data first so solver BFS does not hitch the authoring frame.
func analyze_async(doc: EditorDocument, on_done: Callable) -> void:
	assert(doc != null)
	assert(on_done.is_valid())
	var puzzle := doc.to_puzzle_def()
	if not puzzle.is_well_formed():
		var bad := {
			"ok": false,
			"error": "malformed",
			"score": 0.0,
			"optimal_moves": -1,
			"optimal_is_exact": false,
			"branching_factor": 0.0,
			"band": DifficultyScorer.band_for_difficulty(doc.difficulty),
			"in_band": false,
			"warnings": PackedStringArray(["malformed"]),
		}
		on_done.call(bad)
		return

	var width := doc.width
	var height := doc.height
	var difficulty := doc.difficulty
	var pattern_tier := doc.pattern_tier
	var scramble_depth := doc.scramble_depth
	var move_budget := doc.move_budget
	var start_state := puzzle.build_start_state()
	var goal_state := puzzle.build_goal_state()
	var goal_occupants := puzzle.goal_occupants.duplicate()
	var start_packed := doc.occupants_packed(EditorDocument.Layer.START)
	var node_cap := PuzzleGenEnums.DEFAULT_SOLVER_NODE_CAP

	var task := func() -> Dictionary:
		var local_solver := PuzzleSolver.new()
		local_solver.node_cap = node_cap
		var local_scorer := DifficultyScorer.new()
		var warnings: PackedStringArray = PackedStringArray()
		var solve := local_solver.solve(start_state, goal_state)
		var optimal := solve.length if solve.solved else -1
		var exact := solve.optimal_is_exact and solve.solved
		var branching := solve.branching_estimate if solve.solved or solve.timed_out else float(width + height) * 2.0
		if solve.timed_out:
			warnings.append("solver_timeout")
			optimal = maxi(scramble_depth, move_budget / 2)
			exact = false
		elif not solve.solved:
			warnings.append("unsolvable")
			return {
				"ok": false,
				"error": "unsolvable",
				"score": 0.0,
				"optimal_moves": -1,
				"optimal_is_exact": false,
				"branching_factor": branching,
				"band": DifficultyScorer.band_for_difficulty(difficulty),
				"in_band": false,
				"warnings": warnings,
			}
		var colors := _unique_colors(goal_occupants)
		var score := local_scorer.score(
			optimal, branching, pattern_tier, width, height, colors, scramble_depth
		)
		var band := DifficultyScorer.band_for_difficulty(difficulty)
		var in_band := local_scorer.in_band(score, difficulty, 4.0)
		if not in_band:
			warnings.append("score_out_of_band")
		var hint_dict: Dictionary = {}
		if solve.solved and not solve.path.is_empty():
			hint_dict = solve.path[0].to_dict()
		return {
			"ok": true,
			"score": score,
			"optimal_moves": optimal,
			"optimal_is_exact": exact,
			"branching_factor": branching,
			"band": band,
			"in_band": in_band,
			"color_count": colors,
			"warnings": warnings,
			"hint_first_move": hint_dict,
			"state_fingerprint": StateFingerprint.from_occupants(width, height, start_packed),
		}

	var task_id := WorkerThreadPool.add_task(task, true)
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		var result: Dictionary = WorkerThreadPool.wait_for_task_completion(task_id)
		_apply_async_result(doc, result)
		on_done.call(result)
		return
	while not WorkerThreadPool.is_task_completed(task_id):
		await tree.process_frame
	var result2: Dictionary = WorkerThreadPool.wait_for_task_completion(task_id)
	_apply_async_result(doc, result2)
	on_done.call(result2)


func _apply_async_result(doc: EditorDocument, result: Dictionary) -> void:
	if doc == null or result.is_empty() or not bool(result.get("ok", false)):
		return
	doc.optimal_moves = int(result.get("optimal_moves", -1))
	doc.optimal_is_exact = bool(result.get("optimal_is_exact", false))
	doc.difficulty_score = float(result.get("score", 0.0))
	doc.branching_factor = float(result.get("branching_factor", 0.0))
	if result.has("state_fingerprint"):
		doc.state_fingerprint = String(result["state_fingerprint"])
	if result.has("hint_first_move"):
		doc.hint_first_move = result["hint_first_move"]


static func _unique_colors(occupants: PackedStringArray) -> int:
	var seen: Dictionary = {}
	for o in occupants:
		seen[o] = true
	return seen.size()
