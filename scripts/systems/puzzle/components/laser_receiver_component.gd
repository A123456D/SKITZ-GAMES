class_name LaserReceiverComponent
extends PuzzleComponent
## Activates a channel while a matching beam terminates or passes through.

var channel: StringName = &"receiver"
var required_color: StringName = &"" ## empty = any
var hit: bool = false
var absorb: bool = true ## stops the beam when hit


func _on_setup() -> void:
	channel = get_param_string_name("channel", &"receiver")
	required_color = get_param_string_name("required_color", &"")
	absorb = get_param_bool("absorb", true)


func accepts(color: StringName) -> bool:
	if String(required_color).is_empty():
		return true
	return color == required_color


func set_hit(ctx: PuzzleContext, value: bool, color: StringName = &"") -> void:
	if value and not String(channel).is_empty():
		ctx.channels.add_strength(channel, 1)
	if value != hit:
		hit = value
		var kind := PuzzleEvent.Kind.LASER_RECEIVER_HIT if hit else PuzzleEvent.Kind.LASER_RECEIVER_CLEAR
		ctx.emit(
			PuzzleEvent.make(kind, owner_object.cell)
			.with_uid(owner_object.uid)
			.with_channel(channel)
			.with_payload({"color": String(color)})
		)


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"laser_receiver":
		return true
	if query_id == &"blocks_laser":
		return absorb
	return null


func write_state(state: Dictionary) -> void:
	state["hit"] = hit


func read_state(state: Dictionary) -> void:
	if state.has("hit"):
		hit = bool(state["hit"])
