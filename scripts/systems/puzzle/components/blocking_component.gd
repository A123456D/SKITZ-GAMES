class_name BlockingComponent
extends PuzzleComponent
## Solid obstruction. Doors/ghosts modulate via query rather than subclassing.

var blocks: bool = true
## If set, only blocks when channel matches `blocks_when_channel_active`.
var channel: StringName = &""
var blocks_when_channel_active: bool = true


func _on_setup() -> void:
	blocks = get_param_bool("blocks", true)
	channel = get_param_string_name("channel", &"")
	blocks_when_channel_active = get_param_bool("blocks_when_channel_active", true)


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"blocks_movement" or query_id == &"blocks_laser":
		return _currently_blocks(ctx)
	return null


func _currently_blocks(ctx: PuzzleContext) -> bool:
	if not blocks:
		return false
	## Door component may override via owner query chain — door runs first if registered first.
	var door: DoorComponent = owner_object.get_component(&"door") as DoorComponent
	if door:
		return door.is_blocking()
	var ghost: GhostComponent = owner_object.get_component(&"ghost") as GhostComponent
	if ghost and ghost.is_phased(ctx):
		return false
	if String(channel).is_empty():
		return true
	var active := ctx.channels.is_active(channel)
	if blocks_when_channel_active:
		return active
	return not active


func write_state(state: Dictionary) -> void:
	state["blocks"] = blocks


func read_state(state: Dictionary) -> void:
	if state.has("blocks"):
		blocks = bool(state["blocks"])
