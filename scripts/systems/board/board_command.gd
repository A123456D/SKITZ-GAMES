class_name BoardCommand
extends RefCounted
## Serializable, ordered board operation. Same command stream + same initial state
## â‡’ identical BoardState on every peer (no clocks / unseeded RNG in apply).

var type: int = BoardEnums.CommandType.SHIFT_ROW
## Monotonic id assigned by session / network layer (0 = unset).
var command_id: int = 0
## Optional seeded RNG input for future cascade/spawn commands. -1 = unused.
var rng_seed: int = -1

# --- payload fields (only relevant subset used per type) ---
var row: int = 0
var column: int = 0
var dir: int = BoardEnums.Direction.POSITIVE
var steps: int = 1
var turns: int = 1 ## ROTATE: clockwise quarter-turns
var tile: BoardTileData = null ## SET_TILE


static func shift_row(p_row: int, p_dir: int, p_steps: int = 1) -> BoardCommand:
	var c := BoardCommand.new()
	c.type = BoardEnums.CommandType.SHIFT_ROW
	c.row = p_row
	c.dir = p_dir
	c.steps = p_steps
	return c


static func shift_column(p_column: int, p_dir: int, p_steps: int = 1) -> BoardCommand:
	var c := BoardCommand.new()
	c.type = BoardEnums.CommandType.SHIFT_COLUMN
	c.column = p_column
	c.dir = p_dir
	c.steps = p_steps
	return c


static func rotate(p_turns: int = 1) -> BoardCommand:
	var c := BoardCommand.new()
	c.type = BoardEnums.CommandType.ROTATE
	c.turns = p_turns
	return c


static func set_tile(p_tile: BoardTileData) -> BoardCommand:
	var c := BoardCommand.new()
	c.type = BoardEnums.CommandType.SET_TILE
	c.tile = p_tile.duplicate_tile() if p_tile else null
	return c


func inverse() -> BoardCommand:
	match type:
		BoardEnums.CommandType.SHIFT_ROW:
			return shift_row(row, -dir, steps)
		BoardEnums.CommandType.SHIFT_COLUMN:
			return shift_column(column, -dir, steps)
		BoardEnums.CommandType.ROTATE:
			# 90Â° CW * t  inverted by 90Â° CW * (4 - t mod 4)
			return rotate(posmod(4 - posmod(turns, 4), 4))
		BoardEnums.CommandType.SET_TILE:
			# Inverse requires previous tile snapshot â€” MoveHistory stores that delta.
			push_error("BoardCommand.SET_TILE.inverse() requires history delta; use MoveHistory")
			return null
		_:
			push_error("Unknown command type for inverse: %s" % type)
			return null


func is_invertible_without_delta() -> bool:
	return (
		type == BoardEnums.CommandType.SHIFT_ROW
		or type == BoardEnums.CommandType.SHIFT_COLUMN
		or type == BoardEnums.CommandType.ROTATE
	)


func duplicate_command() -> BoardCommand:
	var c := BoardCommand.new()
	c.type = type
	c.command_id = command_id
	c.rng_seed = rng_seed
	c.row = row
	c.column = column
	c.dir = dir
	c.steps = steps
	c.turns = turns
	c.tile = tile.duplicate_tile() if tile else null
	return c


func to_dict() -> Dictionary:
	var d := {
		"type": type,
		"command_id": command_id,
		"rng_seed": rng_seed,
		"row": row,
		"column": column,
		"dir": dir,
		"steps": steps,
		"turns": turns,
	}
	if tile != null:
		d["tile"] = tile.to_dict()
	return d


static func from_dict(data: Dictionary) -> BoardCommand:
	var c := BoardCommand.new()
	c.type = int(data.get("type", BoardEnums.CommandType.SHIFT_ROW))
	c.command_id = int(data.get("command_id", 0))
	c.rng_seed = int(data.get("rng_seed", -1))
	c.row = int(data.get("row", 0))
	c.column = int(data.get("column", 0))
	c.dir = int(data.get("dir", 1))
	c.steps = int(data.get("steps", 1))
	c.turns = int(data.get("turns", 1))
	if data.has("tile") and data["tile"] is Dictionary:
		c.tile = BoardTileData.from_dict(data["tile"])
	return c


func describe() -> String:
	match type:
		BoardEnums.CommandType.SHIFT_ROW:
			return "ShiftRow(y=%d, dir=%d, steps=%d)" % [row, dir, steps]
		BoardEnums.CommandType.SHIFT_COLUMN:
			return "ShiftCol(x=%d, dir=%d, steps=%d)" % [column, dir, steps]
		BoardEnums.CommandType.ROTATE:
			return "Rotate(turns=%d)" % turns
		BoardEnums.CommandType.SET_TILE:
			return "SetTile(%d,%d)" % [tile.x if tile else -1, tile.y if tile else -1]
		_:
			return "Command(type=%d)" % type
