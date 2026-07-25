class_name LaserBeamLayer
extends Node2D
## Renders PuzzleEvent.LASER_BEAM paths as neon polylines that draw along the path.
## Receiver hit pulses are signaled back to BoardView.

const PuzzleVisualsScript := preload("res://scripts/presentation/board/puzzle_visuals.gd")

signal receiver_hit(cell: Vector2i)
signal beam_drawn(cell: Vector2i)

var tokens: DesignTokens
var cell_size: Vector2 = Vector2(72, 72)
var gap: float = 8.0
var draw_duration: float = 0.28

var _beams: Array[Dictionary] = [] ## {line, full_pts, progress, color, end_cell}
var _pool: Array[Line2D] = []
var _pulse: float = 0.0
var _hit_cells: Array[Vector2i] = []
var quality: VisualQualityConfig = null
var max_beams: int = PerfBudgets.MAX_ACTIVE_BEAMS
var draw_enabled: bool = true


func configure(p_tokens: DesignTokens, p_cell: Vector2, p_gap: float) -> void:
	tokens = p_tokens
	cell_size = p_cell
	gap = p_gap


func set_quality(p_quality: VisualQualityConfig) -> void:
	quality = p_quality
	if quality == null:
		max_beams = PerfBudgets.MAX_ACTIVE_BEAMS
		draw_enabled = true
		draw_duration = 0.28
		return
	match quality.tier:
		VisualQualityConfig.Tier.LOW:
			max_beams = PerfBudgets.MAX_ACTIVE_BEAMS_LOW
			draw_enabled = false ## instant beams on Low
			draw_duration = 0.08
		VisualQualityConfig.Tier.MEDIUM:
			max_beams = mini(PerfBudgets.MAX_ACTIVE_BEAMS, 5)
			draw_enabled = not quality.reduce_motion
			draw_duration = 0.18
		_:
			max_beams = PerfBudgets.MAX_ACTIVE_BEAMS
			draw_enabled = not quality.reduce_motion
			draw_duration = 0.28
	if quality and not quality.effective_bloom():
		## Soften pulse work when bloom/glow are off.
		set_process(draw_enabled or not _beams.is_empty())


func clear_beams() -> void:
	for entry in _beams:
		var line: Line2D = entry.get("line")
		if is_instance_valid(line):
			line.visible = false
			line.clear_points()
			_pool.append(line)
	_beams.clear()
	_hit_cells.clear()


func apply_events(events: Array, board: Control) -> void:
	clear_beams()
	if board == null:
		return
	cell_size = board.get("cell_size") as Vector2
	gap = float(board.get("gap"))
	var hit_set: Dictionary = {}
	var beam_count := 0
	for e in events:
		if not (e is PuzzleEvent):
			continue
		var pe: PuzzleEvent = e
		if pe.kind == PuzzleEvent.Kind.LASER_RECEIVER_HIT:
			hit_set[pe.cell] = true
			continue
		if pe.kind != PuzzleEvent.Kind.LASER_BEAM:
			continue
		if beam_count >= max_beams:
			continue
		var path_raw: Variant = pe.payload.get("path", [])
		if not (path_raw is Array) or (path_raw as Array).is_empty():
			continue
		var color_name := str(pe.payload.get("color", "red"))
		var col: Color = PuzzleVisualsScript.beam_color(color_name, tokens)
		var pts := PackedVector2Array()
		pts.append(_cell_center(pe.cell))
		var end_cell := pe.cell
		for item in path_raw:
			if item is Array and (item as Array).size() >= 2:
				var arr: Array = item
				end_cell = Vector2i(int(arr[0]), int(arr[1]))
				pts.append(_cell_center(end_cell))
			elif item is Vector2i:
				end_cell = item as Vector2i
				pts.append(_cell_center(end_cell))
		if pts.size() < 2:
			continue
		var line := _acquire()
		line.clear_points()
		var start_prog := 0.0 if draw_enabled else 1.0
		if start_prog >= 1.0:
			for p in pts:
				line.add_point(p)
		else:
			line.add_point(pts[0])
		line.default_color = Color(col.r, col.g, col.b, 0.92)
		var w_mul := 0.06 if quality and quality.tier == VisualQualityConfig.Tier.LOW else 0.08
		line.width = maxf(2.0, cell_size.x * w_mul)
		line.visible = true
		_beams.append({
			"line": line,
			"full_pts": pts,
			"progress": start_prog,
			"color": col,
			"end_cell": end_cell,
			"notified": start_prog >= 1.0,
		})
		beam_count += 1
		if start_prog >= 1.0:
			beam_drawn.emit(end_cell)
	for cell in hit_set.keys():
		_hit_cells.append(cell as Vector2i)
		receiver_hit.emit(cell as Vector2i)
	set_process(not _beams.is_empty())


func _process(delta: float) -> void:
	if _beams.is_empty():
		set_process(false)
		return
	_pulse += delta
	var breathe := 1.0
	if quality == null or quality.tier != VisualQualityConfig.Tier.LOW:
		breathe = 0.85 + 0.15 * sin(_pulse * 4.5)
	for entry in _beams:
		var line: Line2D = entry["line"]
		if not is_instance_valid(line) or not line.visible:
			continue
		var prog: float = float(entry["progress"])
		if prog < 1.0:
			prog = minf(1.0, prog + delta / maxf(0.08, draw_duration))
			entry["progress"] = prog
			_apply_progress(line, entry["full_pts"] as PackedVector2Array, prog)
			if prog >= 1.0 and not bool(entry["notified"]):
				entry["notified"] = true
				beam_drawn.emit(entry["end_cell"] as Vector2i)
		var w_mul := 0.055 if quality and quality.tier == VisualQualityConfig.Tier.LOW else 0.075
		line.width = maxf(2.0, cell_size.x * w_mul * breathe)


func _apply_progress(line: Line2D, full: PackedVector2Array, t: float) -> void:
	line.clear_points()
	if full.size() < 2:
		return
	## Total path length for uniform draw speed.
	var lengths: Array[float] = [0.0]
	var total := 0.0
	for i in range(1, full.size()):
		total += full[i].distance_to(full[i - 1])
		lengths.append(total)
	if total <= 0.001:
		line.add_point(full[0])
		line.add_point(full[full.size() - 1])
		return
	var target := total * clampf(t, 0.0, 1.0)
	line.add_point(full[0])
	for i in range(1, full.size()):
		var seg_end: float = lengths[i]
		if seg_end <= target:
			line.add_point(full[i])
		else:
			var seg_start: float = lengths[i - 1]
			var local_t := 0.0 if seg_end <= seg_start else (target - seg_start) / (seg_end - seg_start)
			line.add_point(full[i - 1].lerp(full[i], local_t))
			break


func _cell_center(cell: Vector2i) -> Vector2:
	var step := cell_size + Vector2(gap, gap)
	return Vector2(float(cell.x) * step.x, float(cell.y) * step.y) + cell_size * 0.5


func _acquire() -> Line2D:
	var line: Line2D
	if not _pool.is_empty():
		line = _pool.pop_back()
	else:
		line = Line2D.new()
		line.antialiased = true
		line.begin_cap_mode = Line2D.LINE_CAP_ROUND
		line.end_cap_mode = Line2D.LINE_CAP_ROUND
		line.joint_mode = Line2D.LINE_JOINT_ROUND
		add_child(line)
	return line
