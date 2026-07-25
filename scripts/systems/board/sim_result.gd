class_name SimResult
extends RefCounted
## Outcome of applying one BoardCommand through BoardSim.

var success: bool = false
var events: Array[SimEvent] = []
var moves: Array[TileMove] = []
var reject_reason: StringName = &""
## Previous tile for SET_TILE (needed for undo delta).
var previous_tile: BoardTileData = null


static func ok(p_events: Array[SimEvent], p_moves: Array[TileMove] = []) -> SimResult:
	var r := SimResult.new()
	r.success = true
	r.events = p_events
	r.moves = p_moves
	return r


static func rejected(reason: StringName, cmd: BoardCommand = null) -> SimResult:
	var r := SimResult.new()
	r.success = false
	r.reject_reason = reason
	r.events = [SimEvent.rejected(cmd, reason)]
	return r
