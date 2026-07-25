class_name DoorComponent
extends PuzzleComponent
## Gated blocker driven by a channel. Open/closed is pure function of bus + inverted flag.

var channel: StringName = &"door"
var inverted: bool = false
var open: bool = false


func _on_setup() -> void:
	channel = get_param_string_name("channel", &"door")
	inverted = get_param_bool("inverted", false)
	open = get_param_bool("start_open", false)


func sync_from_channels(ctx: PuzzleContext) -> bool:
	var active := ctx.channels.is_active(channel)
	var should_open := active if not inverted else not active
	var changed := should_open != open
	open = should_open
	return changed


func is_blocking() -> bool:
	return not open


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"blocks_movement" or query_id == &"blocks_laser":
		return is_blocking()
	if query_id == &"door_open":
		return open
	return null


func write_state(state: Dictionary) -> void:
	state["open"] = open


func read_state(state: Dictionary) -> void:
	if state.has("open"):
		open = bool(state["open"])
