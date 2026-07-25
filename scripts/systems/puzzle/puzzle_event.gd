class_name PuzzleEvent
extends RefCounted
## Presentation-facing puzzle sim event. Timing lives in the view — never here.

enum Kind {
	CHANNEL_CHANGED = 1,
	DOOR_OPENED = 2,
	DOOR_CLOSED = 3,
	SWITCH_TOGGLED = 4,
	PRESSURE_CHANGED = 5,
	LASER_BEAM = 6,
	LASER_RECEIVER_HIT = 7,
	LASER_RECEIVER_CLEAR = 8,
	MAGNET_PULLED = 9,
	TELEPORT = 10,
	GRAVITY_FALL = 11,
	ICE_SLIDE = 12,
	BURN = 13,
	OBJECT_DESTROYED = 14,
	TIME_REWIND = 15,
	TIME_LOCK = 16,
	ACTOR_STEPPED = 17,
	GHOST_PHASE = 18,
	BLOCKING_CHANGED = 19,
	RESOLVE_PASS = 20,
	COUNTDOWN_TICK = 21,
	OBJECT_SPAWNED = 22,
}

var kind: int = Kind.CHANNEL_CHANGED
var cell: Vector2i = Vector2i.ZERO
var to_cell: Vector2i = Vector2i.ZERO
var object_uid: StringName = &""
var channel: StringName = &""
var payload: Dictionary = {}


static func make(p_kind: int, p_cell: Vector2i = Vector2i.ZERO) -> PuzzleEvent:
	var e := PuzzleEvent.new()
	e.kind = p_kind
	e.cell = p_cell
	return e


func with_uid(uid: StringName) -> PuzzleEvent:
	object_uid = uid
	return self


func with_to(p_to: Vector2i) -> PuzzleEvent:
	to_cell = p_to
	return self


func with_channel(ch: StringName) -> PuzzleEvent:
	channel = ch
	return self


func with_payload(p: Dictionary) -> PuzzleEvent:
	payload = p.duplicate(true)
	return self


func to_dict() -> Dictionary:
	return {
		"kind": kind,
		"cell": [cell.x, cell.y],
		"to_cell": [to_cell.x, to_cell.y],
		"object_uid": String(object_uid),
		"channel": String(channel),
		"payload": payload.duplicate(true),
	}
