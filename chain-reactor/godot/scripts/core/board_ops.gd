class_name CRBoard
extends RefCounted

const CRTypes := preload("res://scripts/core/types.gd")


static func get_cell(board: Array, col: int, row: int):
	if not CRTypes.in_bounds(col, row):
		return null
	return board[row][col]


static func empty_tiles(board: Array) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for row in CRTypes.ROWS:
		for col in CRTypes.COLS:
			if board[row][col] == null:
				out.append(Vector2i(col, row))
	return out


static func is_board_full(board: Array) -> bool:
	return empty_tiles(board).is_empty()


static func score_for(board: Array, owner: String) -> int:
	var sum := 0
	for row in CRTypes.ROWS:
		for col in CRTypes.COLS:
			var c = board[row][col]
			if c != null and str(c["owner"]) == owner:
				sum += int(c["power"])
	return sum


static func reset_activations(board: Array) -> void:
	for row in CRTypes.ROWS:
		for col in CRTypes.COLS:
			var c = board[row][col]
			if c != null:
				c["activated"] = false


static func find_first_hit(board: Array, from: Vector2i, dir: String):
	var d: Vector2i = CRTypes.dir_delta(dir)
	var cur := Vector2i(from.x + d.x, from.y + d.y)
	while CRTypes.in_bounds(cur.x, cur.y):
		var card = get_cell(board, cur.x, cur.y)
		if card != null:
			return {"pos": cur, "card": card}
		cur = Vector2i(cur.x + d.x, cur.y + d.y)
	return null
