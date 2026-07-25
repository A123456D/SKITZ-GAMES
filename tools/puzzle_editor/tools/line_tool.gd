class_name LineTool
extends EditorTool
## Paint a Bresenham line from stroke start to end.

var _start: Vector2i = Vector2i(-1, -1)


func _init() -> void:
	tool_id = Id.LINE
	display_name = "Line"


func begin_stroke(_doc: EditorDocument, cell: Vector2i) -> void:
	_start = cell


func preview_cells(_doc: EditorDocument, from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	return bresenham(from, to)


func end_stroke(doc: EditorDocument, cell: Vector2i) -> EditorCommand:
	if _start.x < 0:
		return null
	var coords := bresenham(_start, cell)
	_start = Vector2i(-1, -1)
	return build_patch(doc, coords, make_painted_cell, &"line")


static func bresenham(a: Vector2i, b: Vector2i) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	var x0 := a.x
	var y0 := a.y
	var x1 := b.x
	var y1 := b.y
	var dx := absi(x1 - x0)
	var dy := -absi(y1 - y0)
	var sx := 1 if x0 < x1 else -1
	var sy := 1 if y0 < y1 else -1
	var err := dx + dy
	while true:
		out.append(Vector2i(x0, y0))
		if x0 == x1 and y0 == y1:
			break
		var e2 := 2 * err
		if e2 >= dy:
			err += dy
			x0 += sx
		if e2 <= dx:
			err += dx
			y0 += sy
	return out
