class_name AxisLockFilter
extends RefCounted
## Puzzle-layer gate for AxisLockComponent. Never mutates BoardSim internals.
## Pre-check: row/col shifts that would move locked objects off-axis are rewritten
## into a cycle-around-fixed plan (set_tile writes + TileMoves) when possible.
## Resolve: drop magnet/gravity/ice moves that violate axis lock.

const REJECT_REASON := &"axis_lock"
const CYCLE_REASON := &"axis_lock_cycle"
const AxisLockComponentScript := preload("res://scripts/systems/puzzle/components/axis_lock_component.gd")


## True if the command may proceed (passthrough shift or cycle-around rewrite).
static func allows_command(engine: PuzzleEngine, cmd: BoardCommand) -> bool:
	return blocks_command(engine, cmd) == &""


static func blocks_command(engine: PuzzleEngine, cmd: BoardCommand) -> StringName:
	if engine == null or cmd == null:
		return &""
	if cmd.type != BoardEnums.CommandType.SHIFT_ROW and cmd.type != BoardEnums.CommandType.SHIFT_COLUMN:
		return &""
	var plan := plan_cycle_around_locks(engine, cmd)
	if plan.is_empty():
		return &""
	if bool(plan.get("reject", false)):
		return REJECT_REASON
	return &""


## Empty = normal BoardSim shift. Else reject / cycle plan.
static func plan_cycle_around_locks(engine: PuzzleEngine, cmd: BoardCommand) -> Dictionary:
	if engine == null or cmd == null:
		return {}
	if cmd.type != BoardEnums.CommandType.SHIFT_ROW and cmd.type != BoardEnums.CommandType.SHIFT_COLUMN:
		return {}
	var board := engine.session.get_state() if engine.session else null
	if board == null:
		return {}
	engine.world.rebuild_from_board(board)

	var fixed: Array[int] = []
	var is_row := cmd.type == BoardEnums.CommandType.SHIFT_ROW
	if is_row:
		for x in board.width:
			if _blocks_command_type(engine.world.get_at(Vector2i(x, cmd.row)), cmd.type):
				fixed.append(x)
	else:
		for y in board.height:
			if _blocks_command_type(engine.world.get_at(Vector2i(cmd.column, y)), cmd.type):
				fixed.append(y)

	if fixed.is_empty():
		return {}

	var line_len := board.width if is_row else board.height
	var movable: Array[int] = []
	for i in line_len:
		if not fixed.has(i):
			movable.append(i)
	if movable.is_empty():
		return {"reject": true}

	var n := movable.size()
	var k := posmod(cmd.dir * cmd.steps, n)
	if k == 0:
		return {"writes": [], "moves": [], "noop": true}

	var writes: Array[BoardTileData] = []
	var moves: Array[TileMove] = []
	var old_tiles: Array[BoardTileData] = []
	old_tiles.resize(line_len)
	if is_row:
		for x in line_len:
			old_tiles[x] = board.get_tile(x, cmd.row).duplicate_tile()
	else:
		for y in line_len:
			old_tiles[y] = board.get_tile(cmd.column, y).duplicate_tile()

	for i in n:
		var from_i: int = movable[i]
		var to_i: int = movable[(i + k) % n]
		var src: BoardTileData = old_tiles[from_i]
		var wrapped := i + k >= n
		if is_row:
			moves.append(TileMove.make(
				from_i, cmd.row, to_i, cmd.row, src.occupant_id, wrapped, from_i + cmd.row * board.width
			))
		else:
			moves.append(TileMove.make(
				cmd.column, from_i, cmd.column, to_i, src.occupant_id, wrapped, cmd.column + from_i * board.width
			))

	for i in line_len:
		if fixed.has(i):
			continue
		var slot := movable.find(i)
		var from_slot := posmod(slot - k, n)
		var from_i2: int = movable[from_slot]
		var tile: BoardTileData = old_tiles[from_i2].duplicate_tile()
		if is_row:
			tile.x = i
			tile.y = cmd.row
		else:
			tile.x = cmd.column
			tile.y = i
		writes.append(tile)

	return {
		"writes": writes,
		"moves": moves,
		"noop": false,
		"reason": String(CYCLE_REASON),
		"movable": movable,
		"k": k,
		"is_row": is_row,
	}


static func remap_connections_for_cycle(
	board: BoardState,
	cmd: BoardCommand,
	movable: Array,
	k: int,
	is_row: bool
) -> void:
	if board == null or movable.is_empty() or k == 0:
		return
	var n: int = movable.size()
	var map_from_to: Dictionary = {}
	for i in n:
		map_from_to[int(movable[i])] = int(movable[(i + k) % n])
	for tile in board.cells:
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


static func blocks_move(obj: PuzzleObject, from: Vector2i, to: Vector2i) -> bool:
	if obj == null:
		return false
	var lock = _axis_lock(obj)
	if lock == null:
		return false
	return not lock.allows_delta(to.x - from.x, to.y - from.y)


static func correct_after_shift(engine: PuzzleEngine, board_result: SimResult) -> int:
	if engine == null or board_result == null or not board_result.success:
		return 0
	if board_result.moves.is_empty():
		return 0
	var board := engine.session.get_state() if engine.session else null
	if board == null:
		return 0
	engine.world.rebuild_from_board(board)
	var corrected := 0
	for m in board_result.moves:
		if not (m is TileMove):
			continue
		var tm := m as TileMove
		if tm.from_x == tm.to_x and tm.from_y == tm.to_y:
			continue
		var to := Vector2i(tm.to_x, tm.to_y)
		var from := Vector2i(tm.from_x, tm.from_y)
		var obj := engine.world.get_at(to)
		if obj == null:
			continue
		if not blocks_move(obj, from, to):
			continue
		if _swap_occupants(engine.world, board, from, to):
			corrected += 1
	if corrected > 0:
		engine.world.flush_to_board(board)
	return corrected


static func _blocks_command_type(obj: PuzzleObject, command_type: int) -> bool:
	var lock = _axis_lock(obj)
	if lock == null:
		return false
	return not lock.allows_command_type(command_type)


static func _axis_lock(obj: PuzzleObject):
	if obj == null:
		return null
	var c: Variant = obj.get_component(&"axis_lock")
	if c == null:
		return null
	if c.get_script() == AxisLockComponentScript or c.has_method("allows_command_type"):
		return c
	return null


static func _swap_occupants(world: PuzzleWorld, board: BoardState, a: Vector2i, b: Vector2i) -> bool:
	if a == b:
		return false
	var oa := world.get_at(a)
	var ob := world.get_at(b)
	if oa == null and ob == null:
		return false
	if oa:
		world.cell_index.erase(a)
	if ob:
		world.cell_index.erase(b)
	var tile_a := board.get_tile(a.x, a.y)
	var tile_b := board.get_tile(b.x, b.y)
	var blob_a: Dictionary = PuzzleTile.get_blob(tile_a).duplicate(true) if oa else {}
	var blob_b: Dictionary = PuzzleTile.get_blob(tile_b).duplicate(true) if ob else {}
	var id_a: StringName = tile_a.occupant_id if oa else BoardEnums.EMPTY_OCCUPANT
	var id_b: StringName = tile_b.occupant_id if ob else BoardEnums.EMPTY_OCCUPANT
	PuzzleTile.remove_object(tile_a)
	PuzzleTile.remove_object(tile_b)
	if ob:
		tile_a.occupant_id = id_b
		PuzzleTile.set_blob(tile_a, blob_b)
		ob.cell = a
		world.cell_index[a] = ob.uid
	if oa:
		tile_b.occupant_id = id_a
		PuzzleTile.set_blob(tile_b, blob_a)
		oa.cell = b
		world.cell_index[b] = oa.uid
	return true
