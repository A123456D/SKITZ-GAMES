class_name BoardFeelController
extends Node
## Orchestrates BoardSession apply + view juice. Sim stays pure; this owns chaining.
## SatisfactionDirector plays EffectRecipe data for commit / land / wrap / reject / combo.
##
## Chain policy (docs/MOVEMENT_FEEL.md + docs/SATISFACTION_JUICE.md):
## 1. Intents enqueue BoardCommands (cap = max_command_queue).
## 2. Idle → apply sim immediately + start ShiftAnimator (visual commit < 1 frame).
## 3. Busy → buffer; on animation_finished commit next with shortened duration.
## 4. Optional interrupt-blend snaps current visuals then starts next mid-flight.

signal shift_committed(command: BoardCommand, moves: Array)
signal queue_changed(depth: int)
signal combo_hook(depth: int)

@export var feel: ShiftFeelConfig
@export var catalog: SatisfactionCatalog
@export var land_burst_scene: PackedScene
@export var wrap_spark_scene: PackedScene

var session: BoardSession = null
var bridge: BoardViewBridge = null
var board_view: BoardView = null
var juice_camera: JuiceCamera = null
var animator: ShiftAnimator = null
var trails: TrailRenderer = null
var audio: FeelAudio = null
var haptics: FeelHaptics = null
var input_controller: BoardInputController = null
var satisfaction: SatisfactionDirector = null
var ui_feel: UiFeel = null

var _queue: Array[BoardCommand] = []
var _playing_moves: Array = []
var _land_pool: NodePool
var _wrap_pool: NodePool
var _combo_depth: int = 0
var _owning_animate: bool = false
var quality: VisualQualityConfig = null
## Optional puzzle engine — enables AxisLockFilter before BoardSim apply.
var puzzle_engine: PuzzleEngine = null


func setup(
	p_session: BoardSession,
	p_bridge: BoardViewBridge,
	p_board: BoardView,
	p_feel: ShiftFeelConfig = null
) -> void:
	session = p_session
	bridge = p_bridge
	board_view = p_board
	if p_feel:
		feel = p_feel
	if feel == null:
		feel = ShiftFeelConfig.new()
	if catalog == null:
		catalog = SatisfactionCatalog.load_or_builtin()

	_ensure_children()
	_ensure_particle_pools()
	juice_camera.configure(feel)
	trails.configure(feel)
	animator.configure(feel, trails)
	audio.configure(feel)
	if board_view:
		audio.set_board_rect(Rect2(Vector2.ZERO, board_view.board_pixel_size()))
	haptics.configure(feel)
	input_controller.configure(feel, board_view)

	satisfaction.setup(feel, catalog)
	satisfaction.bind_layers(juice_camera, audio, haptics, board_view)
	satisfaction.particle_emitter = _emit_from_director
	ui_feel.setup(satisfaction, feel)

	if bridge:
		if not bridge.board_needs_rebuild.is_connected(_on_rebuild):
			bridge.board_needs_rebuild.connect(_on_rebuild)
		if not bridge.command_rejected.is_connected(_on_rejected):
			bridge.command_rejected.connect(_on_rejected)
		if not bridge.animate_moves.is_connected(_on_bridge_animate_ignored):
			bridge.animate_moves.connect(_on_bridge_animate_ignored)

	if not input_controller.shift_row_intent.is_connected(_on_shift_row):
		input_controller.shift_row_intent.connect(_on_shift_row)
	if not input_controller.shift_column_intent.is_connected(_on_shift_col):
		input_controller.shift_column_intent.connect(_on_shift_col)
	if not input_controller.undo_intent.is_connected(_on_undo):
		input_controller.undo_intent.connect(_on_undo)

	if not animator.animation_finished.is_connected(_on_anim_finished):
		animator.animation_finished.connect(_on_anim_finished)
	if not animator.handoff_ready.is_connected(_on_handoff):
		animator.handoff_ready.connect(_on_handoff)

	if session:
		board_view.rebuild(session.get_state())


func _ensure_children() -> void:
	if juice_camera == null:
		juice_camera = get_node_or_null("JuiceCamera") as JuiceCamera
		if juice_camera == null:
			juice_camera = JuiceCamera.new()
			juice_camera.name = "JuiceCamera"
			add_child(juice_camera)
	if trails == null:
		trails = get_node_or_null("Trails") as TrailRenderer
		if trails == null:
			trails = TrailRenderer.new()
			trails.name = "Trails"
			add_child(trails)
	if animator == null:
		animator = get_node_or_null("ShiftAnimator") as ShiftAnimator
		if animator == null:
			animator = ShiftAnimator.new()
			animator.name = "ShiftAnimator"
			add_child(animator)
	if audio == null:
		audio = get_node_or_null("FeelAudio") as FeelAudio
		if audio == null:
			audio = FeelAudio.new()
			audio.name = "FeelAudio"
			add_child(audio)
	if haptics == null:
		haptics = FeelHaptics.new()
	if input_controller == null:
		input_controller = get_node_or_null("BoardInput") as BoardInputController
		if input_controller == null:
			input_controller = BoardInputController.new()
			input_controller.name = "BoardInput"
			add_child(input_controller)
	if satisfaction == null:
		satisfaction = get_node_or_null("Satisfaction") as SatisfactionDirector
		if satisfaction == null:
			satisfaction = SatisfactionDirector.new()
			satisfaction.name = "Satisfaction"
			add_child(satisfaction)
	if ui_feel == null:
		ui_feel = get_node_or_null("UiFeel") as UiFeel
		if ui_feel == null:
			ui_feel = UiFeel.new()
			ui_feel.name = "UiFeel"
			add_child(ui_feel)


func enqueue(cmd: BoardCommand) -> void:
	if cmd == null:
		return
	if feel == null:
		feel = ShiftFeelConfig.new()
	if _queue.size() >= feel.max_command_queue:
		_queue.pop_front()
	_queue.append(cmd)
	queue_changed.emit(_queue.size())

	if feel.allow_interrupt_blend and animator.is_busy():
		_interrupt_and_commit()
		return
	if not animator.is_busy():
		_commit_next()


func _on_shift_row(row: int, dir: int, steps: int) -> void:
	enqueue(BoardCommand.shift_row(row, dir, steps))


func _on_shift_col(column: int, dir: int, steps: int) -> void:
	enqueue(BoardCommand.shift_column(column, dir, steps))


func _on_undo() -> void:
	_queue.clear()
	queue_changed.emit(0)
	_combo_depth = 0
	if audio:
		audio.reset_combo()
	if animator.is_busy():
		animator.kill(true)
		if not _playing_moves.is_empty():
			board_view.rematerialize_indices(_playing_moves)
			_playing_moves = []
	if session:
		session.undo()
	if satisfaction:
		satisfaction.set_chain_depth(0)
		satisfaction.play(&"undo_redo", {})


func _commit_next() -> void:
	if _queue.is_empty() or session == null or board_view == null:
		return
	if animator.is_busy():
		return

	var cmd: BoardCommand = _queue.pop_front()
	queue_changed.emit(_queue.size())

	## Axis-lock: cycle around fixed cells, or reject only when impossible.
	if puzzle_engine:
		var plan := AxisLockFilter.plan_cycle_around_locks(puzzle_engine, cmd)
		if not plan.is_empty() and bool(plan.get("reject", false)):
			_combo_depth = 0
			if satisfaction:
				satisfaction.play(&"invalid_input", {})
			if ui_feel:
				ui_feel.invalid()
			return
		if not plan.is_empty() and not bool(plan.get("noop", false)):
			_commit_axis_cycle(cmd, plan)
			return
		if not plan.is_empty() and bool(plan.get("noop", false)):
			return
		if not AxisLockFilter.allows_command(puzzle_engine, cmd):
			_combo_depth = 0
			if satisfaction:
				satisfaction.play(&"invalid_input", {})
			if ui_feel:
				ui_feel.invalid()
			return

	var dir_vec := _dir_vector(cmd)
	var queue_busy := _queue.size() > 0
	if satisfaction:
		satisfaction.set_chain_depth(_combo_depth)
		satisfaction.play(&"swipe_commit", {
			"direction": dir_vec,
			"queue_busy": queue_busy or _combo_depth > 0,
		})

	_owning_animate = true
	var result := session.apply(cmd)
	_owning_animate = false

	if not result.success:
		_combo_depth = 0
		if satisfaction:
			satisfaction.play(&"invalid_input", {})
		return

	_combo_depth += 1
	if _combo_depth >= 2:
		combo_hook.emit(_combo_depth)
		if satisfaction and (_combo_depth == 2 or (_combo_depth % 3) == 0):
			satisfaction.play(&"combo_cascade", {"direction": dir_vec})

	var dur := feel.effective_duration(_queue.size())
	var ctx := {
		"command": cmd,
		"direction": dir_vec,
		"dir_sign": cmd.dir,
		"anticipation": _combo_depth <= 1 and not queue_busy,
	}
	_playing_moves = result.moves
	_ensure_trails_parent()
	animator.play(
		result.moves,
		func(m: TileMove) -> BoardTileView: return board_view.tile_for_move(m),
		func(x: int, y: int) -> Vector2: return board_view.cell_position(x, y),
		board_view.cell_size,
		board_view.board_pixel_size(),
		ctx,
		dur
	)
	shift_committed.emit(cmd, result.moves)


func _commit_axis_cycle(cmd: BoardCommand, plan: Dictionary) -> void:
	var dir_vec := _dir_vector(cmd)
	var queue_busy := _queue.size() > 0
	if satisfaction:
		satisfaction.set_chain_depth(_combo_depth)
		satisfaction.play(&"swipe_commit", {
			"direction": dir_vec,
			"queue_busy": queue_busy or _combo_depth > 0,
		})
	var writes: Array = plan.get("writes", [])
	var moves: Array = plan.get("moves", [])
	var meta := {
		"movable": plan.get("movable", []),
		"k": int(plan.get("k", 0)),
		"is_row": bool(plan.get("is_row", false)),
	}
	_owning_animate = true
	var result := session.apply_axis_cycle(cmd, writes, moves, true, meta)
	AxisLockFilter.remap_connections_for_cycle(
		session.get_state(),
		cmd,
		meta["movable"],
		int(meta["k"]),
		bool(meta["is_row"])
	)
	_owning_animate = false
	if not result.success:
		_combo_depth = 0
		if satisfaction:
			satisfaction.play(&"invalid_input", {})
		return
	_combo_depth += 1
	var dur := feel.effective_duration(_queue.size())
	var ctx := {
		"command": cmd,
		"direction": dir_vec,
		"dir_sign": cmd.dir,
		"anticipation": _combo_depth <= 1 and not queue_busy,
		"axis_cycle": true,
	}
	_playing_moves = result.moves
	_ensure_trails_parent()
	animator.play(
		result.moves,
		func(m: TileMove) -> BoardTileView: return board_view.tile_for_move(m),
		func(x: int, y: int) -> Vector2: return board_view.cell_position(x, y),
		board_view.cell_size,
		board_view.board_pixel_size(),
		ctx,
		dur
	)
	shift_committed.emit(cmd, result.moves)


func _ensure_trails_parent() -> void:
	if trails == null or board_view == null:
		return
	if trails.get_parent() != board_view:
		if trails.get_parent():
			trails.get_parent().remove_child(trails)
		board_view.add_child(trails)
		board_view.move_child(trails, 0)


func _on_handoff(_ctx: Dictionary) -> void:
	if _queue.is_empty() or not feel.allow_interrupt_blend:
		return
	_interrupt_and_commit()


func _on_anim_finished(ctx: Dictionary) -> void:
	if not _playing_moves.is_empty():
		board_view.rematerialize_indices(_playing_moves)

	var dir: Vector2 = ctx.get("direction", Vector2.RIGHT)
	var any_wrap := bool(ctx.get("any_wrap", false))
	var targets: Array = []
	var positions: Array = []
	for item in _playing_moves:
		if not (item is TileMove):
			continue
		var m: TileMove = item
		var tile := board_view.tile_for_move(m) if board_view else null
		if tile:
			targets.append(tile)
		if board_view:
			positions.append(board_view.cell_position(m.to_x, m.to_y) + board_view.cell_size * 0.5)

	if satisfaction:
		satisfaction.set_chain_depth(_combo_depth)
		var land_id := &"land_settle"
		if _queue.size() > 0:
			land_id = &"chain_queue"
		satisfaction.play(land_id, {
			"direction": dir,
			"targets": targets,
			"positions": positions,
			"any_wrap": any_wrap,
		})
		if any_wrap:
			satisfaction.play(&"wrap_edge", {
				"direction": dir,
				"targets": targets,
				"positions": positions,
				"any_wrap": true,
			})
	else:
		# Fallback if director missing.
		audio.play_tick()
		audio.play_land()
		haptics.on_land()
		juice_camera.add_trauma(feel.land_trauma, dir)
		if feel.wants_particles():
			_spawn_bursts(_playing_moves, any_wrap)

	_playing_moves = []
	if _queue.is_empty():
		_combo_depth = 0
		if audio:
			audio.reset_combo()
		if satisfaction:
			satisfaction.set_chain_depth(0)
		if session:
			board_view.sync_occupants(session.get_state())
	else:
		_commit_next()


func _interrupt_and_commit() -> void:
	animator.kill(true)
	if not _playing_moves.is_empty():
		board_view.rematerialize_indices(_playing_moves)
		_playing_moves = []
	_commit_next()


func _on_rebuild(state: BoardState) -> void:
	_queue.clear()
	queue_changed.emit(0)
	_combo_depth = 0
	if audio:
		audio.reset_combo()
	animator.kill(false)
	_playing_moves = []
	board_view.rebuild(state)


func _on_rejected(_reason: StringName, _cmd: BoardCommand) -> void:
	if satisfaction:
		satisfaction.play(&"invalid_input", {})
	else:
		audio.play_tick()


func _on_bridge_animate_ignored(_moves: Array, _context: Dictionary) -> void:
	if _owning_animate:
		return
	if session:
		board_view.rebuild(session.get_state())


func _dir_vector(cmd: BoardCommand) -> Vector2:
	if cmd == null:
		return Vector2.RIGHT
	match cmd.type:
		BoardEnums.CommandType.SHIFT_ROW:
			return Vector2(float(cmd.dir), 0.0)
		BoardEnums.CommandType.SHIFT_COLUMN:
			return Vector2(0.0, float(cmd.dir))
		_:
			return Vector2.RIGHT


func _ensure_particle_pools() -> void:
	if _land_pool == null:
		_land_pool = NodePool.new(func() -> Node: return _factory_burst(false), 12)
	if _wrap_pool == null:
		_wrap_pool = NodePool.new(func() -> Node: return _factory_burst(true), 8)


func _factory_burst(is_wrap: bool) -> Node:
	var scene := wrap_spark_scene if is_wrap and wrap_spark_scene else land_burst_scene
	if scene:
		var inst := scene.instantiate() as Node2D
		if inst is GPUParticles2D:
			var gp0 := inst as GPUParticles2D
			gp0.one_shot = true
			gp0.emitting = false
			if gp0.texture == null:
				gp0.texture = SharedAtlas.soft_glow_texture()
		return inst
	var gp := GPUParticles2D.new()
	gp.one_shot = true
	gp.explosiveness = 1.0
	gp.lifetime = 0.35
	gp.amount = 12
	gp.emitting = false
	gp.texture = SharedAtlas.soft_glow_texture()
	gp.process_material = SharedAtlas.make_particle_material(
		Color("5B8CFF") if is_wrap else Color("2FE0C5"), 40.0, 120.0
	)
	return gp


func _emit_from_director(positions: Array, amount: int, is_wrap: bool) -> void:
	amount = _cap_burst_amount(amount)
	if amount <= 0 or board_view == null:
		return
	var count := mini(positions.size(), PerfBudgets.MAX_BOARD_BURST_SAMPLES)
	if count <= 0:
		return
	var per := maxi(1, amount / count)
	for i in count:
		var pos: Variant = positions[i]
		if pos is Vector2:
			_emit_particles(pos as Vector2, per, is_wrap)


func _spawn_bursts(moves: Array, wrapped: bool) -> void:
	var amount := feel.wrap_burst_amount if wrapped else feel.land_burst_amount
	amount = _cap_burst_amount(amount)
	if amount <= 0 or board_view == null:
		return
	var samples: Array[Vector2] = []
	for item in moves:
		if not (item is TileMove):
			continue
		var m: TileMove = item
		if m.wrapped or samples.size() < 3:
			samples.append(board_view.cell_position(m.to_x, m.to_y) + board_view.cell_size * 0.5)
		if samples.size() >= PerfBudgets.MAX_BOARD_BURST_SAMPLES:
			break
	if samples.is_empty():
		return
	var per := maxi(1, amount / samples.size())
	for pos in samples:
		_emit_particles(pos, per, wrapped)


func _cap_burst_amount(amount: int) -> int:
	if feel and not feel.wants_particles():
		return 0
	var capped := amount
	if quality:
		capped = mini(capped, quality.effective_board_burst_cap())
	elif PowerPolicy.battery_saver:
		capped = int(ceil(float(capped) * PowerPolicy.particle_multiplier()))
	return maxi(0, capped)


func _emit_particles(local_pos: Vector2, amount: int, is_wrap: bool) -> void:
	_ensure_particle_pools()
	var pool := _wrap_pool if is_wrap else _land_pool
	var particles := pool.acquire() as Node2D
	if particles == null:
		return
	board_view.add_child(particles)
	particles.position = local_pos
	particles.z_index = 8
	particles.visible = true
	if particles is GPUParticles2D:
		var gp := particles as GPUParticles2D
		gp.amount = maxi(1, amount)
		gp.preprocess = 0.0
		gp.restart()
		gp.emitting = true
		get_tree().create_timer(gp.lifetime + 0.05).timeout.connect(
			func() -> void:
				_release_particles(particles, is_wrap)
		)


func _release_particles(p: Node2D, is_wrap: bool) -> void:
	if not is_instance_valid(p):
		return
	if p is GPUParticles2D:
		(p as GPUParticles2D).emitting = false
	p.visible = false
	var pool := _wrap_pool if is_wrap else _land_pool
	if pool:
		pool.release(p)
	elif p.get_parent():
		p.get_parent().remove_child(p)
