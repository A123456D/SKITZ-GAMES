class_name BoardViewBridge
extends Node
## Thin presentation adapter. Listens to BoardSession sim events and re-emits
## animation-facing signals. Put tweens / juice here or in a child BoardView — never in sim.

signal animate_moves(moves: Array, context: Dictionary)
signal board_needs_rebuild(state: BoardState)
signal command_rejected(reason: StringName, command: BoardCommand)

var session: BoardSession = null


func bind_session(p_session: BoardSession) -> void:
	if session != null and session.events_emitted.is_connected(_on_events):
		session.events_emitted.disconnect(_on_events)
	session = p_session
	if session != null:
		session.events_emitted.connect(_on_events)


func unbind() -> void:
	if session != null and session.events_emitted.is_connected(_on_events):
		session.events_emitted.disconnect(_on_events)
	session = null


func _on_events(events: Array) -> void:
	for item in events:
		if not (item is SimEvent):
			continue
		var e: SimEvent = item
		match e.kind:
			SimEvent.Kind.SHIFT_SETTLED, SimEvent.Kind.ROTATE_SETTLED, SimEvent.Kind.UNDO_APPLIED, SimEvent.Kind.REDO_APPLIED:
				animate_moves.emit(e.moves, _context_from_event(e))
			SimEvent.Kind.BOARD_REPLACED, SimEvent.Kind.TILE_SET:
				if session:
					board_needs_rebuild.emit(session.get_state())
			SimEvent.Kind.COMMAND_REJECTED:
				command_rejected.emit(e.rejected_reason, e.command)


func _context_from_event(e: SimEvent) -> Dictionary:
	return {
		"kind": e.kind,
		"command": e.command,
		"is_undo": e.kind == SimEvent.Kind.UNDO_APPLIED,
		"is_redo": e.kind == SimEvent.Kind.REDO_APPLIED,
		"is_rotate": e.kind == SimEvent.Kind.ROTATE_SETTLED or (
			e.command != null and e.command.type == BoardEnums.CommandType.ROTATE
		),
	}
