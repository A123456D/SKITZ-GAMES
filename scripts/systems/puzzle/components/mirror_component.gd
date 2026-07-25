class_name MirrorComponent
extends PuzzleComponent
## Reflects lasers. orientation: "slash" (/) or "backslash" (\).

var orientation: StringName = &"slash" ## slash | backslash
## Optional facing hint for presentation (0–3); reflection uses orientation.


func _on_setup() -> void:
	orientation = get_param_string_name("orientation", &"slash")


func reflect(dir: int) -> int:
	if orientation == &"backslash" or orientation == &"\\":
		return PuzzleEnums.reflect_backslash(dir)
	return PuzzleEnums.reflect_slash(dir)


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"laser_reflect":
		var dir := int(args.get("dir", 0))
		return reflect(dir)
	if query_id == &"blocks_laser":
		## Mirrors don't absorb — they redirect (handled in LaserSystem).
		return false
	return null


func write_state(state: Dictionary) -> void:
	state["orientation"] = String(orientation)


func read_state(state: Dictionary) -> void:
	if state.has("orientation"):
		orientation = StringName(str(state["orientation"]))
