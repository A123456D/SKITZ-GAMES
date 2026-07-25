class_name SelectTool
extends EditorTool
## Marquee selection + drag-move of selection contents.

signal selection_updated(rect: Rect2i)

var _anchor: Vector2i = Vector2i(-1, -1)
var _moving: bool = false
var _move_from: Vector2i = Vector2i.ZERO
var _grab_offset: Vector2i = Vector2i.ZERO
var _move_snapshot: Array = [] ## {pos, cell}


func _init() -> void:
	tool_id = Id.SELECT
	display_name = "Select"


func begin_stroke(doc: EditorDocument, cell: Vector2i) -> void:
	if doc.has_selection() and _point_in_selection(doc.selection, cell):
		_moving = true
		_move_from = cell
		_grab_offset = cell - doc.selection.position
		_move_snapshot.clear()
		for p in doc.selected_cells():
			_move_snapshot.append({"pos": p, "cell": doc.get_cell(p.x, p.y).duplicate_cell()})
	else:
		_moving = false
		_anchor = cell
		doc.set_selection(Rect2i(cell, Vector2i(1, 1)))
		selection_updated.emit(doc.selection)


func drag_to(doc: EditorDocument, cell: Vector2i) -> void:
	if _moving:
		return
	if _anchor.x < 0:
		return
	var x0 := mini(_anchor.x, cell.x)
	var y0 := mini(_anchor.y, cell.y)
	var x1 := maxi(_anchor.x, cell.x)
	var y1 := maxi(_anchor.y, cell.y)
	doc.set_selection(Rect2i(x0, y0, x1 - x0 + 1, y1 - y0 + 1))
	selection_updated.emit(doc.selection)


func end_stroke(doc: EditorDocument, cell: Vector2i) -> EditorCommand:
	if _moving:
		_moving = false
		var new_origin := cell - _grab_offset
		return _build_move_command(doc, new_origin)
	_anchor = Vector2i(-1, -1)
	return null


func _build_move_command(doc: EditorDocument, new_origin: Vector2i) -> EditorCommand:
	if _move_snapshot.is_empty():
		return null
	var old_origin: Vector2i = _move_snapshot[0]["pos"]
	## Compute bounding origin from snapshot.
	var min_x := 999
	var min_y := 999
	for item in _move_snapshot:
		var p: Vector2i = item["pos"]
		min_x = mini(min_x, p.x)
		min_y = mini(min_y, p.y)
	old_origin = Vector2i(min_x, min_y)
	var delta := new_origin - old_origin
	if delta == Vector2i.ZERO:
		return null

	var coords: Array[Vector2i] = []
	var before_cells: Array[EditorCell] = []
	var after_cells: Array[EditorCell] = []
	var touched: Dictionary = {}

	## Clear old positions first (in after), then place at new.
	for item in _move_snapshot:
		var p: Vector2i = item["pos"]
		var key := "%d,%d" % [p.x, p.y]
		if not touched.has(key):
			touched[key] = true
			coords.append(p)
			before_cells.append(doc.get_cell(p.x, p.y).duplicate_cell())
			after_cells.append(EditorCell.new())

	for item in _move_snapshot:
		var p: Vector2i = item["pos"]
		var np := p + delta
		if not doc.in_bounds(np.x, np.y):
			continue
		var key := "%d,%d" % [np.x, np.y]
		var cell_data: EditorCell = item["cell"]
		if touched.has(key):
			## Overwrite after for this coord.
			var idx := coords.find(np)
			if idx >= 0:
				after_cells[idx] = cell_data.duplicate_cell()
		else:
			touched[key] = true
			coords.append(np)
			before_cells.append(doc.get_cell(np.x, np.y).duplicate_cell())
			after_cells.append(cell_data.duplicate_cell())

	var cmd := CellPatchCommand.make(doc.active_layer, coords, before_cells, after_cells, &"move")
	if cmd.is_empty():
		return null
	## Update selection to new rect.
	var sel := doc.selection
	doc.set_selection(Rect2i(sel.position + delta, sel.size))
	return cmd


static func _point_in_selection(sel: Rect2i, cell: Vector2i) -> bool:
	return (
		cell.x >= sel.position.x
		and cell.y >= sel.position.y
		and cell.x < sel.position.x + sel.size.x
		and cell.y < sel.position.y + sel.size.y
	)
