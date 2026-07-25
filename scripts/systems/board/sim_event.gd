class_name SimEvent
extends RefCounted
## Presentation-facing simulation event. Timing lives in the view — never here.

enum Kind {
	SHIFT_STARTED = 1,
	SHIFT_SETTLED = 2,
	ROTATE_STARTED = 3,
	ROTATE_SETTLED = 4,
	TILE_SET = 5,
	BOARD_REPLACED = 6, ## Full rebuild (load / checkpoint restore)
	COMMAND_REJECTED = 7,
	UNDO_APPLIED = 8,
	REDO_APPLIED = 9,
}

var kind: int = Kind.SHIFT_SETTLED
var command: BoardCommand = null
## TileMove list: from → to for every cell that changed position.
var moves: Array[TileMove] = []
var rejected_reason: StringName = &""


static func shift_settled(cmd: BoardCommand, p_moves: Array[TileMove]) -> SimEvent:
	var e := SimEvent.new()
	e.kind = Kind.SHIFT_SETTLED
	e.command = cmd
	e.moves = p_moves
	return e


static func rotate_settled(cmd: BoardCommand, p_moves: Array[TileMove]) -> SimEvent:
	var e := SimEvent.new()
	e.kind = Kind.ROTATE_SETTLED
	e.command = cmd
	e.moves = p_moves
	return e


static func tile_set(cmd: BoardCommand) -> SimEvent:
	var e := SimEvent.new()
	e.kind = Kind.TILE_SET
	e.command = cmd
	return e


static func board_replaced() -> SimEvent:
	var e := SimEvent.new()
	e.kind = Kind.BOARD_REPLACED
	return e


static func rejected(cmd: BoardCommand, reason: StringName) -> SimEvent:
	var e := SimEvent.new()
	e.kind = Kind.COMMAND_REJECTED
	e.command = cmd
	e.rejected_reason = reason
	return e


static func undo_applied(cmd: BoardCommand, p_moves: Array[TileMove]) -> SimEvent:
	var e := SimEvent.new()
	e.kind = Kind.UNDO_APPLIED
	e.command = cmd
	e.moves = p_moves
	return e


static func redo_applied(cmd: BoardCommand, p_moves: Array[TileMove]) -> SimEvent:
	var e := SimEvent.new()
	e.kind = Kind.REDO_APPLIED
	e.command = cmd
	e.moves = p_moves
	return e


func to_dict() -> Dictionary:
	var move_dicts: Array = []
	for m in moves:
		move_dicts.append(m.to_dict())
	return {
		"kind": kind,
		"command": command.to_dict() if command else null,
		"moves": move_dicts,
		"rejected_reason": String(rejected_reason),
	}
