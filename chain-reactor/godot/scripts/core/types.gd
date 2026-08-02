class_name CRTypes
extends RefCounted

const COLS := 3
const ROWS := 4
const HAND_SIZE := 3
const DECK_SIZE := 10
const MAX_ROUNDS := 6
const TURN_SECONDS := 15.0
const CASCADE_DEPTH_CAP := 4


static func energy_for_round(round: int) -> int:
	# Round 1 starts at 2 so openings aren't dead passes (matches web core).
	var n := clampi(round, 1, MAX_ROUNDS)
	return maxi(2, n)


static func step_multiplier(step: int) -> float:
	if step <= 2:
		return 1.0
	if step == 3:
		return 1.25
	return 1.5


static func dir_delta(dir: String) -> Vector2i:
	match dir:
		"up":
			return Vector2i(0, -1)
		"down":
			return Vector2i(0, 1)
		"left":
			return Vector2i(-1, 0)
		"right":
			return Vector2i(1, 0)
	return Vector2i.ZERO


static func turn_clockwise(dir: String) -> String:
	match dir:
		"up":
			return "right"
		"right":
			return "down"
		"down":
			return "left"
		"left":
			return "up"
	return dir


static func turn_counter_clockwise(dir: String) -> String:
	match dir:
		"up":
			return "left"
		"left":
			return "down"
		"down":
			return "right"
		"right":
			return "up"
	return dir


static func is_vertical(dir: String) -> bool:
	return dir == "up" or dir == "down"


static func in_bounds(col: int, row: int) -> bool:
	return col >= 0 and col < COLS and row >= 0 and row < ROWS


static func empty_board() -> Array:
	var board: Array = []
	for _r in ROWS:
		var row: Array = []
		for _c in COLS:
			row.append(null)
		board.append(row)
	return board


static func clone_board(board: Array) -> Array:
	var out: Array = []
	for r in board.size():
		var row: Array = []
		for c in board[r].size():
			var cell = board[r][c]
			if cell == null:
				row.append(null)
			else:
				row.append((cell as Dictionary).duplicate(true))
		out.append(row)
	return out


static func list_arrows(arrows: Dictionary) -> Array[String]:
	var out: Array[String] = []
	if bool(arrows.get("up", false)):
		out.append("up")
	if bool(arrows.get("down", false)):
		out.append("down")
	if bool(arrows.get("left", false)):
		out.append("left")
	if bool(arrows.get("right", false)):
		out.append("right")
	return out


static func arrows_from(dirs: Array[String]) -> Dictionary:
	var a := {"up": false, "down": false, "left": false, "right": false}
	for d in dirs:
		a[d] = true
	return a
