class_name FillTool
extends EditorTool
## Flood-fill connected cells matching the seed cell's comparable content.


func _init() -> void:
	tool_id = Id.FILL
	display_name = "Fill"


func begin_stroke(_doc: EditorDocument, _cell: Vector2i) -> void:
	pass


func end_stroke(doc: EditorDocument, cell: Vector2i) -> EditorCommand:
	if not doc.in_bounds(cell.x, cell.y):
		return null
	var seed := doc.get_cell(cell.x, cell.y)
	var target := _match_key(seed)
	var coords := _flood(doc, cell, target)
	return build_patch(doc, coords, make_painted_cell, &"fill")


func _flood(doc: EditorDocument, start: Vector2i, target: String) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	var seen: Dictionary = {}
	var stack: Array[Vector2i] = [start]
	while not stack.is_empty():
		var p: Vector2i = stack.pop_back()
		var key := "%d,%d" % [p.x, p.y]
		if seen.has(key) or not doc.in_bounds(p.x, p.y):
			continue
		seen[key] = true
		var cell := doc.get_cell(p.x, p.y)
		if _match_key(cell) != target:
			continue
		out.append(p)
		stack.append(Vector2i(p.x + 1, p.y))
		stack.append(Vector2i(p.x - 1, p.y))
		stack.append(Vector2i(p.x, p.y + 1))
		stack.append(Vector2i(p.x, p.y - 1))
	return out


func _match_key(cell: EditorCell) -> String:
	match String(paint_mode):
		"floor":
			return str(cell.floor_puzzle.get("def", ""))
		"object":
			return str(cell.puzzle.get("def", ""))
		_:
			return String(cell.occupant_id)
