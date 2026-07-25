class_name AlignStateCodec
extends RefCounted
## Lightweight Align layout ops for the solver (no BoardTileData / history overhead).

static func from_board(state: BoardState) -> PackedStringArray:
	var out := PackedStringArray()
	out.resize(state.cell_count())
	var i := 0
	for y in state.height:
		for x in state.width:
			out[i] = String(state.get_tile(x, y).occupant_id)
			i += 1
	return out


static func key(occupants: PackedStringArray) -> String:
	return "|".join(occupants)


static func equals(a: PackedStringArray, b: PackedStringArray) -> bool:
	if a.size() != b.size():
		return false
	for i in a.size():
		if a[i] != b[i]:
			return false
	return true


static func shift_row(occupants: PackedStringArray, width: int, height: int, row: int, dir: int, steps: int) -> PackedStringArray:
	var out := occupants.duplicate()
	if width <= 1 or steps == 0:
		return out
	var k := posmod(dir * steps, width)
	if k == 0:
		return out
	var base := row * width
	var buf: PackedStringArray = PackedStringArray()
	buf.resize(width)
	for x in width:
		buf[x] = out[base + x]
	for x in width:
		out[base + x] = buf[posmod(x - k, width)]
	return out


static func shift_col(occupants: PackedStringArray, width: int, height: int, col: int, dir: int, steps: int) -> PackedStringArray:
	var out := occupants.duplicate()
	if height <= 1 or steps == 0:
		return out
	var k := posmod(dir * steps, height)
	if k == 0:
		return out
	var buf: PackedStringArray = PackedStringArray()
	buf.resize(height)
	for y in height:
		buf[y] = out[y * width + col]
	for y in height:
		out[y * width + col] = buf[posmod(y - k, height)]
	return out


static func legal_moves(width: int, height: int, max_steps: int) -> Array[BoardCommand]:
	var moves: Array[BoardCommand] = []
	var step_cap := maxi(1, max_steps)
	for y in height:
		for d in [1, -1]:
			for s in range(1, step_cap + 1):
				if posmod(s, width) == 0:
					continue
				moves.append(BoardCommand.shift_row(y, d, s))
	for x in width:
		for d in [1, -1]:
			for s in range(1, step_cap + 1):
				if posmod(s, height) == 0:
					continue
				moves.append(BoardCommand.shift_column(x, d, s))
	return moves


static func apply_cmd(occupants: PackedStringArray, width: int, height: int, cmd: BoardCommand) -> PackedStringArray:
	match cmd.type:
		BoardEnums.CommandType.SHIFT_ROW:
			return shift_row(occupants, width, height, cmd.row, cmd.dir, cmd.steps)
		BoardEnums.CommandType.SHIFT_COLUMN:
			return shift_col(occupants, width, height, cmd.column, cmd.dir, cmd.steps)
		_:
			return occupants.duplicate()
