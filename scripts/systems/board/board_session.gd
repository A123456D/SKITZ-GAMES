class_name BoardSession
extends RefCounted
## Public facade: BoardSim + MoveHistory + serialization.
## Views bind to `events_emitted`. Network peers apply the same BoardCommand stream.

signal events_emitted(events: Array)

var config: BoardConfig = null
var sim: BoardSim = null
var history: MoveHistory = null
var meta: Dictionary = {}
var _next_command_id: int = 1


func setup_from_config(p_config: BoardConfig) -> void:
	assert(p_config != null)
	config = p_config
	var state := BoardState.create(p_config.width, p_config.height)
	_wire(state, p_config.history_capacity, p_config.checkpoint_interval)


func setup_from_state(p_state: BoardState, p_config: BoardConfig = null) -> void:
	assert(p_state != null)
	if p_config == null:
		config = BoardConfig.new()
		config.width = p_state.width
		config.height = p_state.height
	else:
		config = p_config
	_wire(p_state, config.history_capacity, config.checkpoint_interval)


func _wire(state: BoardState, hist_cap: int, cp_interval: int) -> void:
	sim = BoardSim.new()
	sim.setup(state)
	history = MoveHistory.new()
	history.setup(hist_cap, cp_interval)
	_next_command_id = 1


func get_state() -> BoardState:
	return sim.state if sim else null


func get_width() -> int:
	return sim.state.width if sim else 0


func get_height() -> int:
	return sim.state.height if sim else 0


## Apply a player/network command. Records history on success. Returns SimResult.
func apply(cmd: BoardCommand, record: bool = true) -> SimResult:
	assert(sim != null and cmd != null)
	if cmd.command_id == 0:
		cmd.command_id = _next_command_id
		_next_command_id += 1
	else:
		_next_command_id = maxi(_next_command_id, cmd.command_id + 1)

	var result := sim.apply(cmd)
	_emit(result.events)
	if result.success and record:
		history.record(cmd, result.previous_tile, sim.state)
	return result


func shift_row(row: int, dir: int, steps: int = 1) -> SimResult:
	return apply(BoardCommand.shift_row(row, dir, steps))


func shift_column(column: int, dir: int, steps: int = 1) -> SimResult:
	return apply(BoardCommand.shift_column(column, dir, steps))


func rotate_board(turns: int = 1) -> SimResult:
	return apply(BoardCommand.rotate(turns))


func set_tile(tile: BoardTileData) -> SimResult:
	return apply(BoardCommand.set_tile(tile))


## Puzzle-layer axis-lock cycle: write tiles as one undoable unit (BoardSim shift skipped).
func apply_axis_cycle(
	cmd: BoardCommand,
	writes: Array,
	moves: Array,
	record: bool = true,
	cycle_meta: Dictionary = {}
) -> SimResult:
	assert(sim != null and cmd != null)
	if cmd.command_id == 0:
		cmd.command_id = _next_command_id
		_next_command_id += 1
	else:
		_next_command_id = maxi(_next_command_id, cmd.command_id + 1)

	var typed_moves: Array[TileMove] = []
	for m in moves:
		if m is TileMove:
			typed_moves.append(m as TileMove)

	if writes.is_empty():
		var empty := SimResult.ok([SimEvent.shift_settled(cmd, typed_moves)], typed_moves)
		_emit(empty.events)
		return empty

	var prevs: Array = []
	for w in writes:
		if not (w is BoardTileData):
			continue
		var wt := w as BoardTileData
		prevs.append(sim.state.get_tile(wt.x, wt.y).duplicate_tile())
		sim.state.set_tile(wt.x, wt.y, wt.duplicate_tile())

	var result := SimResult.ok([SimEvent.shift_settled(cmd, typed_moves)], typed_moves)
	_emit(result.events)
	if record:
		history.record(cmd, null, sim.state, prevs, writes, cycle_meta)
	return result


func can_undo() -> bool:
	return history != null and history.can_undo()


func can_redo() -> bool:
	return history != null and history.can_redo()


func undo() -> SimResult:
	if not can_undo():
		var r := SimResult.rejected(&"nothing_to_undo")
		_emit(r.events)
		return r
	var entry := history.mark_undone()
	if entry.previous_tiles.size() > 0:
		for t in entry.previous_tiles:
			if t is BoardTileData:
				var pt := t as BoardTileData
				sim.state.set_tile(pt.x, pt.y, pt.duplicate_tile())
		_restore_cycle_connections(entry, true)
		var cycle_undo := SimResult.ok([SimEvent.undo_applied(entry.command, [])], [])
		_emit(cycle_undo.events)
		return cycle_undo
	var inv := history.build_inverse_command(entry)
	# Apply inverse without recording a new history entry.
	var result := sim.apply(inv)
	if not result.success:
		# Roll undo cursor back — should not happen for invertible ops.
		history.mark_redone()
		_emit(result.events)
		return result
	var events: Array[SimEvent] = [SimEvent.undo_applied(inv, result.moves)]
	result.events = events
	_emit(events)
	return result


func redo() -> SimResult:
	if not can_redo():
		var r := SimResult.rejected(&"nothing_to_redo")
		_emit(r.events)
		return r
	var entry := history.mark_redone()
	if entry.redo_tiles.size() > 0:
		for t in entry.redo_tiles:
			if t is BoardTileData:
				var rt := t as BoardTileData
				sim.state.set_tile(rt.x, rt.y, rt.duplicate_tile())
		_restore_cycle_connections(entry, false)
		var cycle_redo := SimResult.ok([SimEvent.redo_applied(entry.command, [])], [])
		_emit(cycle_redo.events)
		return cycle_redo
	var result := sim.apply(entry.command)
	if not result.success:
		history.mark_undone()
		_emit(result.events)
		return result
	var events: Array[SimEvent] = [SimEvent.redo_applied(entry.command, result.moves)]
	result.events = events
	_emit(events)
	return result


func _restore_cycle_connections(entry: HistoryEntry, undo: bool) -> void:
	if entry == null or entry.cycle_meta.is_empty() or entry.command == null or sim == null:
		return
	var movable: Array = entry.cycle_meta.get("movable", [])
	var k := int(entry.cycle_meta.get("k", 0))
	var is_row := bool(entry.cycle_meta.get("is_row", false))
	var n: int = movable.size()
	if n <= 0 or k == 0:
		return
	if undo:
		k = posmod(-k, n)
	var map_from_to: Dictionary = {}
	for i in n:
		map_from_to[int(movable[i])] = int(movable[(i + k) % n])
	var cmd := entry.command
	for tile in sim.state.cells:
		for c in tile.connections:
			if is_row:
				if c.to_y != cmd.row:
					continue
				if map_from_to.has(c.to_x):
					c.to_x = int(map_from_to[c.to_x])
			else:
				if c.to_x != cmd.column:
					continue
				if map_from_to.has(c.to_y):
					c.to_y = int(map_from_to[c.to_y])


func save_dict() -> Dictionary:
	return BoardSerializer.to_dict(sim.state, history, meta)


func save_json(pretty: bool = false) -> String:
	return BoardSerializer.to_json(sim.state, history, meta, pretty)


func load_dict(data: Dictionary) -> Error:
	var parsed := BoardSerializer.from_dict(data)
	return _install_parsed(parsed)


func load_json(json_text: String) -> Error:
	return _install_parsed(BoardSerializer.from_json(json_text))


func save_to_file(path: String) -> Error:
	return BoardSerializer.save_to_file(path, sim.state, history, meta)


func load_from_file(path: String) -> Error:
	var parsed := BoardSerializer.load_from_file(path)
	if not parsed["ok"] and parsed.get("error", "") == "file_missing":
		push_error("BoardSession.load_from_file: file_missing")
		return ERR_FILE_CANT_OPEN
	return _install_parsed(parsed)


func _install_parsed(parsed: Dictionary) -> Error:
	if not parsed["ok"]:
		push_error("BoardSession load failed: %s" % parsed.get("error", "unknown"))
		return ERR_INVALID_DATA
	var state: BoardState = parsed["state"]
	if config == null:
		config = BoardConfig.new()
	config.width = state.width
	config.height = state.height
	sim = BoardSim.new()
	sim.setup(state)
	if parsed["history"] != null:
		history = parsed["history"]
	else:
		history = MoveHistory.new()
		history.setup(config.history_capacity, config.checkpoint_interval)
	meta = parsed["meta"] if parsed["meta"] is Dictionary else {}
	_emit([SimEvent.board_replaced()])
	return OK


## Multiplayer helper: apply a remote command identically (still records history).
func apply_network_command(cmd_dict: Dictionary) -> SimResult:
	return apply(BoardCommand.from_dict(cmd_dict), true)


func _emit(events: Array) -> void:
	if events.is_empty():
		return
	events_emitted.emit(events)
