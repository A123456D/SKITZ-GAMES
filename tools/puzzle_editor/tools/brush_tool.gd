class_name BrushTool
extends EditorTool
## Paint single cells / drag strokes.

var _stroke: Array[Vector2i] = []


func _init() -> void:
	tool_id = Id.BRUSH
	display_name = "Brush"


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
	return build_patch(doc, coords, make_painted_cell, &"brush")
