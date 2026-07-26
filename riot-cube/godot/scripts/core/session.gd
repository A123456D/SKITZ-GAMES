class_name RiotSession
extends RefCounted

signal changed

var level: Dictionary
var board: Array = []
var moves_left: int = 0
var score: int = 0
var goals: Array = []
var status: String = "playing" ## playing | won | lost
var combo_peak: int = 0
var rng: Callable
var last_twist: Dictionary = {}
var busy: bool = false


static func stars_for_score(p_score: int, thresholds: Array) -> int:
	if p_score >= int(thresholds[2]):
		return 3
	if p_score >= int(thresholds[1]):
		return 2
	if p_score >= int(thresholds[0]):
		return 1
	return 0


static func hash_id(id: String) -> int:
	var h := 2166136261
	for i in id.length():
		h = (h ^ id.unicode_at(i)) * 16777619
		h = h & 0xFFFFFFFF
	return h


func start(p_level: Dictionary) -> void:
	level = p_level.duplicate(true)
	var seed := int(level.get("seed", hash_id(str(level.get("id", "level")))))
	rng = RiotBoard.mulberry32(seed ^ 0x9E3779B9)
	if level.has("board"):
		board = RiotBoard.clone_board(level["board"])
	else:
		board = RiotBoard.generate_board(int(level["size"]), seed)
	moves_left = int(level["moves"])
	score = 0
	goals = []
	for g in level["goals"]:
		goals.append({
			"kind": str(g["kind"]),
			"need": int(g["need"]),
			"have": 0,
		})
	status = "playing"
	combo_peak = 0
	last_twist = {}
	busy = false
	changed.emit()


func restart() -> void:
	start(level)


func _goals_met() -> bool:
	for g in goals:
		if int(g["have"]) < int(g["need"]):
			return false
	return true


## Spend a move and return twisted board + resolve waves (does not apply waves yet).
func begin_twist(twist: Dictionary) -> Dictionary:
	if status != "playing" or moves_left <= 0 or busy:
		return {"did_twist": false, "waves": [], "twisted": []}
	busy = true
	var twisted: Array = RiotBoard.twist_board(board, twist)
	var waves: Array = RiotBoard.resolve_waves(twisted, rng)
	moves_left -= 1
	last_twist = twist.duplicate()
	board = twisted
	changed.emit()
	return {"did_twist": true, "waves": waves, "twisted": twisted}


func apply_wave(wave: Dictionary) -> void:
	score += int(wave["score_gain"])
	combo_peak = maxi(combo_peak, int(wave["combo"]))
	for item in wave["cleared"]:
		var kind := str(item["kind"])
		var count := int(item["count"])
		for g in goals:
			if str(g["kind"]) == kind:
				g["have"] = mini(int(g["need"]), int(g["have"]) + count)
	board = RiotBoard.clone_board(wave["board_after"])
	changed.emit()


func end_twist() -> void:
	busy = false
	if _goals_met():
		status = "won"
	elif moves_left <= 0:
		status = "lost"
	changed.emit()


func stars() -> int:
	return stars_for_score(score, level["star_scores"])
