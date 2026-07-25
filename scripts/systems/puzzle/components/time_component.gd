class_name TimeComponent
extends PuzzleComponent
## Time field. Modes (PuzzleEnums.TimeMode):
## - REWIND_POCKET: keeps a short ring of board cell snapshots for local rewind pulses
## - SLOW: actors/fire in radius only advance every `slow_factor` ticks
## - CHRONOLOCK: actors in radius skip steps while channel active (or always)

var mode: int = PuzzleEnums.TimeMode.CHRONOLOCK
var radius: int = 1
var channel: StringName = &"" ## empty = always active for CHRONOLOCK/SLOW
var slow_factor: int = 2
var pocket_depth: int = 4
var _pocket: Array = [] ## Array[Dictionary] cell snapshots
var _rewind_pulse: bool = false


func _on_setup() -> void:
	mode = get_param_int("mode", PuzzleEnums.TimeMode.CHRONOLOCK)
	radius = get_param_int("radius", 1)
	channel = get_param_string_name("channel", &"")
	slow_factor = maxi(1, get_param_int("slow_factor", 2))
	pocket_depth = maxi(1, get_param_int("pocket_depth", 4))


func is_field_active(ctx: PuzzleContext) -> bool:
	if String(channel).is_empty():
		return true
	return ctx.channels.is_active(channel)


func contains_cell(cell: Vector2i) -> bool:
	var d := absi(cell.x - owner_object.cell.x) + absi(cell.y - owner_object.cell.y)
	return d <= radius


func on_tick(ctx: PuzzleContext, tick_index: int, dt_ms: int) -> void:
	if mode == PuzzleEnums.TimeMode.REWIND_POCKET and is_field_active(ctx):
		_capture_pocket(ctx)
	if _rewind_pulse:
		_apply_rewind(ctx)
		_rewind_pulse = false


func pulse_rewind() -> void:
	_rewind_pulse = true


func _capture_pocket(ctx: PuzzleContext) -> void:
	var snap: Dictionary = {}
	for y in range(owner_object.cell.y - radius, owner_object.cell.y + radius + 1):
		for x in range(owner_object.cell.x - radius, owner_object.cell.x + radius + 1):
			var cell := Vector2i(x, y)
			if not contains_cell(cell) or not ctx.in_bounds(cell):
				continue
			var tile := ctx.board.get_tile(x, y)
			snap["%d,%d" % [x, y]] = tile.to_dict()
	_pocket.append(snap)
	while _pocket.size() > pocket_depth:
		_pocket.pop_front()


func _apply_rewind(ctx: PuzzleContext) -> void:
	if _pocket.is_empty():
		return
	var snap: Dictionary = _pocket.pop_back()
	for key in snap.keys():
		var parts: PackedStringArray = String(key).split(",")
		if parts.size() != 2:
			continue
		var x := int(parts[0])
		var y := int(parts[1])
		if not ctx.board.in_bounds(x, y):
			continue
		var restored := BoardTileData.from_dict(snap[key])
		ctx.board.set_tile(x, y, restored)
	ctx.mutated = true
	ctx.emit(
		PuzzleEvent.make(PuzzleEvent.Kind.TIME_REWIND, owner_object.cell)
		.with_uid(owner_object.uid)
		.with_payload({"radius": radius})
	)
	## World must rebuild after rewind â€” engine handles if mutated.


func write_state(state: Dictionary) -> void:
	state["pocket"] = _pocket.duplicate(true)


func read_state(state: Dictionary) -> void:
	if state.has("pocket") and state["pocket"] is Array:
		_pocket = state["pocket"].duplicate(true)
