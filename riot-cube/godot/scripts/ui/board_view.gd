class_name RiotBoardView
extends Control

signal twist_requested(twist: Dictionary)
signal move_finished

const COMMIT_FRAC := 0.35
const FX_PATHS := {
	TileKind.FLAME: "res://assets/fx/fx_flame.png",
	TileKind.HEART: "res://assets/fx/fx_heart.png",
	TileKind.BOLT: "res://assets/fx/fx_bolt.png",
	TileKind.SKULL: "res://assets/fx/fx_skull.png",
	TileKind.STAR: "res://assets/fx/fx_star.png",
	TileKind.DIAMOND: "res://assets/fx/fx_diamond.png",
}

var session: RiotSession
var _cell: float = 64.0
var _gap: float = 8.0
var _stride: float = 72.0
var _origin := Vector2.ZERO

var _drag_from := Vector2.ZERO
var _drag_cell := Vector2i(-1, -1)
var _dragging := false
var _drag_axis := "" ## row|col|""
var _drag_index := -1
var _drag_offset := 0.0

var _visual: Array = []
var _phase := "idle" ## idle|snap|pulse|pop|fall|done_wait
var _phase_t := 0.0
var _waves: Array = []
var _wave_i := 0
var _matched: Dictionary = {} ## "r,c" -> kind
var _pop_scale: Dictionary = {}
var _fx_bursts: Array = [] ## {tex, pos, life, max_life, kind}
var _fall_from: Dictionary = {} ## "r,c" -> current offset
var _fall_start: Dictionary = {} ## "r,c" -> start offset
var _float_text := ""
var _float_life := 0.0
var _fx_tex: Dictionary = {}
var _pending_end := false


func _ready() -> void:
	for kind in FX_PATHS.keys():
		var path: String = FX_PATHS[kind]
		if ResourceLoader.exists(path):
			_fx_tex[kind] = load(path) as Texture2D
	set_process(false)


func bind(p_session: RiotSession) -> void:
	session = p_session
	_sync_visual()
	session.changed.connect(_on_session_changed)
	_layout_board()
	queue_redraw()


func _on_session_changed() -> void:
	if _phase == "idle" and not _dragging and session != null and not session.busy:
		_sync_visual()
		queue_redraw()


func _sync_visual() -> void:
	if session == null:
		return
	_visual = RiotBoard.clone_board(session.board)


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
	_stride = _cell + _gap
	var board_size := _cell * float(n) + _gap * float(n - 1)
	_origin = Vector2((size.x - board_size) * 0.5, (size.y - board_size) * 0.5)


func _cell_base(r: int, c: int) -> Vector2:
	return _origin + Vector2(float(c) * _stride, float(r) * _stride)


func _hit_cell(pos: Vector2) -> Vector2i:
	var n: int = int(session.level["size"])
	for r in n:
		for c in n:
			if Rect2(_cell_base(r, c), Vector2(_cell, _cell)).has_point(pos):
				return Vector2i(c, r)
	return Vector2i(-1, -1)


func capture_visual() -> Array:
	return RiotBoard.clone_board(_visual)


func set_visual(board: Array) -> void:
	_visual = RiotBoard.clone_board(board)
	queue_redraw()


func reset_anim_state() -> void:
	_phase = "idle"
	_waves.clear()
	_matched.clear()
	_pop_scale.clear()
	_fx_bursts.clear()
	_fall_from.clear()
	_fall_start.clear()
	_drag_axis = ""
	_drag_index = -1
	_drag_offset = 0.0
	_pending_end = false
	if session:
		session.busy = false
	_sync_visual()
	queue_redraw()
	_sleep_if_idle()


func show_float(text: String) -> void:
	_float_text = text
	_float_life = 1.1
	_wake()


func _wake() -> void:
	set_process(true)
	queue_redraw()


func _sleep_if_idle() -> void:
	if _phase == "idle" and not _dragging and _fx_bursts.is_empty() and _float_life <= 0.0:
		set_process(false)


func play_twist(twist: Dictionary, waves: Array) -> void:
	_waves = waves
	_wave_i = 0
	_drag_axis = str(twist["axis"])
	_drag_index = int(twist["index"])
	# Keep finger offset so the snap continues from where the drag left off.
	if absf(_drag_offset) < 1.0:
		_drag_offset = float(int(twist["dir"])) * _stride * 0.4
	_phase = "snap"
	_phase_t = 0.0
	_pending_end = true
	_wake()


func _process(delta: float) -> void:
	var dirty := true
	if _float_life > 0.0:
		_float_life -= delta
		if _float_life <= 0.0:
			_float_text = ""

	# Age FX bursts
	var alive: Array = []
	for b in _fx_bursts:
		b["life"] = float(b["life"]) - delta
		if float(b["life"]) > 0.0:
			alive.append(b)
	_fx_bursts = alive

	match _phase:
		"snap":
			_phase_t += delta
			var target := signf(_drag_offset if absf(_drag_offset) > 1.0 else 1.0) * _stride
			# Prefer twist dir from last session twist
			if session and not session.last_twist.is_empty():
				target = float(int(session.last_twist["dir"])) * _stride
			_drag_offset = lerpf(_drag_offset, target, clampf(delta * 14.0, 0.0, 1.0))
			if absf(_drag_offset - target) < 1.5 or _phase_t > 0.22:
				_drag_offset = 0.0
				_drag_axis = ""
				_drag_index = -1
				_sync_visual()
				if _waves.is_empty():
					_phase = "idle"
					_finish_move()
				else:
					_start_wave(0)
		"pulse":
			_phase_t += delta
			# Pulse matched stickers
			for k in _matched.keys():
				_pop_scale[k] = 1.0 + 0.18 * sin(_phase_t * 18.0)
			if _phase_t >= 0.28:
				_spawn_fx_for_matches()
				_phase = "pop"
				_phase_t = 0.0
		"pop":
			_phase_t += delta
			var t := clampf(_phase_t / 0.35, 0.0, 1.0)
			for k in _matched.keys():
				_pop_scale[k] = lerpf(1.15, 0.0, t * t)
			if _phase_t >= 0.35:
				# Reveal board after clear+refill with fall offsets
				var wave: Dictionary = _waves[_wave_i]
				_visual = RiotBoard.clone_board(wave["board_after"])
				_matched.clear()
				_pop_scale.clear()
				_prepare_fall(wave)
				_phase = "fall"
				_phase_t = 0.0
				if session:
					session.apply_wave(wave)
					var combo: int = int(wave["combo"])
					var gain: int = int(wave["score_gain"])
					if combo > 1:
						show_float("COMBO x%d" % combo)
					elif gain > 0:
						show_float("+%d" % gain)
		"fall":
			_phase_t += delta
			var t := clampf(_phase_t / 0.38, 0.0, 1.0)
			var e := t * t * (3.0 - 2.0 * t)
			for k in _fall_start.keys():
				var from: Vector2 = _fall_start[k]
				_fall_from[k] = from.lerp(Vector2.ZERO, e)
			if _phase_t >= 0.38:
				_fall_from.clear()
				_fall_start.clear()
				_wave_i += 1
				if _wave_i < _waves.size():
					_start_wave(_wave_i)
				else:
					_phase = "idle"
					_finish_move()
		_:
			if _fx_bursts.is_empty() and _float_life <= 0.0 and not _dragging:
				dirty = false

	if dirty or _dragging or _phase != "idle":
		queue_redraw()
	_sleep_if_idle()


func _finish_move() -> void:
	if _pending_end and session:
		_pending_end = false
		session.end_twist()
	move_finished.emit()
	_sleep_if_idle()


func _start_wave(i: int) -> void:
	_wave_i = i
	var wave: Dictionary = _waves[i]
	_visual = RiotBoard.clone_board(wave["board_before"])
	_matched.clear()
	_pop_scale.clear()
	for cell in wave["matched_cells"]:
		var key := "%d,%d" % [int(cell["r"]), int(cell["c"])]
		_matched[key] = str(cell["kind"])
		_pop_scale[key] = 1.0
	_phase = "pulse"
	_phase_t = 0.0
	_wake()


func _spawn_fx_for_matches() -> void:
	for key in _matched.keys():
		var parts: PackedStringArray = key.split(",")
		var r := int(parts[0])
		var c := int(parts[1])
		var kind := str(_matched[key])
		var tex: Texture2D = _fx_tex.get(kind, null)
		var pos := _cell_base(r, c) + Vector2(_cell, _cell) * 0.5
		_fx_bursts.append({
			"tex": tex,
			"pos": pos,
			"life": 0.55,
			"max_life": 0.55,
			"kind": kind,
		})


func _prepare_fall(wave: Dictionary) -> void:
	_fall_from.clear()
	_fall_start.clear()
	var before: Array = wave["board_after_clear"]
	var after: Array = wave["board_after"]
	var n: int = after.size()
	for c in n:
		var holes := 0
		for r in n:
			if before[r][c] == null:
				holes += 1
		for r in n:
			if after[r][c] == null:
				continue
			var key := "%d,%d" % [r, c]
			var drop := 0
			if before[r][c] == null:
				drop = maxi(1, holes)
			elif holes > 0 and r > 0:
				# Settling tiles get a short drop for readability
				drop = 1
			if drop > 0:
				var start := Vector2(0, -_stride * float(mini(drop, 4)))
				_fall_start[key] = start
				_fall_from[key] = start


func _gui_input(event: InputEvent) -> void:
	if session == null or session.status != "playing" or session.busy or _phase != "idle":
		return
	if event is InputEventScreenTouch:
		var st := event as InputEventScreenTouch
		if st.pressed:
			_begin_drag(st.position)
		else:
			_end_drag(st.position)
		accept_event()
	elif event is InputEventScreenDrag:
		_move_drag((event as InputEventScreenDrag).position)
		accept_event()
	elif event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index != MOUSE_BUTTON_LEFT:
			return
		if mb.pressed:
			_begin_drag(mb.position)
		else:
			_end_drag(mb.position)
		accept_event()
	elif event is InputEventMouseMotion and _dragging:
		_move_drag((event as InputEventMouseMotion).position)
		accept_event()


func _begin_drag(pos: Vector2) -> void:
	var cell := _hit_cell(pos)
	if cell.x < 0:
		return
	_dragging = true
	_drag_from = pos
	_drag_cell = cell
	_drag_axis = ""
	_drag_index = -1
	_drag_offset = 0.0
	_wake()


func _move_drag(pos: Vector2) -> void:
	if not _dragging:
		return
	var d := pos - _drag_from
	if _drag_axis == "":
		if absf(d.x) < 10.0 and absf(d.y) < 10.0:
			return
		if absf(d.x) >= absf(d.y):
			_drag_axis = "row"
			_drag_index = _drag_cell.y
		else:
			_drag_axis = "col"
			_drag_index = _drag_cell.x
	if _drag_axis == "row":
		_drag_offset = d.x
	else:
		_drag_offset = d.y
	queue_redraw()


func _end_drag(pos: Vector2) -> void:
	if not _dragging:
		return
	_dragging = false
	var d := pos - _drag_from
	var axis := _drag_axis
	var index := _drag_index
	var offset := _drag_offset
	if axis == "":
		if absf(d.x) >= absf(d.y):
			axis = "row"
			index = _drag_cell.y
			offset = d.x
		else:
			axis = "col"
			index = _drag_cell.x
			offset = d.y
	var commit := _stride * COMMIT_FRAC
	if absf(offset) >= commit and axis != "" and index >= 0:
		var twist := {
			"axis": axis,
			"index": index,
			"dir": 1 if offset > 0.0 else -1,
		}
		# Keep offset for snap animation continuity
		_drag_axis = axis
		_drag_index = index
		_drag_offset = offset
		twist_requested_safe(twist)
	else:
		# Spring back
		_drag_axis = ""
		_drag_index = -1
		_drag_offset = 0.0
		queue_redraw()
		_sleep_if_idle()


func twist_requested_safe(twist: Dictionary) -> void:
	twist_requested.emit(twist)


func _draw() -> void:
	if session == null or _visual.is_empty():
		return
	var n: int = int(session.level["size"])
	var board_size := _cell * float(n) + _gap * float(n - 1)
	var back := Rect2(_origin - Vector2(14, 14), Vector2(board_size, board_size) + Vector2(28, 28))
	draw_rect(back, Color("#2a2118"), true)
	draw_rect(back, Color("#111111"), false, 4.0)

	for r in n:
		for c in n:
			var kind = _visual[r][c]
			var key := "%d,%d" % [r, c]
			# During pop, matched cells shrink but still draw until gone
			if _phase == "pop" and _matched.has(key):
				kind = _matched[key]
			elif kind == null:
				continue
			if _phase == "pulse" and _matched.has(key):
				kind = _matched[key]

			var pos := _draw_pos(r, c, n)
			if _fall_from.has(key):
				pos += _fall_from[key]
			var sc := float(_pop_scale.get(key, 1.0))
			_draw_sticker(str(kind), pos, _cell, sc)

	# FX bursts on top
	for b in _fx_bursts:
		var life: float = float(b["life"])
		var max_life: float = float(b["max_life"])
		var t := 1.0 - life / max_life
		var alpha := 1.0 - t
		var scale := lerpf(0.55, 1.35, t)
		var tex: Texture2D = b["tex"]
		var pos: Vector2 = b["pos"]
		if tex != null:
			var sz := Vector2(_cell * 1.8, _cell * 1.8) * scale
			var rect := Rect2(pos - sz * 0.5, sz)
			draw_texture_rect(tex, rect, false, Color(1, 1, 1, alpha))
		else:
			# Fallback circle if texture missing
			draw_circle(pos, _cell * 0.6 * scale, Color(1, 0.5, 0.1, alpha * 0.8))

	if _float_life > 0.0 and _float_text != "":
		var a := clampf(_float_life * 2.0, 0.0, 1.0)
		draw_string(
			ThemeDB.fallback_font,
			Vector2(size.x * 0.5 - 70.0, _origin.y - 22.0),
			_float_text,
			HORIZONTAL_ALIGNMENT_LEFT,
			-1,
			30,
			Color(0.78, 1.0, 0.24, a)
		)


func _draw_pos(r: int, c: int, n: int) -> Vector2:
	var pos := _cell_base(r, c)
	if _drag_axis == "row" and _drag_index == r:
		pos.x += _drag_offset
		# Wrap visually
		var width := float(n) * _stride
		var local := pos.x - _origin.x
		local = fposmod(local, width)
		pos.x = _origin.x + local
	elif _drag_axis == "col" and _drag_index == c:
		pos.y += _drag_offset
		var height := float(n) * _stride
		var local := pos.y - _origin.y
		local = fposmod(local, height)
		pos.y = _origin.y + local
	return pos


func _draw_sticker(kind: String, pos: Vector2, s: float, scale: float = 1.0) -> void:
	if scale <= 0.02:
		return
	var cx := pos.x + s * 0.5
	var cy := pos.y + s * 0.5
	var pad := s * 0.06
	var outer_s := (s - pad * 0.6) * scale
	var outer := Rect2(cx - outer_s * 0.5, cy - outer_s * 0.5, outer_s, outer_s)
	var inset := outer_s * 0.14
	var inner := Rect2(outer.position + Vector2(inset, inset), outer.size - Vector2(inset, inset) * 2.0)
	var cols: Dictionary = TileKind.colors(kind)
	# Soft shadow
	draw_rect(Rect2(outer.position + Vector2(2, 3), outer.size), Color(0, 0, 0, 0.35), true)
	draw_rect(outer, Color("#f7f7f2"), true)
	draw_rect(outer, Color("#111111"), false, 3.0)
	draw_rect(inner, cols["fill"], true)
	draw_rect(inner, Color("#111111"), false, 2.0)
	_draw_icon(kind, outer.get_center(), outer_s)


func _draw_icon(kind: String, center: Vector2, s: float) -> void:
	var u := s * 0.28
	var ink := Color("#111111")
	var lw := maxf(1.5, s * 0.03)
	match kind:
		TileKind.HEART:
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
