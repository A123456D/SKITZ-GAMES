class_name PuzzleGenerator
extends RefCounted
## Solve-by-construction Align generator: target pattern → N inverse shifts → always solvable.

var scorer: DifficultyScorer = null
var solver: PuzzleSolver = null
var validator: PuzzleValidator = null


func _init() -> void:
	scorer = DifficultyScorer.new()
	solver = PuzzleSolver.new()
	validator = PuzzleValidator.new(solver, scorer)


## Primary API: generate(seed, difficulty, params) -> PuzzleDef
func generate(seed_value: int, difficulty: int = 1, params: PuzzleGenParams = null) -> PuzzleDef:
	var d := clampi(difficulty, 1, 10)
	var p := params.duplicate_params() if params else PuzzleGenParams.from_difficulty(d)
	solver.node_cap = p.solver_node_cap
	solver.max_steps_per_shift = p.max_steps_per_shift if p.allow_multi_step else 1

	var seen: Dictionary = {}
	var best: PuzzleDef = null
	var best_dist := 999999.0

	for attempt in p.regen_attempts:
		var attempt_seed := _derive_seed(seed_value, attempt)
		var candidate := _generate_once(attempt_seed, d, p)
		if candidate == null:
			continue
		if seen.has(candidate.state_fingerprint):
			continue
		seen[candidate.state_fingerprint] = true

		if p.reject_already_solved and candidate.optimal_moves == 0:
			continue

		var band_ok := candidate.optimal_moves >= p.min_optimal and candidate.optimal_moves <= p.max_optimal
		if not candidate.optimal_is_exact:
			# Construction length is an upper bound; accept if within expanded band.
			band_ok = candidate.optimal_moves >= p.min_optimal and candidate.optimal_moves <= p.max_optimal + p.scramble_depth

		var score_ok := scorer.in_band(candidate.difficulty_score, d, 6.0)
		if band_ok and (score_ok or not p.require_solver_confirm):
			candidate.id = StringName("gen_%d_d%d" % [seed_value, d])
			return candidate

		var target_mid := float(p.min_optimal + p.max_optimal) * 0.5
		var dist := absf(float(candidate.optimal_moves) - target_mid)
		if best == null or dist < best_dist:
			best = candidate
			best_dist = dist

	if best != null:
		best.id = StringName("gen_%d_d%d" % [seed_value, d])
		best.meta["regen_exhausted"] = true
		return best

	# Absolute fallback: shallow scramble of half-split (still construction-solvable).
	return _emergency_puzzle(seed_value, d, p)


func generate_daily(date_yyyy_mm_dd: String, season_salt: String = "SHIFTR", difficulty: int = 5) -> PuzzleDef:
	var seed_value := _daily_seed(date_yyyy_mm_dd, season_salt)
	return generate(seed_value, difficulty, null)


func _generate_once(seed_value: int, difficulty: int, p: PuzzleGenParams) -> PuzzleDef:
	var rng := SeededRNG.new(seed_value if seed_value != 0 else 1)
	var pattern := PatternLibrary.pick(rng, p.width, p.height, p.pattern_tier_max, p.color_count, p.pattern_id)
	var palette := _palette_slice(p.palette, p.color_count)
	var goal := pattern.build_goal_state(palette)
	var start := goal.duplicate_state()

	var max_steps := p.max_steps_per_shift if p.allow_multi_step else 1
	var applied := 0
	var last_cmd: BoardCommand = null
	for _i in p.scramble_depth:
		var cmd := _random_shift(rng, p.width, p.height, max_steps)
		# Avoid immediate undo of previous scramble step (reduces wasted depth).
		if last_cmd != null and _is_inverse_pair(last_cmd, cmd):
			cmd = _random_shift(rng, p.width, p.height, max_steps)
		var moves := (
			start.shift_row(cmd.row, cmd.dir, cmd.steps)
			if cmd.type == BoardEnums.CommandType.SHIFT_ROW
			else start.shift_column(cmd.column, cmd.dir, cmd.steps)
		)
		if moves.is_empty():
			continue
		last_cmd = cmd
		applied += 1

	if applied == 0:
		return null

	var start_occ := AlignStateCodec.from_board(start)
	var goal_occ := AlignStateCodec.from_board(goal)

	var solve := SolveResult.new()
	if p.require_solver_confirm:
		solve = solver.solve_occupants(start_occ, goal_occ, p.width, p.height)

	var puzzle := PuzzleDef.new()
	puzzle.seed_value = seed_value
	puzzle.difficulty = difficulty
	puzzle.width = p.width
	puzzle.height = p.height
	puzzle.pattern_id = pattern.id
	puzzle.pattern_tier = pattern.tier
	puzzle.goal_occupants = goal_occ
	puzzle.start_occupants = start_occ
	puzzle.scramble_depth = applied
	puzzle.gen_params = p.to_dict()
	puzzle.state_fingerprint = StateFingerprint.from_occupants(p.width, p.height, start_occ)
	puzzle.meta["construction_guaranteed"] = true
	puzzle.meta["pattern_family"] = pattern.family
	puzzle.mode = &"align"

	if solve.solved:
		puzzle.optimal_moves = solve.length
		puzzle.optimal_is_exact = solve.optimal_is_exact
		puzzle.branching_factor = solve.branching_estimate
		if not solve.path.is_empty():
			puzzle.hint_first_move = solve.path[0].to_dict()
	elif solve.timed_out:
		# Upper bound from construction; never mark unsolvable.
		puzzle.optimal_moves = applied
		puzzle.optimal_is_exact = false
		puzzle.branching_factor = float(AlignStateCodec.legal_moves(p.width, p.height, max_steps).size())
		puzzle.meta["optimal_estimate"] = "scramble_depth"
		# Construction inverse path first move = inverse of last scramble (approx).
		if last_cmd != null:
			puzzle.hint_first_move = last_cmd.inverse().to_dict()
	else:
		# Should not happen under construction; treat as failed attempt.
		return null

	puzzle.difficulty_score = scorer.score(
		puzzle.optimal_moves,
		puzzle.branching_factor,
		puzzle.pattern_tier,
		puzzle.width,
		puzzle.height,
		p.color_count,
		puzzle.scramble_depth
	)
	_apply_pars(puzzle, p)
	return puzzle


func _apply_pars(puzzle: PuzzleDef, p: PuzzleGenParams) -> void:
	var opt := maxi(1, puzzle.optimal_moves)
	puzzle.par_hard = opt
	puzzle.par_soft = opt + p.soft_par_slack
	puzzle.move_budget = opt + p.budget_slack


func _emergency_puzzle(seed_value: int, difficulty: int, p: PuzzleGenParams) -> PuzzleDef:
	var soft := p.duplicate_params()
	soft.scramble_depth = maxi(1, mini(3, soft.scramble_depth))
	soft.min_optimal = 1
	soft.max_optimal = 8
	soft.require_solver_confirm = true
	soft.pattern_id = &""
	soft.pattern_tier_max = 0
	soft.color_count = mini(2, soft.color_count)
	var puzzle := _generate_once(_derive_seed(seed_value, 99), difficulty, soft)
	if puzzle == null:
		# Manually build trivial half + one shift.
		var rng := SeededRNG.new(seed_value if seed_value != 0 else 1)
		var pattern := PatternLibrary.pick(rng, soft.width, soft.height, 0, 2)
		var goal := pattern.build_goal_state(_palette_slice(soft.palette, 2))
		var start := goal.duplicate_state()
		start.shift_row(0, 1, 1)
		puzzle = PuzzleDef.new()
		puzzle.seed_value = seed_value
		puzzle.difficulty = difficulty
		puzzle.width = soft.width
		puzzle.height = soft.height
		puzzle.pattern_id = pattern.id
		puzzle.goal_occupants = AlignStateCodec.from_board(goal)
		puzzle.start_occupants = AlignStateCodec.from_board(start)
		puzzle.scramble_depth = 1
		puzzle.optimal_moves = 1
		puzzle.optimal_is_exact = true
		puzzle.branching_factor = float(AlignStateCodec.legal_moves(soft.width, soft.height, 1).size())
		puzzle.state_fingerprint = StateFingerprint.from_state(start)
		puzzle.meta["construction_guaranteed"] = true
		puzzle.meta["emergency"] = true
		puzzle.hint_first_move = BoardCommand.shift_row(0, -1, 1).to_dict()
		puzzle.difficulty_score = scorer.score_puzzle(puzzle)
		_apply_pars(puzzle, soft)
	puzzle.id = StringName("gen_%d_d%d" % [seed_value, difficulty])
	return puzzle


func _random_shift(rng: SeededRNG, width: int, height: int, max_steps: int) -> BoardCommand:
	var use_row := rng.next_int(2) == 0
	var dir := 1 if rng.next_int(2) == 0 else -1
	var steps := 1
	if max_steps > 1:
		steps = rng.next_range(1, max_steps)
	if use_row:
		return BoardCommand.shift_row(rng.next_int(height), dir, steps)
	return BoardCommand.shift_column(rng.next_int(width), dir, steps)


func _is_inverse_pair(a: BoardCommand, b: BoardCommand) -> bool:
	if a.type != b.type or a.steps != b.steps:
		return false
	if a.dir != -b.dir:
		return false
	if a.type == BoardEnums.CommandType.SHIFT_ROW:
		return a.row == b.row
	if a.type == BoardEnums.CommandType.SHIFT_COLUMN:
		return a.column == b.column
	return false


func _palette_slice(palette: PackedStringArray, color_count: int) -> PackedStringArray:
	var n := clampi(color_count, 1, palette.size())
	var out := PackedStringArray()
	for i in n:
		out.append(palette[i])
	return out


func _derive_seed(base: int, attempt: int) -> int:
	var x := base if base != 0 else 1
	x ^= (attempt + 1) * 0x9E3779B9
	x = (x * 0x85EBCA6B) & 0x7FFFFFFF
	return x if x != 0 else 1


static func _daily_seed(date_yyyy_mm_dd: String, season_salt: String) -> int:
	# Portable stand-in for SHA256(date+salt) — deterministic across platforms.
	var s := "SHIFTR|%s|%s" % [date_yyyy_mm_dd, season_salt]
	var h := 2166136261
	for i in s.length():
		h ^= s.unicode_at(i)
		h = (h * 16777619) & 0x7FFFFFFF
	return h if h != 0 else 1
