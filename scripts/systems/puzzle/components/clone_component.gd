class_name CloneComponent
extends PuzzleComponent
## Green-block clone: once per life, after a shift settle, spawn a sibling in first empty N/E/S/W.
## Uses PuzzleContext spawn requests — never mutates BoardSim directly.

var clone_def: StringName = &"block_green"
var cloned: bool = false


func _on_setup() -> void:
	clone_def = get_param_string_name("clone_def", &"block_green")
	cloned = get_param_bool("cloned", false)


func on_shift(ctx: PuzzleContext, board_result: SimResult) -> void:
	if cloned or owner_object == null:
		return
	## Only clone when this block actually moved in the shift (not every global settle).
	if board_result != null and not _was_moved(board_result):
		return
	var dirs: Array[Vector2i] = [
		Vector2i(0, -1), Vector2i(1, 0), Vector2i(0, 1), Vector2i(-1, 0)
	]
	for d in dirs:
		var target := owner_object.cell + d
		if not ctx.in_bounds(target):
			continue
		if ctx.get_object_at(target) != null:
			continue
		if ctx.is_blocking(target, owner_object):
			continue
		ctx.request_spawn(clone_def, target, false, {"clone": {"cloned": true}})
		cloned = true
		ctx.emit(
			PuzzleEvent.make(PuzzleEvent.Kind.OBJECT_SPAWNED, target)
			.with_uid(owner_object.uid)
			.with_to(target)
			.with_payload({"def_id": String(clone_def), "from": [owner_object.cell.x, owner_object.cell.y]})
		)
		ctx.mutated = true
		return


func _was_moved(board_result: SimResult) -> bool:
	if board_result == null or board_result.moves.is_empty():
		return true ## recompute-driven settle: allow once
	for m in board_result.moves:
		if m is TileMove and (m as TileMove).occupant_id == owner_object.def_id:
			var tm := m as TileMove
			if tm.to_x == owner_object.cell.x and tm.to_y == owner_object.cell.y:
				return true
	return false


func write_state(state: Dictionary) -> void:
	state["cloned"] = cloned


func read_state(state: Dictionary) -> void:
	if state.has("cloned"):
		cloned = bool(state["cloned"])
