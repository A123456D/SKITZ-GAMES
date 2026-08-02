class_name CRAi
extends RefCounted

const CRTypes := preload("res://scripts/core/types.gd")
const CRBoard := preload("res://scripts/core/board_ops.gd")
const CRCards := preload("res://scripts/core/cards.gd")
const CRCascade := preload("res://scripts/core/cascade.gd")


static func pick_enemy_faction(player: String) -> String:
	match player:
		"volt":
			return "void"
		"prismatic":
			return "volt"
	return "prismatic"


static func choose_move(m) -> Dictionary:
	var tiles: Array[Vector2i] = CRBoard.empty_tiles(m.board)
	var hand: Array = m.players[m.active]["hand"]
	var best: Dictionary = {}
	var best_score := -999999.0

	for hi in hand.size():
		var def: Dictionary = CRCards.get_card(str(hand[hi]))
		if int(def["cost"]) > m.energy:
			continue
		for pos in tiles:
			if not m.can_play(hi, pos):
				continue
			var score := _evaluate(m, hi, pos)
			if score > best_score:
				best_score = score
				best = {"hand_index": hi, "pos": pos}

	if best.is_empty():
		return {"pass": true}
	return best


static func apply(m) -> void:
	var move := choose_move(m)
	if move.get("pass", false):
		m.pass_turn()
		return
	m.play_card(int(move["hand_index"]), move["pos"])


static func _evaluate(m, hand_index: int, pos: Vector2i) -> float:
	var who: String = str(m.active)
	var board: Array = CRTypes.clone_board(m.board)
	var def_id := str(m.players[who]["hand"][hand_index])
	var def: Dictionary = CRCards.get_card(def_id)
	board[pos.y][pos.x] = {
		"instance_id": "sim",
		"def_id": def_id,
		"owner": who,
		"power": int(def["power"]),
		"activated": false,
	}
	var result: Dictionary = CRCascade.resolve(board, pos, who)
	var after: Array = result["board"]
	var events: Array = result["events"]
	var opp := "enemy" if who == "player" else "player"
	var score := float(CRBoard.score_for(after, who) - CRBoard.score_for(after, opp))
	for e in events:
		if str(e.get("type", "")) == "capture":
			score += 8.0
		if str(e.get("type", "")) == "damage":
			score += float(e.get("amount", 0)) * 0.35
	if pos.x == 1:
		score += 1.5
	if pos.y == 1 or pos.y == 2:
		score += 0.5
	score += float(def["power"]) * 0.2
	return score
