class_name CRMatch
extends RefCounted

const CRTypes := preload("res://scripts/core/types.gd")
const CRDeck := preload("res://scripts/core/deck.gd")
const CRBoard := preload("res://scripts/core/board_ops.gd")
const CRCards := preload("res://scripts/core/cards.gd")
const CRCascade := preload("res://scripts/core/cascade.gd")

signal changed

var phase: String = "menu"
var round_n: int = 1
var active: String = "player"
var energy: int = 1
var energy_max: int = 1
var turn_seconds_left: float = CRTypes.TURN_SECONDS
var board: Array = []
var players: Dictionary = {}
var last_cascade: Array = []
var winner: String = ""
var next_instance: int = 1
var rng := RandomNumberGenerator.new()


func _init() -> void:
	rng.randomize()
	board = CRTypes.empty_board()
	players = {
		"player": {"id": "player", "deck": [], "hand": [], "faction": "volt"},
		"enemy": {"id": "enemy", "deck": [], "hand": [], "faction": "prismatic"},
	}


func create_menu() -> void:
	phase = "menu"
	winner = ""
	board = CRTypes.empty_board()
	changed.emit()


func start_match(player_faction: String, enemy_faction: String = "") -> void:
	if enemy_faction == "":
		enemy_faction = _opposite(player_faction)
	phase = "playing"
	round_n = 1
	active = "player"
	board = CRTypes.empty_board()
	winner = ""
	last_cascade = []
	next_instance = 1
	players["player"] = {
		"id": "player",
		"faction": player_faction,
		"deck": CRDeck.shuffle(CRDeck.preset(player_faction), rng),
		"hand": [],
	}
	players["enemy"] = {
		"id": "enemy",
		"faction": enemy_faction,
		"deck": CRDeck.shuffle(CRDeck.preset(enemy_faction), rng),
		"hand": [],
	}
	_begin_turn()
	changed.emit()


func scores() -> Dictionary:
	return {
		"player": CRBoard.score_for(board, "player"),
		"enemy": CRBoard.score_for(board, "enemy"),
	}


func can_play(hand_index: int, pos: Vector2i) -> bool:
	if phase != "playing" and phase != "ai_thinking":
		return false
	if phase == "playing" and active != "player":
		return false
	var p: Dictionary = players[active]
	var hand: Array = p["hand"]
	if hand_index < 0 or hand_index >= hand.size():
		return false
	var def: Dictionary = CRCards.get_card(str(hand[hand_index]))
	if int(def["cost"]) > energy:
		return false
	if board[pos.y][pos.x] != null:
		return false
	return true


func play_card(hand_index: int, pos: Vector2i, defer_advance: bool = false) -> Dictionary:
	if not can_play(hand_index, pos):
		return {"ok": false, "events": []}
	var who := active
	var p: Dictionary = players[who]
	var hand: Array = p["hand"]
	var def_id := str(hand[hand_index])
	var def: Dictionary = CRCards.get_card(def_id)
	hand.remove_at(hand_index)
	energy -= int(def["cost"])
	board[pos.y][pos.x] = {
		"instance_id": "c%d" % next_instance,
		"def_id": def_id,
		"owner": who,
		"power": int(def["power"]),
		"activated": false,
	}
	next_instance += 1
	phase = "cascading"
	var result: Dictionary = CRCascade.resolve(board, pos, who)
	board = result["board"]
	last_cascade = result["events"]
	if defer_advance:
		changed.emit()
		return {"ok": true, "events": last_cascade}
	_advance_after_turn()
	changed.emit()
	return {"ok": true, "events": last_cascade}


func finish_cascade() -> void:
	if phase != "cascading":
		return
	_advance_after_turn()
	changed.emit()


func pass_turn() -> void:
	if phase != "playing" and phase != "ai_thinking":
		return
	if phase == "playing" and active != "player":
		return
	_advance_after_turn()
	changed.emit()


func tick_timer(dt: float) -> void:
	if phase != "playing":
		return
	turn_seconds_left = maxf(0.0, turn_seconds_left - dt)
	if turn_seconds_left <= 0.0:
		pass_turn()


func _begin_turn() -> void:
	energy_max = CRTypes.energy_for_round(round_n)
	energy = energy_max
	turn_seconds_left = CRTypes.TURN_SECONDS
	_draw_to_hand(active)
	phase = "playing" if active == "player" else "ai_thinking"


func _draw_to_hand(who: String) -> void:
	var p: Dictionary = players[who]
	var hand: Array = p["hand"]
	var deck: Array = p["deck"]
	while hand.size() < CRTypes.HAND_SIZE and deck.size() > 0:
		hand.append(deck.pop_front())


func _advance_after_turn() -> void:
	if CRBoard.is_board_full(board):
		_finalize()
		return
	if active == "player":
		active = "enemy"
		_begin_turn()
		return
	if round_n >= CRTypes.MAX_ROUNDS:
		_finalize()
		return
	round_n += 1
	active = "player"
	_begin_turn()


func _finalize() -> void:
	var sc := scores()
	if int(sc["player"]) > int(sc["enemy"]):
		winner = "player"
	elif int(sc["enemy"]) > int(sc["player"]):
		winner = "enemy"
	else:
		winner = "draw"
	phase = "match_over"


func _opposite(f: String) -> String:
	match f:
		"volt":
			return "prismatic"
		"prismatic":
			return "void"
	return "volt"
