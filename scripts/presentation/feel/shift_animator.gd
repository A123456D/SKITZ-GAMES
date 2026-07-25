class_name ShiftAnimator
extends Node
## Elastic / spring tween of tile visuals for TileMove lists.
## Wrap: primary slides off-edge; ghost enters from opposite. All timing via Tween (seconds).
## Resolve tiles with `tile_for_move: Callable(TileMove) -> BoardTileView` (use source_index).
## Anticipation / axis squash / secondary hooks live here; land juice fans out via SatisfactionDirector.

signal animation_started(context: Dictionary)
signal animation_finished(context: Dictionary)
signal handoff_ready(context: Dictionary)

var feel: ShiftFeelConfig = null
var trails: TrailRenderer = null

var _busy: bool = false
var _tween: Tween = null
var _context: Dictionary = {}
var _active_tiles: Array[BoardTileView] = []
var _ghosts: Array[Control] = []
var _handoff_emitted: bool = false
var _duration: float = 0.11
var _elapsed: float = 0.0


func configure(p_feel: ShiftFeelConfig, p_trails: TrailRenderer = null) -> void:
	feel = p_feel
	trails = p_trails


func is_busy() -> bool:
	return _busy


func remaining_time() -> float:
	return maxf(0.0, _duration - _elapsed)


func play(
	moves: Array,
	tile_for_move: Callable,
	cell_pos: Callable,
	cell_size: Vector2,
	_board_pixel_size: Vector2,
	context: Dictionary = {},
	duration_override: float = -1.0
) -> void:
	if moves.is_empty():
		animation_finished.emit(context)
		return

	kill(false)
	_busy = true
	_context = context.duplicate()
	_handoff_emitted = false
	_elapsed = 0.0
	_duration = duration_override if duration_override > 0.0 else (feel.shift_duration if feel else 0.11)

	var trans := Tween.TRANS_ELASTIC
	var ease := Tween.EASE_OUT
	if feel:
		trans = feel.travel_transition()
		ease = feel.travel_ease_type()
		if feel.reduce_motion:
			trans = Tween.TRANS_CUBIC
			ease = Tween.EASE_OUT
			_duration = minf(_duration, 0.07)

	animation_started.emit(_context)
	_tween = create_tween()
	_tween.set_parallel(true)

	var any_wrap := false
	var move_dir := Vector2.ZERO
	var anticip_dir: Vector2 = _context.get("direction", Vector2.RIGHT) as Vector2
	var do_anticip := feel and not feel.reduce_motion and bool(_context.get("anticipation", true))
	var anticip_t := 0.028 if do_anticip else 0.0

	for item in moves:
		if not (item is TileMove):
			continue
		var m: TileMove = item
		var tile: BoardTileView = tile_for_move.call(m) as BoardTileView
		if tile == null:
			continue

		_active_tiles.append(tile)
		var from_p: Vector2 = cell_pos.call(m.from_x, m.from_y)
		var to_p: Vector2 = cell_pos.call(m.to_x, m.to_y)
		tile.position = from_p
		tile.z_index = 2
		tile.set_meta("deform_base_scale", Vector2.ONE)
		tile.scale = Vector2.ONE

		var tid := tile.get_instance_id()
		if trails and feel and feel.wants_trails():
			trails.begin_trail(tid, tile._base_color, from_p + cell_size * 0.5)

		if do_anticip:
			var ant_scale := MotionDeform.axis_anticipation(anticip_dir, 0.028)
			_tween.tween_property(tile, "scale", ant_scale, anticip_t)\
				.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

		if m.wrapped:
			any_wrap = true
			_animate_wrapped(tile, m, from_p, to_p, cell_size, trans, ease, tid, anticip_t)
		else:
			var delta := to_p - from_p
			move_dir += delta
			tile.set_meta("last_move_dir", delta.normalized() if delta.length_squared() > 0.01 else anticip_dir)
			_tween.tween_property(tile, "position", to_p, _duration).set_trans(trans).set_ease(ease).set_delay(anticip_t)
			if feel and feel.wants_blur():
				_drive_blur(tile, delta.normalized(), feel.motion_blur_strength, anticip_t)
			_tween.tween_method(
				func(p: Vector2) -> void:
					if trails:
						trails.sample(tid, p + cell_size * 0.5),
				from_p,
				to_p,
				_duration
			).set_trans(trans).set_ease(ease).set_delay(anticip_t)

	if move_dir.length_squared() < 0.01 and _context.has("direction"):
		move_dir = _context["direction"] as Vector2

	_context["direction"] = move_dir.normalized() if move_dir.length_squared() > 0.01 else Vector2.RIGHT
	_context["any_wrap"] = any_wrap
	_tween.tween_method(_on_tick, 0.0, _duration + anticip_t, _duration + anticip_t)

	if feel and feel.settle_duration > 0.0 and not feel.reduce_motion:
		_tween.chain().set_parallel(true)
		var settle_dir := _context["direction"] as Vector2
		var sq := MotionDeform.axis_squash(settle_dir, 0.045)
		for tile in _active_tiles:
			_tween.tween_property(tile, "scale", sq, feel.settle_duration * 0.45)\
				.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
			_tween.tween_property(tile, "scale", Vector2.ONE, feel.settle_duration * 0.55)\
				.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)\
				.set_delay(feel.settle_duration * 0.45)

	_tween.finished.connect(_on_tween_finished, CONNECT_ONE_SHOT)


func kill(_snap_to_end: bool = true) -> void:
	if _tween and is_instance_valid(_tween):
		_tween.kill()
	_tween = null
	_cleanup_ghosts()
	for tile in _active_tiles:
		if is_instance_valid(tile):
			tile.z_index = 0
			tile.scale = Vector2.ONE
			tile.modulate.a = 1.0
			tile.set_streak(Vector2.ZERO, 0.0, Color.WHITE)
			if trails:
				trails.end_trail(tile.get_instance_id())
	_active_tiles.clear()
	_busy = false
	_elapsed = 0.0


func _animate_wrapped(
	tile: BoardTileView,
	m: TileMove,
	from_p: Vector2,
	to_p: Vector2,
	cell_size: Vector2,
	trans: Tween.TransitionType,
	ease: Tween.EaseType,
	tid: int,
	delay: float = 0.0
) -> void:
	var sign_axis := int(_context.get("dir_sign", 1))
	var exit_p := from_p
	var enter_p := to_p
	var horizontal := m.from_y == m.to_y
	if horizontal:
		exit_p = from_p + Vector2(float(sign_axis) * (cell_size.x + 8.0), 0.0)
		enter_p = to_p - Vector2(float(sign_axis) * (cell_size.x + 8.0), 0.0)
	else:
		exit_p = from_p + Vector2(0.0, float(sign_axis) * (cell_size.y + 8.0))
		enter_p = to_p - Vector2(0.0, float(sign_axis) * (cell_size.y + 8.0))

	var ghost := tile.duplicate() as Control
	ghost.modulate = Color(1, 1, 1, 0.0)
	ghost.position = enter_p
	tile.get_parent().add_child(ghost)
	_ghosts.append(ghost)

	tile.z_index = 3
	tile.set_meta("last_move_dir", (exit_p - from_p).normalized())
	_tween.tween_property(tile, "position", exit_p, _duration).set_trans(trans).set_ease(ease).set_delay(delay)
	_tween.tween_property(tile, "modulate:a", 0.0, _duration * 0.85).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN).set_delay(delay)
	_tween.tween_property(ghost, "position", to_p, _duration).set_trans(trans).set_ease(ease).set_delay(delay)
	_tween.tween_property(ghost, "modulate:a", 1.0, _duration * 0.4).from(0.0).set_delay(delay)

	if feel and feel.wants_blur():
		var bdir := (exit_p - from_p).normalized()
		_drive_blur(tile, bdir, feel.motion_blur_strength, delay)

	_tween.tween_method(
		func(p: Vector2) -> void:
			if trails:
				trails.sample(tid, p + cell_size * 0.5),
		from_p,
		exit_p,
		_duration
	).set_delay(delay)

	if not _context.has("wrap_snaps"):
		_context["wrap_snaps"] = []
	(_context["wrap_snaps"] as Array).append({"tile": tile, "to": to_p, "ghost": ghost})


func _drive_blur(tile: BoardTileView, dir: Vector2, amount: float, delay: float = 0.0) -> void:
	_tween.tween_method(
		func(a: float) -> void:
			tile.set_streak(dir, a, tile._base_color),
		amount,
		0.0,
		_duration
	).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN).set_delay(delay)


func _on_tick(t: float) -> void:
	_elapsed = t
	if _handoff_emitted or feel == null:
		return
	if feel.handoff_window > 0.0 and (_duration - t) <= feel.handoff_window:
		_handoff_emitted = true
		handoff_ready.emit(_context)


func _on_tween_finished() -> void:
	if _context.has("wrap_snaps"):
		for entry in _context["wrap_snaps"]:
			var tile: BoardTileView = entry["tile"]
			if is_instance_valid(tile):
				tile.position = entry["to"]
				tile.modulate.a = 1.0
				tile.set_streak(Vector2.ZERO, 0.0, Color.WHITE)
			var g: Control = entry["ghost"]
			if is_instance_valid(g):
				g.queue_free()
	_cleanup_ghosts()
	for tile in _active_tiles:
		if is_instance_valid(tile):
			tile.z_index = 0
			tile.scale = Vector2.ONE
			tile.set_streak(Vector2.ZERO, 0.0, Color.WHITE)
			tile.flash_land()
			if feel and not feel.reduce_motion:
				tile.pulse_secondary(_context.get("direction", Vector2.RIGHT) as Vector2)
			if trails:
				trails.end_trail(tile.get_instance_id())
	var ctx := _context.duplicate()
	_active_tiles.clear()
	_busy = false
	_tween = null
	animation_finished.emit(ctx)


func _cleanup_ghosts() -> void:
	for g in _ghosts:
		if is_instance_valid(g):
			g.queue_free()
	_ghosts.clear()
