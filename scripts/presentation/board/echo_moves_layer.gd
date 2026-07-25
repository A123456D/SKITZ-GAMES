class_name EchoMovesLayer
extends Node2D
## Presentation ghost trail of the last N committed shifts.
## EchoSim: after K turns, briefly replay the echo window as ghost board states.

signal echo_replay_started(index: int)

const MAX_ECHOES := 5
const REPLAY_AFTER_TURNS := 4
const SNAPSHOT_CAP := 4
const REPLAY_FRAME_SEC := 0.28

var tokens: DesignTokens
var cell_size: Vector2 = Vector2(64, 64)
var gap: float = 7.0
var board_width: int = 8
var board_height: int = 8
var enabled: bool = true
var reduce_motion: bool = false

var _echoes: Array[Dictionary] = [] ## {cmd_type, row, col, dir, age}
var _snapshots: Array = [] ## Array of Array[String] flat occupant grids (oldest→newest in window)
var _turn_count: int = 0
var _replay_t: float = -1.0
var _replay_index: int = -1
var _replay_frame: int = -1
var _replay_frame_t: float = 0.0
var _replay_snaps: Array = []
var _band: Line2D
var _ghost_pool: Array[Line2D] = []


func configure(p_tokens: DesignTokens, p_cell: Vector2, p_gap: float, w: int, h: int) -> void:
	tokens = p_tokens
	cell_size = p_cell
	gap = p_gap
	board_width = w
	board_height = h
	_ensure_band()


func clear() -> void:
	_echoes.clear()
	_snapshots.clear()
	_turn_count = 0
	_replay_t = -1.0
	_replay_index = -1
	_replay_frame = -1
	_replay_snaps.clear()
	_hide_all_ghosts()
	queue_redraw()


## Capture post-shift board occupants for EchoSim ghost replay.
func capture_board_state(state: BoardState) -> void:
	if not enabled or state == null or reduce_motion:
		return
	var flat: Array = []
	flat.resize(state.width * state.height)
	for y in state.height:
		for x in state.width:
			flat[y * state.width + x] = String(state.get_tile(x, y).occupant_id)
	_snapshots.push_back(flat)
	while _snapshots.size() > SNAPSHOT_CAP:
		_snapshots.pop_front()


func record_shift(cmd: BoardCommand) -> void:
	if not enabled or cmd == null:
		return
	if cmd.type != BoardEnums.CommandType.SHIFT_ROW and cmd.type != BoardEnums.CommandType.SHIFT_COLUMN:
		return
	_echoes.push_front({
		"cmd_type": cmd.type,
		"row": cmd.row,
		"col": cmd.column,
		"dir": cmd.dir,
		"age": 0,
	})
	while _echoes.size() > MAX_ECHOES:
		_echoes.pop_back()
	_turn_count += 1
	## EchoSim — every K turns, replay recent ghost board states + pulse oldest band.
	if _turn_count >= REPLAY_AFTER_TURNS and _echoes.size() >= 2:
		_turn_count = 0
		_replay_index = _echoes.size() - 1
		_replay_t = 0.0
		_replay_snaps = _snapshots.duplicate()
		_replay_frame = 0 if not _replay_snaps.is_empty() else -1
		_replay_frame_t = 0.0
		echo_replay_started.emit(_replay_index)
	_refresh_ghosts()
	queue_redraw()
	set_process(true)


func _process(delta: float) -> void:
	if _replay_t >= 0.0:
		_replay_t += delta
		if _replay_frame >= 0 and not _replay_snaps.is_empty():
			_replay_frame_t += delta
			if _replay_frame_t >= REPLAY_FRAME_SEC:
				_replay_frame_t = 0.0
				_replay_frame += 1
				if _replay_frame >= _replay_snaps.size():
					_replay_frame = _replay_snaps.size() - 1
		var total := maxf(0.55, float(_replay_snaps.size()) * REPLAY_FRAME_SEC + 0.2)
		if _replay_t >= total:
			_replay_t = -1.0
			_replay_index = -1
			_replay_frame = -1
			_replay_snaps.clear()
		queue_redraw()
		_refresh_ghosts()
	elif _echoes.is_empty():
		set_process(false)


func _ensure_band() -> void:
	if _band != null:
		return
	_band = Line2D.new()
	_band.name = "EchoBand"
	_band.width = 3.0
	_band.antialiased = true
	_band.begin_cap_mode = Line2D.LINE_CAP_ROUND
	_band.end_cap_mode = Line2D.LINE_CAP_ROUND
	add_child(_band)


func _refresh_ghosts() -> void:
	_hide_all_ghosts()
	if reduce_motion or not enabled:
		return
	var accent := tokens.accent_signal if tokens else Color(0.66, 0.33, 0.97)
	for i in _echoes.size():
		var e: Dictionary = _echoes[i]
		var line := _acquire_ghost()
		var a := 0.42 * (1.0 - float(i) / float(MAX_ECHOES))
		if i == _replay_index and _replay_t >= 0.0:
			a = 0.85
		line.default_color = Color(accent.r, accent.g, accent.b, a)
		line.width = 4.0 if i == 0 else 2.5
		line.clear_points()
		_fill_line_for_echo(line, e)
		line.visible = true


func _fill_line_for_echo(line: Line2D, e: Dictionary) -> void:
	var step := cell_size + Vector2(gap, gap)
	if int(e["cmd_type"]) == BoardEnums.CommandType.SHIFT_ROW:
		var y := float(int(e["row"])) * step.y + cell_size.y * 0.5
		var x0 := 0.0
		var x1 := float(board_width) * step.x - gap
		line.add_point(Vector2(x0, y))
		line.add_point(Vector2(x1, y))
	else:
		var x := float(int(e["col"])) * step.x + cell_size.x * 0.5
		var y0 := 0.0
		var y1 := float(board_height) * step.y - gap
		line.add_point(Vector2(x, y0))
		line.add_point(Vector2(x, y1))


func _acquire_ghost() -> Line2D:
	for g in _ghost_pool:
		if not g.visible:
			return g
	var line := Line2D.new()
	line.antialiased = true
	line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	line.end_cap_mode = Line2D.LINE_CAP_ROUND
	line.visible = false
	add_child(line)
	_ghost_pool.append(line)
	return line


func _hide_all_ghosts() -> void:
	for g in _ghost_pool:
		g.visible = false
		g.clear_points()


func _draw() -> void:
	if reduce_motion or not enabled:
		return
	_draw_replay_board_ghosts()
	if _echoes.is_empty() or _replay_t < 0.0 or _replay_index < 0 or _replay_index >= _echoes.size():
		return
	var e: Dictionary = _echoes[_replay_index]
	var accent := tokens.accent_beam if tokens else Color(0.13, 0.83, 0.93)
	var pulse := 0.35 + 0.35 * sin(_replay_t * TAU * 3.0)
	var step := cell_size + Vector2(gap, gap)
	if int(e["cmd_type"]) == BoardEnums.CommandType.SHIFT_ROW:
		var y := float(int(e["row"])) * step.y
		var r := Rect2(0.0, y, float(board_width) * step.x - gap, cell_size.y)
		draw_rect(r, Color(accent.r, accent.g, accent.b, pulse * 0.25), true)
	else:
		var x := float(int(e["col"])) * step.x
		var r2 := Rect2(x, 0.0, cell_size.x, float(board_height) * step.y - gap)
		draw_rect(r2, Color(accent.r, accent.g, accent.b, pulse * 0.25), true)


func _draw_replay_board_ghosts() -> void:
	if _replay_frame < 0 or _replay_snaps.is_empty() or _replay_frame >= _replay_snaps.size():
		return
	var flat: Array = _replay_snaps[_replay_frame]
	if flat.is_empty():
		return
	var accent := tokens.accent_signal if tokens else Color(0.66, 0.33, 0.97)
	var beam := tokens.accent_beam if tokens else Color(0.13, 0.83, 0.93)
	var fade := 0.55
	if _replay_t >= 0.0:
		fade = 0.35 + 0.35 * (1.0 - clampf(_replay_t * 0.4, 0.0, 1.0))
	var step := cell_size + Vector2(gap, gap)
	var inset := 6.0
	for y in board_height:
		for x in board_width:
			var idx := y * board_width + x
			if idx >= flat.size():
				continue
			var oid := String(flat[idx])
			if oid.is_empty():
				continue
			var pos := Vector2(float(x) * step.x, float(y) * step.y)
			var r := Rect2(pos + Vector2(inset, inset), cell_size - Vector2(inset * 2.0, inset * 2.0))
			var col := accent if not oid.begins_with("laser") else beam
			draw_rect(r, Color(col.r, col.g, col.b, fade * 0.22), true)
			draw_rect(r, Color(col.r, col.g, col.b, fade * 0.55), false)
