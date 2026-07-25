class_name GhostComponent
extends PuzzleComponent
## Phased objects do not block movement/lasers while channel (or always) says so.

var phase_channel: StringName = &"" ## empty + always_phased = permanent ghost
var always_phased: bool = false
var inverted: bool = false


func _on_setup() -> void:
	phase_channel = get_param_string_name("phase_channel", &"")
	always_phased = get_param_bool("always_phased", false)
	inverted = get_param_bool("inverted", false)


func is_phased(ctx: PuzzleContext) -> bool:
	if always_phased:
		return true
	if String(phase_channel).is_empty():
		return false
	var active := ctx.channels.is_active(phase_channel)
	return (not active) if inverted else active


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"blocks_movement" or query_id == &"blocks_laser":
		if is_phased(ctx):
			return false
		return null ## fall through to Blocking if present
	if query_id == &"is_ghost_phased":
		return is_phased(ctx)
	return null


func on_shift(ctx: PuzzleContext, board_result: SimResult) -> void:
	if is_phased(ctx):
		ctx.emit(
			PuzzleEvent.make(PuzzleEvent.Kind.GHOST_PHASE, owner_object.cell)
			.with_uid(owner_object.uid)
			.with_channel(phase_channel)
		)
