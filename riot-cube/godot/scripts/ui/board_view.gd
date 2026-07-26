class_name RiotBoardView
extends Control

signal twist_requested(twist: Dictionary)

const COMMIT_PX := 36.0
const PREVIEW_PX := 18.0

var session: RiotSession
var _cell: float = 64.0
var _gap: float = 8.0
var _origin := Vector2.ZERO
var _drag_from: Vector2 = Vector2.ZERO
var _drag_cell := Vector2i(-1, -1)
var _dragging := false
var _preview: Dictionary = {}
var _flash: Dictionary = {} ## "r,c" -> float 0..1
var _float_text := ""
var _float_life := 0.0


func bind(p_session: RiotSession) -> void:
	session = p_session
	session.changed.connect(queue_redraw)
	_layout_board()
	queue_redraw()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_layout_board()
		queue_redraw()


func _layout_board() -> void:
	if session == null:
		return
	var n: int = int(session.level["size"])
	var side: float = minf(size.x, size.y)
	_gap = 8.0
	_cell = (side - _gap * float(n - 1)) / float(n)
	var board_size := _cell * float(n) + _gap * float(n - 1)
	_origin = Vector2((size.x - board_size) * 0.5, (size.y - board_size) * 0.5)


func _cell_rect(r: int, c: int) -> Rect2:
	return Rect2(
		_origin + Vector2(float(c) * (_cell + _gap), float(r) * (_cell + _gap)),
		Vector2(_cell, _cell)
	)


func _hit_cell(pos: Vector2) -> Vector2i:
	var n: int = int(session.level["size"])
	for r in n:
		for c in n:
			if _cell_rect(r, c).has_point(pos):
				return Vector2i(c, r) ## x=c y=r
	return Vector2i(-1, -1)


func _process(delta: float) -> void:
	var dirty := false
	var keys: Array = _flash.keys()
	for k in keys:
		_flash[k] = float(_flash[k]) - delta * 3.0
		if float(_flash[k]) <= 0.0:
			_flash.erase(k)
		dirty = true
	if _float_life > 0.0:
		_float_life -= delta
		if _float_life <= 0.0:
			_float_text = ""
		dirty = true
	if dirty:
		queue_redraw()


func flash_changes(before: Array) -> void:
	var n: int = int(session.level["size"])
	for r in n:
		for c in n:
			if before[r][c] != session.board[r][c]:
				_flash["%d,%d" % [r, c]] = 1.0
	queue_redraw()


func show_float(text: String) -> void:
	_float_text = text
	_float_life = 0.9
	queue_redraw()


func _gui_input(event: InputEvent) -> void:
	if session == null or session.status != "playing":
		return
	if event is InputEventScreenTouch:
		var st := event as InputEventScreenTouch
		if st.pressed:
			_begin_drag(st.position)
		else:
			_end_drag(st.position)
	elif event is InputEventScreenDrag:
		var sd := event as InputEventScreenDrag
		_move_drag(sd.position)
	elif event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index != MOUSE_BUTTON_LEFT:
			return
		if mb.pressed:
			_begin_drag(mb.position)
		else:
			_end_drag(mb.position)
	elif event is InputEventMouseMotion and _dragging:
		var mm := event as InputEventMouseMotion
		_move_drag(mm.position)


func _begin_drag(pos: Vector2) -> void:
	var cell := _hit_cell(pos)
	if cell.x < 0:
		return
	_dragging = true
	_drag_from = pos
	_drag_cell = cell
	_preview = {}
	queue_redraw()


func _move_drag(pos: Vector2) -> void:
	if not _dragging:
		return
	var d := pos - _drag_from
	if absf(d.x) < PREVIEW_PX and absf(d.y) < PREVIEW_PX:
		_preview = {}
		queue_redraw()
		return
	if absf(d.x) >= absf(d.y):
		_preview = {"axis": "row", "index": _drag_cell.y, "dir": 1 if d.x > 0.0 else -1}
	else:
		_preview = {"axis": "col", "index": _drag_cell.x, "dir": 1 if d.y > 0.0 else -1}
	queue_redraw()


func _end_drag(pos: Vector2) -> void:
	if not _dragging:
		return
	var d := pos - _drag_from
	_dragging = false
	_preview = {}
	var twist: Dictionary = {}
	if absf(d.x) >= COMMIT_PX or absf(d.y) >= COMMIT_PX:
		if absf(d.x) >= absf(d.y):
			twist = {"axis": "row", "index": _drag_cell.y, "dir": 1 if d.x > 0.0 else -1}
		else:
			twist = {"axis": "col", "index": _drag_cell.x, "dir": 1 if d.y > 0.0 else -1}
	_drag_cell = Vector2i(-1, -1)
	queue_redraw()
	if not twist.is_empty():
		twist_requested.emit(twist)


func _draw() -> void:
	if session == null:
		return
	# Cardboard backing
	var n: int = int(session.level["size"])
	var board_size := _cell * float(n) + _gap * float(n - 1)
	var back := Rect2(_origin - Vector2(14, 14), Vector2(board_size, board_size) + Vector2(28, 28))
	draw_rect(back, Color("#2a2118"), true)
	draw_rect(back, Color("#111111"), false, 4.0)

	for r in n:
		for c in n:
			var kind = session.board[r][c]
			if kind == null:
				continue
			var rect := _cell_rect(r, c)
			var ox := 0.0
			var oy := 0.0
			if not _preview.is_empty():
				if str(_preview["axis"]) == "row" and int(_preview["index"]) == r:
					ox = float(_preview["dir"]) * _cell * 0.12
				if str(_preview["axis"]) == "col" and int(_preview["index"]) == c:
					oy = float(_preview["dir"]) * _cell * 0.12
			var flash := float(_flash.get("%d,%d" % [r, c], 0.0))
			_draw_sticker(str(kind), rect.position + Vector2(ox, oy), rect.size.x, flash)

	if _float_life > 0.0 and _float_text != "":
		var alpha := clampf(_float_life * 2.0, 0.0, 1.0)
		draw_string(
			ThemeDB.fallback_font,
			Vector2(size.x * 0.5 - 60.0, _origin.y - 18.0),
			_float_text,
			HORIZONTAL_ALIGNMENT_LEFT,
			-1,
			28,
			Color(0.78, 1.0, 0.24, alpha)
		)


func _draw_sticker(kind: String, pos: Vector2, s: float, flash: float) -> void:
	var pad := s * 0.06
	var outer := Rect2(pos + Vector2(pad * 0.3, pad * 0.3), Vector2(s - pad * 0.6, s - pad * 0.6))
	var inner := Rect2(pos + Vector2(pad * 1.4, pad * 1.4), Vector2(s - pad * 2.8, s - pad * 2.8))
	var cols: Dictionary = TileKind.colors(kind)
	draw_rect(outer, Color("#f7f7f2"), true)
	draw_rect(outer, Color("#111111"), false, 3.0)
	draw_rect(inner, cols["fill"], true)
	draw_rect(inner, Color("#111111"), false, 2.0)
	_draw_icon(kind, outer.get_center(), s)
	if flash > 0.0:
		draw_rect(outer, Color(1, 1, 1, 0.35 * flash), true)


## Icons fit inside the sticker face. `s` is cell size in pixels.
func _draw_icon(kind: String, center: Vector2, s: float) -> void:
	var u := s * 0.28
	var ink := Color("#111111")
	var lw := maxf(1.5, s * 0.03)
	match kind:
		TileKind.HEART:
			# Contrast glyph on pink face
			var pts := PackedVector2Array([
				center + Vector2(0, 0.95) * u,
				center + Vector2(-1.05, 0.05) * u,
				center + Vector2(-0.55, -0.75) * u,
				center + Vector2(0, -0.2) * u,
				center + Vector2(0.55, -0.75) * u,
				center + Vector2(1.05, 0.05) * u,
			])
			draw_colored_polygon(pts, Color("#1a1a1a"))
			draw_polyline(pts + PackedVector2Array([pts[0]]), ink, lw, true)
		TileKind.BOLT:
			var pts := PackedVector2Array([
				center + Vector2(0.15, -1.05) * u,
				center + Vector2(-0.55, 0.1) * u,
				center + Vector2(0.1, 0.1) * u,
				center + Vector2(-0.15, 1.05) * u,
				center + Vector2(0.65, -0.1) * u,
				center + Vector2(-0.05, -0.1) * u,
			])
			draw_colored_polygon(pts, Color("#1a1a1a"))
			draw_polyline(pts + PackedVector2Array([pts[0]]), ink, lw, true)
		TileKind.STAR:
			var pts := PackedVector2Array()
			for i in 5:
				var a := -PI / 2.0 + float(i) * TAU / 5.0
				var b := a + PI / 5.0
				pts.append(center + Vector2(cos(a), sin(a)) * u)
				pts.append(center + Vector2(cos(b), sin(b)) * u * 0.42)
			draw_colored_polygon(pts, Color("#1a1a1a"))
			draw_polyline(pts + PackedVector2Array([pts[0]]), ink, lw, true)
		TileKind.DIAMOND:
			var pts := PackedVector2Array([
				center + Vector2(0, -1.0) * u,
				center + Vector2(0.9, 0) * u,
				center + Vector2(0, 1.0) * u,
				center + Vector2(-0.9, 0) * u,
			])
			draw_colored_polygon(pts, Color("#0a1628"))
			draw_polyline(pts + PackedVector2Array([pts[0]]), ink, lw, true)
		TileKind.FLAME:
			draw_circle(center + Vector2(0, 0.1) * u, u * 0.72, Color("#ffe566"))
			draw_circle(center + Vector2(0, -0.15) * u, u * 0.38, Color("#fff3a8"))
		TileKind.SKULL:
			draw_circle(center + Vector2(0, -0.08) * u, u * 0.72, Color("#f2f2f2"))
			draw_line(center + Vector2(-0.38, -0.28) * u, center + Vector2(-0.12, 0.02) * u, ink, lw)
			draw_line(center + Vector2(-0.12, -0.28) * u, center + Vector2(-0.38, 0.02) * u, ink, lw)
			draw_line(center + Vector2(0.12, -0.28) * u, center + Vector2(0.38, 0.02) * u, ink, lw)
			draw_line(center + Vector2(0.38, -0.28) * u, center + Vector2(0.12, 0.02) * u, ink, lw)
		_:
			draw_circle(center, u * 0.45, Color("#1a1a1a"))
