class_name RectTool
extends EditorTool
## Paint axis-aligned rectangle outline (Shift held → filled via filled flag).

var _start: Vector2i = Vector2i(-1, -1)
var filled: bool = false


func _init() -> void:
	tool_id = Id.RECT
	display_name = "Rect"


func begin_stroke(_doc: EditorDocument, cell: Vector2i) -> void:
	_start = cell


func preview_cells(_doc: EditorDocument, from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	return rect_cells(from, to, filled)


func end_stroke(doc: EditorDocument, cell: Vector2i) -> EditorCommand:
	if _start.x < 0:
		return null
	var coords := rect_cells(_start, cell, filled)
	_start = Vector2i(-1, -1)
	return build_patch(doc, coords, make_painted_cell, &"rect")


static func rect_cells(a: Vector2i, b: Vector2i, fill: bool) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	var x0 := mini(a.x, b.x)
	var x1 := maxi(a.x, b.x)
	var y0 := mini(a.y, b.y)
	var y1 := maxi(a.y, b.y)
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			if fill or x == x0 or x == x1 or y == y0 or y == y1:
				out.append(Vector2i(x, y))
	return out
