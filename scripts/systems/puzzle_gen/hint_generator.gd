class_name HintGenerator
extends RefCounted
## Progressive hints: direction → line index → full move (GDD §4.2 valve).

var solver: PuzzleSolver = null


func _init(p_solver: PuzzleSolver = null) -> void:
	solver = p_solver if p_solver else PuzzleSolver.new()


func hint(puzzle: PuzzleDef, stage: int = PuzzleGenEnums.HintStage.DIRECTION, current: BoardState = null) -> PuzzleHint:
	assert(puzzle != null)
	var start := current if current else puzzle.build_start_state()
	var goal := puzzle.build_goal_state()
	if puzzle.is_solved_state(start):
		var done := PuzzleHint.new()
		done.stage = stage
		done.blurb = "Already aligned."
		done.legal = false
		return done

	var cmd := _resolve_first_move(puzzle, start, goal)
	if cmd == null:
		var miss := PuzzleHint.new()
		miss.stage = stage
		miss.blurb = "No hint available."
		miss.legal = false
		return miss

	return _from_command(cmd, stage)


func hint_from_states(start: BoardState, goal: BoardState, stage: int = PuzzleGenEnums.HintStage.DIRECTION) -> PuzzleHint:
	solver.max_steps_per_shift = 1
	var result := solver.solve(start, goal)
	if not result.solved or result.path.is_empty():
		var miss := PuzzleHint.new()
		miss.stage = stage
		miss.blurb = "No hint available."
		miss.legal = false
		return miss
	return _from_command(result.path[0], stage)


func _resolve_first_move(puzzle: PuzzleDef, start: BoardState, goal: BoardState) -> BoardCommand:
	if (
		current_matches_start(puzzle, start)
		and not puzzle.hint_first_move.is_empty()
	):
		return BoardCommand.from_dict(puzzle.hint_first_move)

	solver.node_cap = int(puzzle.gen_params.get("solver_node_cap", PuzzleGenEnums.DEFAULT_SOLVER_NODE_CAP))
	solver.max_steps_per_shift = int(puzzle.gen_params.get("max_steps_per_shift", 1))
	var result := solver.solve(start, goal)
	if result.solved and not result.path.is_empty():
		return result.path[0]
	return null


func current_matches_start(puzzle: PuzzleDef, state: BoardState) -> bool:
	return StateFingerprint.from_state(state) == StateFingerprint.from_occupants(
		puzzle.width, puzzle.height, puzzle.start_occupants
	)


func _from_command(cmd: BoardCommand, stage: int) -> PuzzleHint:
	var h := PuzzleHint.new()
	h.stage = clampi(stage, 0, 2)
	h.command = cmd.duplicate_command()
	h.dir = cmd.dir
	h.steps = cmd.steps
	h.legal = true

	if cmd.type == BoardEnums.CommandType.SHIFT_ROW:
		h.axis = &"row"
		h.index = cmd.row
	elif cmd.type == BoardEnums.CommandType.SHIFT_COLUMN:
		h.axis = &"col"
		h.index = cmd.column
	else:
		h.axis = &"other"
		h.index = -1

	match h.stage:
		PuzzleGenEnums.HintStage.DIRECTION:
			h.blurb = "Try a %s shift." % ("row" if h.axis == &"row" else "column")
		PuzzleGenEnums.HintStage.LINE:
			if h.axis == &"row":
				h.blurb = "Focus on row %d." % (h.index + 1)
			else:
				h.blurb = "Focus on column %d." % (h.index + 1)
		_:
			h.blurb = _full_blurb(h)
	return h


func _full_blurb(h: PuzzleHint) -> String:
	var dir_word := ""
	if h.axis == &"row":
		dir_word = "right" if h.dir > 0 else "left"
		return "Shift row %d %s%s." % [
			h.index + 1,
			dir_word,
			(" ×%d" % h.steps) if h.steps > 1 else ""
		]
	dir_word = "down" if h.dir > 0 else "up"
	return "Shift column %d %s%s." % [
		h.index + 1,
		dir_word,
		(" ×%d" % h.steps) if h.steps > 1 else ""
	]


## Verify a hint command is legal on the given board (non-blocked shift).
static func is_legal_on(state: BoardState, cmd: BoardCommand) -> bool:
	if state == null or cmd == null:
		return false
	var sim := BoardSim.new()
	sim.setup(state.duplicate_state())
	return sim.apply(cmd).success
