class_name PuzzleObjectDef
extends Resource
## Data-driven puzzle object: an id + ordered component specs.
## Simple variants are Resource duplicates with param tweaks — zero new GDScript.

@export var id: StringName = &""
@export var display_name: String = ""
@export_multiline var description: String = ""
## Tags for magnets, pressers, burn targets, etc. (compositional filters).
@export var tags: PackedStringArray = PackedStringArray()
@export var components: Array[PuzzleComponentSpec] = []


func has_component(component_id: StringName) -> bool:
	for c in components:
		if c != null and c.component_id == component_id:
			return true
	return false


func get_component_spec(component_id: StringName) -> PuzzleComponentSpec:
	for c in components:
		if c != null and c.component_id == component_id:
			return c
	return null


func to_dict() -> Dictionary:
	var comps: Array = []
	for c in components:
		if c:
			comps.append(c.to_dict())
	var tag_arr: Array = []
	for t in tags:
		tag_arr.append(t)
	return {
		"id": String(id),
		"display_name": display_name,
		"description": description,
		"tags": tag_arr,
		"components": comps,
	}


static func from_dict(data: Dictionary) -> PuzzleObjectDef:
	var d := PuzzleObjectDef.new()
	d.id = StringName(str(data.get("id", "")))
	d.display_name = str(data.get("display_name", ""))
	d.description = str(data.get("description", ""))
	d.tags = PackedStringArray()
	var tags_v: Variant = data.get("tags", [])
	if tags_v is Array:
		for t in tags_v:
			d.tags.append(str(t))
	d.components = []
	var comps: Variant = data.get("components", [])
	if comps is Array:
		for c in comps:
			if c is Dictionary:
				d.components.append(PuzzleComponentSpec.from_dict(c))
	return d
