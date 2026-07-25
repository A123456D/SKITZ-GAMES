class_name PressurePlateComponent
extends PuzzleComponent
## Floor sensor: channel active while a presser occupant shares this cell.

var channel: StringName = &"plate"
var pressed: bool = false


func _on_setup() -> void:
	channel = get_param_string_name("channel", &"plate")


func evaluate(ctx: PuzzleContext) -> void:
	var occupant := ctx.get_object_at(owner_object.cell)
	var now := false
	if occupant != null and occupant.uid != owner_object.uid:
		now = _is_presser(occupant)
	elif occupant != null and occupant.uid == owner_object.uid:
		## Composite object that is both plate + presser (weighted plate).
		now = _is_presser(occupant) and occupant.has_component(&"pressure_plate")
	if now:
		ctx.channels.add_strength(channel, 1)
	if now != pressed:
		pressed = now
		ctx.emit(
			PuzzleEvent.make(PuzzleEvent.Kind.PRESSURE_CHANGED, owner_object.cell)
			.with_uid(owner_object.uid)
			.with_channel(channel)
			.with_payload({"pressed": pressed})
		)


func _is_presser(obj: PuzzleObject) -> bool:
	if obj.has_component(&"presser") or obj.has_component(&"movable") or obj.has_component(&"actor"):
		return true
	return obj.has_tag("presser") or obj.has_tag("player")


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"pressure_pressed":
		return pressed
	if query_id == &"blocks_movement":
		return false
	if query_id == &"blocks_laser":
		return false
	return null


func write_state(state: Dictionary) -> void:
	state["pressed"] = pressed


func read_state(state: Dictionary) -> void:
	if state.has("pressed"):
		pressed = bool(state["pressed"])
