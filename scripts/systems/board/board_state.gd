class_name BoardState
extends RefCounted
## Pure grid snapshot. Mutated only by BoardSim command application.
## Flat Array storage for cache-friendly O(1) index and O(n) row/col slides.

var width: int = 0
var height: int = 0
## Flat row-major BoardTileData: index = y * width + x
var cells: Array[BoardTileData] = []


func setup(p_width: int, p_height: int, fill_empty: bool = true) -> void:
	assert(p_width > 0 and p_height > 0)
	width = p_width
	height = p_height
	cells.clear()
	cells.resize(width * height)
	if fill_empty:
		for y in height:
			for x in width:
				var t := BoardTileData.new()
				t.x = x
				t.y = y
				cells[_index(x, y)] = t


static func create(p_width: int, p_height: int) -> BoardState:
	var s := BoardState.new()
	s.setup(p_width, p_height, true)
	return s


func cell_count() -> int:
	return width * height


func in_bounds(x: int, y: int) -> bool:
	return x >= 0 and y >= 0 and x < width and y < height


func _index(x: int, y: int) -> int:
	return y * width + x


func get_tile(x: int, y: int) -> BoardTileData:
	assert(in_bounds(x, y))
	return cells[_index(x, y)]


func set_tile(x: int, y: int, tile: BoardTileData) -> void:
	assert(in_bounds(x, y))
	assert(tile != null)
	tile.x = x
	tile.y = y
	cells[_index(x, y)] = tile


func fill_occupants_row_major(ids: Array) -> void:
	assert(ids.size() == cell_count())
	var i := 0
	for y in height:
		for x in width:
			var t := get_tile(x, y)
			t.occupant_id = StringName(str(ids[i]))
			i += 1


func duplicate_state() -> BoardState:
	var s := BoardState.new()
	s.width = width
	s.height = height
	s.cells = []
	s.cells.resize(cells.size())
	for i in cells.size():
		s.cells[i] = cells[i].duplicate_tile()
	return s


## Circular row shift. dir: +1 right, -1 left. steps modulo width.
## Locked tiles (LOCKED flag) block the entire row shift â€” returns empty moves.
func shift_row(y: int, dir: int, steps: int = 1) -> Array[TileMove]:
	assert(y >= 0 and y < height)
	assert(dir == 1 or dir == -1)
	var moves: Array[TileMove] = []
	if width <= 1 or steps == 0:
		return moves
	if _row_has_blocking(y):
		return moves

	var n := width
	var k := posmod(dir * steps, n)
	if k == 0:
		return moves

	var old_tiles: Array[BoardTileData] = []
	old_tiles.resize(n)
	for x in n:
		old_tiles[x] = get_tile(x, y).duplicate_tile()

	for x in n:
		var from_x := x
		var to_x := (x + k) % n
		# k is always in [0, n) after posmod; wrap iff the unwrapped index crossed n.
		var wrapped := from_x + k >= n
		var src := old_tiles[from_x]
		moves.append(
			TileMove.make(from_x, y, to_x, y, src.occupant_id, wrapped, _index(from_x, y))
		)

	for x in n:
		var from_x := posmod(x - k, n)
		var tile: BoardTileData = old_tiles[from_x].duplicate_tile()
		tile.x = x
		tile.y = y
		cells[_index(x, y)] = tile

	_remap_all_connections_row_shift(y, k, n)
	return moves


## Circular column shift. dir: +1 down, -1 up.
func shift_column(x: int, dir: int, steps: int = 1) -> Array[TileMove]:
	assert(x >= 0 and x < width)
	assert(dir == 1 or dir == -1)
	var moves: Array[TileMove] = []
	if height <= 1 or steps == 0:
		return moves
	if _column_has_blocking(x):
		return moves

	var n := height
	var k := posmod(dir * steps, n)
	if k == 0:
		return moves

	var old_tiles: Array[BoardTileData] = []
	old_tiles.resize(n)
	for y in n:
		old_tiles[y] = get_tile(x, y).duplicate_tile()

	for y in n:
		var from_y := y
		var to_y := (y + k) % n
		var wrapped := from_y + k >= n
		var src := old_tiles[from_y]
		moves.append(
			TileMove.make(x, from_y, x, to_y, src.occupant_id, wrapped, _index(x, from_y))
		)

	for y in n:
		var from_y := posmod(y - k, n)
		var tile: BoardTileData = old_tiles[from_y].duplicate_tile()
		tile.x = x
		tile.y = y
		cells[_index(x, y)] = tile

	_remap_all_connections_col_shift(x, k, n)
	return moves


## Rotate the board 90Â° clockwise `turns` times (mod 4). Non-square swaps width/height.
func rotate_cw(turns: int = 1) -> Array[TileMove]:
	var t := posmod(turns, 4)
	var moves: Array[TileMove] = []
	if t == 0:
		return moves

	var old := duplicate_state()
	for _i in t:
		_rotate_cw_once()

	# Emit moves relative to original â†’ final (presentation can intermediate if desired).
	for y in old.height:
		for x in old.width:
			var dest := _map_rotate_cw(x, y, old.width, old.height, t)
			var src := old.get_tile(x, y)
			moves.append(
				TileMove.make(
					x, y, dest.x, dest.y, src.occupant_id, false, old._index(x, y)
				)
			)
	return moves


func _rotate_cw_once() -> void:
	var old_w := width
	var old_h := height
	var old_cells := cells
	width = old_h
	height = old_w
	cells = []
	cells.resize(width * height)
	for y in old_h:
		for x in old_w:
			var src: BoardTileData = old_cells[y * old_w + x]
			var nx := old_h - 1 - y
			var ny := x
			var tile: BoardTileData = src.duplicate_tile()
			tile.x = nx
			tile.y = ny
			_remap_connections_after_rotate_cw(tile, old_w, old_h)
			cells[ny * width + nx] = tile


static func _map_rotate_cw(x: int, y: int, w: int, h: int, turns: int) -> Vector2i:
	var cx := x
	var cy := y
	var cw := w
	var ch := h
	for _i in posmod(turns, 4):
		var nx := ch - 1 - cy
		var ny := cx
		cx = nx
		cy = ny
		var tmp := cw
		cw = ch
		ch = tmp
	return Vector2i(cx, cy)


func _row_has_blocking(y: int) -> bool:
	for x in width:
		var tile := get_tile(x, y)
		if tile.has_flag(BoardEnums.TileStateFlags.LOCKED) or tile.has_flag(BoardEnums.TileStateFlags.FROZEN):
			return true
	return false


func _column_has_blocking(x: int) -> bool:
	for y in height:
		var tile := get_tile(x, y)
		if tile.has_flag(BoardEnums.TileStateFlags.LOCKED) or tile.has_flag(BoardEnums.TileStateFlags.FROZEN):
			return true
	return false


func _remap_all_connections_row_shift(row_y: int, k: int, n: int) -> void:
	for tile in cells:
		for c in tile.connections:
			if c.to_y == row_y:
				c.to_x = (c.to_x + k) % n


func _remap_all_connections_col_shift(col_x: int, k: int, n: int) -> void:
	for tile in cells:
		for c in tile.connections:
			if c.to_x == col_x:
				c.to_y = (c.to_y + k) % n


func _remap_connections_after_rotate_cw(tile: BoardTileData, old_w: int, old_h: int) -> void:
	for c in tile.connections:
		var mapped := _map_rotate_cw(c.to_x, c.to_y, old_w, old_h, 1)
		c.to_x = mapped.x
		c.to_y = mapped.y


func occupants_grid() -> Array:
	var grid: Array = []
	for y in height:
		var row: Array = []
		for x in width:
			row.append(String(get_tile(x, y).occupant_id))
		grid.append(row)
	return grid


func content_equals(other: BoardState) -> bool:
	if other == null:
		return false
	if width != other.width or height != other.height:
		return false
	for i in cells.size():
		if not cells[i].content_equals(other.cells[i]):
			return false
	return true


func to_dict() -> Dictionary:
	var cell_dicts: Array = []
	for c in cells:
		cell_dicts.append(c.to_dict())
	return {
		"width": width,
		"height": height,
		"cells": cell_dicts,
	}


static func from_dict(data: Dictionary) -> BoardState:
	var s := BoardState.new()
	s.width = int(data.get("width", 0))
	s.height = int(data.get("height", 0))
	s.cells = []
	var expected := s.width * s.height
	s.cells.resize(expected)
	var arr: Variant = data.get("cells", [])
	assert(arr is Array and arr.size() == expected)
	for i in expected:
		var tile: BoardTileData = BoardTileData.from_dict(arr[i] as Dictionary)
		var x := i % s.width
		var y := int(i / s.width)
		tile.x = x
		tile.y = y
		s.cells[i] = tile
	return s
