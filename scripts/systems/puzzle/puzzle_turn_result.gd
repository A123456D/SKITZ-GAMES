class_name PuzzleTurnResult
extends RefCounted
## Combined outcome of one BoardSession.apply + puzzle resolve loop.

var board_result: SimResult = null
var events: Array[PuzzleEvent] = []
var resolve_passes: int = 0
var success: bool = false


static func from_board_only(br: SimResult) -> PuzzleTurnResult:
	var r := PuzzleTurnResult.new()
	r.board_result = br
	r.success = br != null and br.success
	return r
