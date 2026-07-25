class_name EraseTool
extends EditorTool
## Erase occupant / object / floor depending on paint_mode.

var _stroke: Array[Vector2i] = []


func _init() -> void:
	tool_id = Id.ERASE
	display_name = "Erase"
	paint_mode = &"erase"


func begin_stroke(_doc: EditorDocument, cell: Vector2i) -> void:
	_stroke = [cell]


func drag_to(_doc: EditorDocument, cell: Vector2i) -> void:
	if _stroke.is_empty() or _stroke[_stroke.size() - 1] != cell:
		_stroke.append(cell)


func end_stroke(doc: EditorDocument, cell: Vector2i) -> EditorCommand:
	if not _stroke.is_empty() and _stroke[_stroke.size() - 1] != cell:
		_stroke.append(cell)
	var coords := _stroke.duplicate()
	_stroke.clear()
	return build_patch(doc, coords, make_erased_cell, &"erase")
