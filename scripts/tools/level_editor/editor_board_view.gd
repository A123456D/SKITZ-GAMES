class_name EditorBoardView
extends Control
## Presents EditorDocument / test BoardSession. Handles pointer → cell mapping.

signal cell_pressed(cell: Vector2i, shift: bool)
signal cell_dragged(cell: Vector2i)
signal cell_released(cell: Vector2i)
signal swipe_shift(is_row: bool, index: int, dir: int)

const CELL_GAP := 3.0

var tokens: DesignTokens
var document: EditorDocument
var controller: LevelEditorController
var cell_size: float = 48.0
var _drag_cell: Vector2i = Vector2i(-1, -1)
var _pointer_down: bool = false
var _swipe_origin: Vector2 = Vector2.ZERO
var _swipe_cell: Vector2i = Vector2i.ZERO
var _swiping: bool = false

## Align color map — luminous precision palette (not purple sludge).
const COLOR_MAP := {
	"A": Color("2FE0C5"),
	"B": Color("5B8CFF"),
	"C": Color("FF6A3D"),
	"D": Color("F5C542"),
	"E": Color("C084FC"),
	"F": Color("94A3B8"),
	"": Color("1A222C"),
}


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	focus_mode = Control.FOCUS_ALL
	custom_minimum_size = Vector2(280, 280)


func configure(p_tokens: DesignTokens, p_controller: LevelEditorController) -> void:
	tokens = p_tokens
	controller = p_controller
	document = p_controller.document if p_controller else null
	queue_redraw()


func refresh() -> void:
	if controller:
		document = controller.document
	queue_redraw()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_recompute_cell_size()
		queue_redraw()


func _recompute_cell_size() -> void:
	if document == null:
		return
	var w := maxf(1.0, size.x)
	var h := maxf(1.0, size.y)
	var cw := (w - CELL_GAP * (document.width + 1)) / float(document.width)
	var ch := (h - CELL_GAP * (document.height + 1)) / float(document.height)
	cell_size = maxf(18.0, minf(cw, ch))


func _draw() -> void:
	if document == null:
		return
	_recompute_cell_size()
	var origin := _board_origin()
	var testing := controller != null and controller.test_session.active
	for y in document.height:
		for x in document.width:
			var rect := Rect2(origin + Vector2(x, y) * (cell_size + CELL_GAP), Vector2(cell_size, cell_size))
			var cell: EditorCell
			if testing and controller.test_session.session:
				cell = EditorCell.from_tile(controller.test_session.session.get_state().get_tile(x, y))
			else:
				cell = document.get_cell(x, y)
			_draw_cell(rect, cell, Vector2i(x, y))
	## Selection
	if document.has_selection() and not testing:
		var sel := document.selection
		var r := Rect2(
			origin + Vector2(sel.position) * (cell_size + CELL_GAP) - Vector2(2, 2),
			Vector2(sel.size) * (cell_size + CELL_GAP) - Vector2(CELL_GAP, CELL_GAP) + Vector2(4, 4)
		)
		var accent := tokens.accent_signal if tokens else Color("2FE0C5")
		draw_rect(r, Color(accent, 0.15), true)
		draw_rect(r, accent, false, 2.0)
	## Preview
	if controller and not controller.preview_cells.is_empty() and not testing:
		var prev_col := Color(tokens.accent_beam if tokens else Color("5EEAD4"), 0.35)
		for p in controller.preview_cells:
			if not document.in_bounds(p.x, p.y):
				continue
			var pr := Rect2(origin + Vector2(p) * (cell_size + CELL_GAP), Vector2(cell_size, cell_size))
			draw_rect(pr, prev_col, true)


func _draw_cell(rect: Rect2, cell: EditorCell, pos: Vector2i) -> void:
	var base := Color("1A222C")
	var occ := String(cell.occupant_id)
	if COLOR_MAP.has(occ):
		base = COLOR_MAP[occ]
	elif not cell.puzzle.is_empty():
		base = Color("3D4A5C")
	draw_rect(rect, base, true)
	var border := Color(1, 1, 1, 0.08)
	draw_rect(rect, border, false, 1.0)
	## Floor marker
	if not cell.floor_puzzle.is_empty():
		var inset := rect.grow(-cell_size * 0.28)
		draw_rect(inset, Color(tokens.accent_beam if tokens else Color("5EEAD4"), 0.45), false, 2.0)
	## Object label
	var label := occ
	if not cell.puzzle.is_empty():
		label = str(cell.puzzle.get("def", occ)).substr(0, 3).to_upper()
	if label != "" and label.length() <= 4:
		var font := ThemeDB.fallback_font
		var fs := int(clamp(cell_size * 0.32, 10, 18))
		var ts := font.get_string_size(label, HORIZONTAL_ALIGNMENT_CENTER, -1, fs)
		draw_string(
			font,
			rect.position + (rect.size - ts) * 0.5 + Vector2(0, ts.y * 0.75),
			label,
			HORIZONTAL_ALIGNMENT_LEFT,
			-1,
			fs,
			Color(0.05, 0.07, 0.09, 0.85)
		)
	## Hover / drag highlight
	if _drag_cell == pos:
		draw_rect(rect, Color(1, 1, 1, 0.12), true)


func _board_origin() -> Vector2:
	var bw := document.width * cell_size + (document.width - 1) * CELL_GAP
	var bh := document.height * cell_size + (document.height - 1) * CELL_GAP
	return (size - Vector2(bw, bh)) * 0.5


func cell_at(local_pos: Vector2) -> Vector2i:
	if document == null:
		return Vector2i(-1, -1)
	var origin := _board_origin()
	var p := local_pos - origin
	var step := cell_size + CELL_GAP
	var x := int(floor(p.x / step))
	var y := int(floor(p.y / step))
	if not document.in_bounds(x, y):
		return Vector2i(-1, -1)
	## Reject gap hits roughly
	var lx := p.x - x * step
	var ly := p.y - y * step
	if lx > cell_size or ly > cell_size:
		return Vector2i(-1, -1)
	return Vector2i(x, y)


func _gui_input(event: InputEvent) -> void:
	if document == null:
		return
	var testing := controller != null and controller.test_session.active
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT:
			var cell := cell_at(mb.position)
			if mb.pressed:
				if cell.x < 0:
					return
				_pointer_down = true
				_drag_cell = cell
				_swipe_origin = mb.position
				_swipe_cell = cell
				_swiping = testing
				if testing:
					accept_event()
					return
				cell_pressed.emit(cell, mb.shift_pressed)
				accept_event()
			else:
				if not _pointer_down:
					return
				_pointer_down = false
				if testing and _swiping:
					_finish_swipe(mb.position)
				elif cell.x >= 0:
					cell_released.emit(cell)
				_drag_cell = Vector2i(-1, -1)
				queue_redraw()
				accept_event()
	elif event is InputEventMouseMotion and _pointer_down:
		var mm := event as InputEventMouseMotion
		var cell2 := cell_at(mm.position)
		if testing:
			accept_event()
			return
		if cell2.x >= 0 and cell2 != _drag_cell:
			_drag_cell = cell2
			cell_dragged.emit(cell2)
			queue_redraw()
		accept_event()


func _finish_swipe(pos: Vector2) -> void:
	var delta := pos - _swipe_origin
	if delta.length() < cell_size * 0.35:
		return
	if absf(delta.x) >= absf(delta.y):
		var dir := 1 if delta.x > 0 else -1
		swipe_shift.emit(true, _swipe_cell.y, dir)
	else:
		var dir2 := 1 if delta.y > 0 else -1
		swipe_shift.emit(false, _swipe_cell.x, dir2)


func _can_drop_data(at_position: Vector2, data: Variant) -> bool:
	if controller == null or controller.test_session.active:
		return false
	if not (data is Dictionary):
		return false
	var kind := str(data.get("kind", ""))
	if kind not in ["color", "object", "floor"]:
		return false
	return cell_at(at_position).x >= 0


func _drop_data(at_position: Vector2, data: Variant) -> void:
	if not (data is Dictionary) or controller == null:
		return
	var cell := cell_at(at_position)
	if cell.x < 0:
		return
	var kind := str(data.get("kind", ""))
	var id := StringName(str(data.get("id", "")))
	match kind:
		"color":
			controller.set_paint_color(id)
		"object":
			controller.set_paint_object(id)
		"floor":
			controller.set_paint_floor(id)
	controller.set_tool(EditorTool.Id.BRUSH)
	controller.begin_pointer(cell, false)
	controller.end_pointer(cell)
