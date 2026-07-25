class_name BoardSim
extends RefCounted
## Deterministic command executor. Mutates BoardState; emits SimEvents for views.
## No Time.*, no unseeded rand — RNG only via command.rng_seed when a future op needs it.

var state: BoardState = null


func setup(p_state: BoardState) -> void:
	assert(p_state != null)
	state = p_state


func apply(cmd: BoardCommand) -> SimResult:
	assert(state != null)
	assert(cmd != null)
	match cmd.type:
		BoardEnums.CommandType.SHIFT_ROW:
			return _apply_shift_row(cmd)
		BoardEnums.CommandType.SHIFT_COLUMN:
			return _apply_shift_column(cmd)
		BoardEnums.CommandType.ROTATE:
			return _apply_rotate(cmd)
		BoardEnums.CommandType.SET_TILE:
			return _apply_set_tile(cmd)
		_:
			return SimResult.rejected(&"unknown_command", cmd)


func _apply_shift_row(cmd: BoardCommand) -> SimResult:
	if cmd.row < 0 or cmd.row >= state.height:
		return SimResult.rejected(&"row_oob", cmd)
	if cmd.dir != 1 and cmd.dir != -1:
		return SimResult.rejected(&"bad_dir", cmd)
	if cmd.steps < 0:
		return SimResult.rejected(&"bad_steps", cmd)

	var moves := state.shift_row(cmd.row, cmd.dir, cmd.steps)
	if moves.is_empty() and cmd.steps != 0 and state.width > 1:
		# Empty with non-trivial request ⇒ blocked (locked/frozen) or no-op mod width.
		var k := posmod(cmd.dir * cmd.steps, state.width)
		if k != 0:
			return SimResult.rejected(&"row_blocked", cmd)

	var events: Array[SimEvent] = [SimEvent.shift_settled(cmd, moves)]
	return SimResult.ok(events, moves)


func _apply_shift_column(cmd: BoardCommand) -> SimResult:
	if cmd.column < 0 or cmd.column >= state.width:
		return SimResult.rejected(&"col_oob", cmd)
	if cmd.dir != 1 and cmd.dir != -1:
		return SimResult.rejected(&"bad_dir", cmd)
	if cmd.steps < 0:
		return SimResult.rejected(&"bad_steps", cmd)

	var moves := state.shift_column(cmd.column, cmd.dir, cmd.steps)
	if moves.is_empty() and cmd.steps != 0 and state.height > 1:
		var k := posmod(cmd.dir * cmd.steps, state.height)
		if k != 0:
			return SimResult.rejected(&"col_blocked", cmd)

	var events: Array[SimEvent] = [SimEvent.shift_settled(cmd, moves)]
	return SimResult.ok(events, moves)


func _apply_rotate(cmd: BoardCommand) -> SimResult:
	var moves := state.rotate_cw(cmd.turns)
	var events: Array[SimEvent] = [SimEvent.rotate_settled(cmd, moves)]
	return SimResult.ok(events, moves)


func _apply_set_tile(cmd: BoardCommand) -> SimResult:
	if cmd.tile == null:
		return SimResult.rejected(&"null_tile", cmd)
	if not state.in_bounds(cmd.tile.x, cmd.tile.y):
		return SimResult.rejected(&"tile_oob", cmd)
	var prev := state.get_tile(cmd.tile.x, cmd.tile.y).duplicate_tile()
	state.set_tile(cmd.tile.x, cmd.tile.y, cmd.tile.duplicate_tile())
	var result := SimResult.ok([SimEvent.tile_set(cmd)])
	result.previous_tile = prev
	return result
