class_name PatternTemplate
extends Resource
## Target motif for Align mode. Cells are color indices into a palette (0..N-1).
## Built via PatternLibrary or authored as .tres under resources/puzzles/patterns/.

@export var id: StringName = &""
@export var display_name: String = ""
@export var family: int = 0
@export_range(0, 4, 1) var tier: int = 0
@export var width: int = 4
@export var height: int = 4
## Row-major color indices. Size must equal width * height.
@export var cells: PackedInt32Array = PackedInt32Array()
@export var tags: PackedStringArray = PackedStringArray()


func is_valid() -> bool:
	return width > 0 and height > 0 and cells.size() == width * height


func color_count_used() -> int:
	var mx := 0
	for v in cells:
		mx = maxi(mx, int(v))
	return mx + 1


func build_goal_state(palette: PackedStringArray) -> BoardState:
	assert(is_valid())
	var state := BoardState.create(width, height)
	var ids: Array = []
	ids.resize(cells.size())
	for i in cells.size():
		var idx := clampi(int(cells[i]), 0, maxi(0, palette.size() - 1))
		ids[i] = palette[idx]
	state.fill_occupants_row_major(ids)
	return state


func fingerprint() -> String:
	var parts: PackedStringArray = PackedStringArray()
	parts.append("%dx%d" % [width, height])
	for v in cells:
		parts.append(str(v))
	return "|".join(parts)


func to_dict() -> Dictionary:
	return {
		"id": String(id),
		"display_name": display_name,
		"family": family,
		"tier": tier,
		"width": width,
		"height": height,
		"cells": Array(cells),
		"tags": Array(tags),
	}


static func from_dict(data: Dictionary) -> PatternTemplate:
	var t := PatternTemplate.new()
	t.id = StringName(str(data.get("id", "")))
	t.display_name = str(data.get("display_name", ""))
	t.family = int(data.get("family", 0))
	t.tier = int(data.get("tier", 0))
	t.width = int(data.get("width", 4))
	t.height = int(data.get("height", 4))
	var c: Variant = data.get("cells", [])
	t.cells = PackedInt32Array(c) if c is Array or c is PackedInt32Array else PackedInt32Array()
	var tg: Variant = data.get("tags", [])
	t.tags = PackedStringArray(tg) if tg is Array or tg is PackedStringArray else PackedStringArray()
	return t


static func make(
	p_id: StringName,
	p_name: String,
	p_family: int,
	p_tier: int,
	p_w: int,
	p_h: int,
	grid: Array,
	p_tags: PackedStringArray = PackedStringArray()
) -> PatternTemplate:
	var t := PatternTemplate.new()
	t.id = p_id
	t.display_name = p_name
	t.family = p_family
	t.tier = p_tier
	t.width = p_w
	t.height = p_h
	t.cells = PackedInt32Array()
	t.cells.resize(p_w * p_h)
	assert(grid.size() == p_w * p_h)
	for i in grid.size():
		t.cells[i] = int(grid[i])
	t.tags = p_tags
	return t
