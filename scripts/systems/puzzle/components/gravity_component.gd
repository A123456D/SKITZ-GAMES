class_name GravityComponent
extends PuzzleComponent
## Floor/field: movables fall in `dir` until blocked. Usually a floor object.

var dir: int = PuzzleEnums.Dir.SOUTH
var affected_tag: StringName = &"" ## empty = all movables


func _on_setup() -> void:
	dir = get_param_int("dir", PuzzleEnums.Dir.SOUTH)
	affected_tag = get_param_string_name("affected_tag", &"")


func affects(obj: PuzzleObject) -> bool:
	if obj == null or not obj.has_component(&"movable"):
		return false
	if String(affected_tag).is_empty():
		return true
	return obj.has_tag(String(affected_tag))
