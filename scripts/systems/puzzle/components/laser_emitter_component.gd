class_name LaserEmitterComponent
extends PuzzleComponent
## Emits a beam each laser pass. Color is a channel-ish id for receivers.

var dir: int = PuzzleEnums.Dir.EAST
var beam_color: StringName = &"red"
var max_length: int = PuzzleEnums.LASER_PATH_CAP
var enabled_channel: StringName = &"" ## empty = always on; else requires channel active
var inverted_enable: bool = false


func _on_setup() -> void:
	dir = get_param_int("dir", PuzzleEnums.Dir.EAST)
	beam_color = get_param_string_name("beam_color", &"red")
	max_length = mini(get_param_int("max_length", PuzzleEnums.LASER_PATH_CAP), PuzzleEnums.LASER_PATH_CAP)
	enabled_channel = get_param_string_name("enabled_channel", &"")
	inverted_enable = get_param_bool("inverted_enable", false)


func is_enabled(ctx: PuzzleContext) -> bool:
	if String(enabled_channel).is_empty():
		return true
	var active := ctx.channels.is_active(enabled_channel)
	return (not active) if inverted_enable else active


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"laser_dir":
		return dir
	if query_id == &"laser_color":
		return beam_color
	return null


func write_state(state: Dictionary) -> void:
	state["dir"] = dir


func read_state(state: Dictionary) -> void:
	if state.has("dir"):
		dir = int(state["dir"])
