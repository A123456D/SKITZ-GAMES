class_name PuzzleComponentSpec
extends Resource
## One component slot on a PuzzleObjectDef. Params are free-form tunables.
## Adding a HeavyDoor = duplicate Door def and tweak these dictionaries — no new class.

@export var component_id: StringName = &""
@export var params: Dictionary = {}


func duplicate_spec() -> PuzzleComponentSpec:
	var s := PuzzleComponentSpec.new()
	s.component_id = component_id
	s.params = params.duplicate(true)
	return s


func to_dict() -> Dictionary:
	return {
		"component_id": String(component_id),
		"params": params.duplicate(true),
	}


static func from_dict(data: Dictionary) -> PuzzleComponentSpec:
	var s := PuzzleComponentSpec.new()
	s.component_id = StringName(str(data.get("component_id", "")))
	var p: Variant = data.get("params", {})
	s.params = p.duplicate(true) if p is Dictionary else {}
	return s


static func make(p_id: StringName, p_params: Dictionary = {}) -> PuzzleComponentSpec:
	var s := PuzzleComponentSpec.new()
	s.component_id = p_id
	s.params = p_params.duplicate(true)
	return s
