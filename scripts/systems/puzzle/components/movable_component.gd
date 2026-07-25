class_name MovableComponent
extends PuzzleComponent
## Marker: magnets / gravity / ice may translate this object.

var mass: int = 1
## Last slide direction (ice momentum), PuzzleEnums.Dir or -1 if none.
var slide_dir: int = -1


func _on_setup() -> void:
	mass = get_param_int("mass", 1)
	slide_dir = get_param_int("slide_dir", -1)


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"is_movable":
		return true
	if query_id == &"mass":
		return mass
	if query_id == &"slide_dir":
		return slide_dir
	return null


func set_slide_dir(dir: int) -> void:
	slide_dir = dir


func write_state(state: Dictionary) -> void:
	state["slide_dir"] = slide_dir
	state["mass"] = mass


func read_state(state: Dictionary) -> void:
	if state.has("slide_dir"):
		slide_dir = int(state["slide_dir"])
	if state.has("mass"):
		mass = int(state["mass"])
