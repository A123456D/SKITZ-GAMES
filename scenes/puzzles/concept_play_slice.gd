class_name ConceptPlaySlice
extends Control
## Modes: concept (laser demo) · campaign (authored chapter) · daily · endless.
## BoardSim / PuzzleEngine stay pure; this owns presentation wiring.

const LEVEL_ID := &"concept_play_slice"
const LEVEL_INDEX := 27
const PAR_BEST := 9
const SCENE_PATH := "res://scenes/puzzles/concept_play_slice.tscn"
const MODE_CONCEPT := &"concept"
const MODE_CAMPAIGN := &"campaign"
const MODE_DAILY := &"daily"
const MODE_ENDLESS := &"endless"

var session: BoardSession
var engine: PuzzleEngine
var bridge: BoardViewBridge
var board_view: BoardView
var feel: ShiftFeelConfig
var feel_controller: BoardFeelController
var director: VisualDirector
var tokens: DesignTokens
var hud: MinimalHud
var victory: VictorySheet
var _board_host: Control
var _initial_snapshot: Dictionary = {}
var _moves: int = 0
var _best: int = PAR_BEST
var _solved: bool = false
var _world_skin: WorldSkin.Id = WorldSkin.Id.NEON_GRID
var _want_resume: bool = false
var _play_mode: StringName = MODE_CONCEPT
var _align_puzzle: PuzzleDef = null
var _hint_gen: HintGenerator = HintGenerator.new()
var _hint_stage: int = 0
var _daily_date: String = ""
var _daily_ranked: bool = true
var _endless_wave: int = 1
var _endless_seed: int = 1
var _endless_difficulty: int = 1
var _par_soft: int = -1
var _par_hard: int = -1
var _local_rank: int = -1
var _endless_cleared_any: bool = false
var _gen: PuzzleGenerator = PuzzleGenerator.new()
var _campaign_chapter_id: StringName = &""
var _campaign_level_id: StringName = &""
var _campaign_layout: Dictionary = {}
var _campaign_hint: String = ""
var _level_title: String = "LEVEL"

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_want_resume = _consume_launch_resume()
	_consume_launch_play()
	feel = _load_feel()
	_build_aesthetic()
	_build_session_and_puzzle()
	if _want_resume and (_play_mode == MODE_CONCEPT or _play_mode == MODE_CAMPAIGN):
		_try_restore_resume()
	_build_view()
	_build_feel()
	_build_hud()
	_build_victory()
	_refresh_lasers()
	_persist_progress(false)
	PowerPolicy.set_gameplay_active(true)
	PowerPolicy.set_menu_idle(false)


func _consume_launch_resume() -> bool:
	var gs := get_node_or_null("/root/GameServices")
	if gs == null:
		return false
	var flag: bool = bool(gs.get("launch_resume"))
	gs.set("launch_resume", false)
	return flag


func _consume_launch_play() -> void:
	var gs := get_node_or_null("/root/GameServices")
	if gs == null or not gs.has_method("consume_launch_play"):
		return
	var payload: Dictionary = gs.consume_launch_play()
	if payload.is_empty():
		return
	_play_mode = StringName(str(payload.get("mode", "concept")))
	_daily_date = str(payload.get("date", ""))
	_daily_ranked = bool(payload.get("ranked", true))
	_endless_wave = int(payload.get("wave", 1))
	_endless_seed = int(payload.get("seed", 0))
	_endless_difficulty = clampi(int(payload.get("difficulty", 1)), 1, 10)
	_campaign_chapter_id = StringName(str(payload.get("chapter_id", "")))
	_campaign_level_id = StringName(str(payload.get("level_id", "")))
	if payload.has("par_soft"):
		_par_soft = int(payload.get("par_soft", -1))
	if payload.has("par_hard"):
		_par_hard = int(payload.get("par_hard", -1))
	if payload.has("puzzle") and payload["puzzle"] is Dictionary:
		_align_puzzle = PuzzleDef.from_dict(payload["puzzle"])
	elif _play_mode == MODE_CAMPAIGN:
		_load_campaign_layout()
	elif _play_mode == MODE_DAILY or _play_mode == MODE_ENDLESS:
		_ensure_align_puzzle()


func _load_campaign_layout() -> void:
	if String(_campaign_level_id).is_empty():
		_campaign_level_id = &"ch_signal_01"
	if String(_campaign_chapter_id).is_empty():
		_campaign_chapter_id = CampaignLevelCatalog.CHAPTER_SIGNAL
	_campaign_layout = CampaignLevelCatalog.get_level(_campaign_level_id)
	if _campaign_layout.is_empty():
		push_warning("Campaign layout missing: %s — falling back to concept demo" % String(_campaign_level_id))
		_play_mode = MODE_CONCEPT
		return
	_campaign_hint = str(_campaign_layout.get("hint", ""))
	_level_title = str(_campaign_layout.get("title", "LEVEL")).to_upper()
	if str(_campaign_layout.get("mode", "")) == "align":
		var pdict: Variant = _campaign_layout.get("puzzle", {})
		if pdict is Dictionary:
			_align_puzzle = PuzzleDef.from_dict(pdict as Dictionary)
	_par_soft = int(_campaign_layout.get("par_soft", _par_soft))
	_par_hard = int(_campaign_layout.get("par_hard", _par_hard))
	if _align_puzzle != null:
		_apply_align_pars(_align_puzzle)
	elif _par_hard > 0:
		_best = _par_hard
		if _par_soft < 0:
			_par_soft = _par_hard + 4
	var gs := get_node_or_null("/root/GameServices")
	if gs and gs.save:
		var best: int = int(gs.save.get_level_best_moves(_campaign_chapter_id, _campaign_level_id))
		if best > 0:
			_best = best


func _ensure_align_puzzle() -> void:
	if _align_puzzle != null and _align_puzzle.is_well_formed():
		return
	if _play_mode == MODE_DAILY:
		if _daily_date.is_empty():
			_daily_date = _utc_date_today()
		_align_puzzle = _gen.generate_daily(_daily_date, "SHIFTR", 5)
		_endless_seed = _align_puzzle.seed_value
		_endless_difficulty = _align_puzzle.difficulty
	elif _play_mode == MODE_ENDLESS:
		if _endless_seed == 0:
			_endless_seed = int(Time.get_unix_time_from_system()) ^ (_endless_wave * 9973)
		_align_puzzle = _gen.generate(_endless_seed, _endless_difficulty)


func _utc_date_today() -> String:
	var dt := Time.get_datetime_dict_from_system(true)
	return "%04d-%02d-%02d" % [int(dt.year), int(dt.month), int(dt.day)]


func _load_feel() -> ShiftFeelConfig:
	var path := "res://resources/configs/feel/default_shift_feel.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is ShiftFeelConfig:
			return (res as ShiftFeelConfig).duplicate(true) as ShiftFeelConfig
	return ShiftFeelConfig.new()


func _build_aesthetic() -> void:
	tokens = load("res://resources/configs/visual/default_design_tokens.tres") as DesignTokens
	if tokens == null:
		tokens = DesignTokens.new()
	else:
		tokens = tokens.duplicate(true) as DesignTokens

	var gs := get_node_or_null("/root/GameServices")
	if gs and gs.save:
		_world_skin = WorldSkin.id_from_key(gs.save.get_world_skin_key())
	WorldSkin.apply_to_tokens(tokens, _world_skin)

	director = VisualDirector.new()
	director.name = "VisualDirector"
	director.tokens = tokens
	director.quality = _load_quality()
	director.feel_config = feel
	add_child(director)
	director.configure(tokens, director.quality, feel)
	theme = director.get_theme()


func _load_quality() -> VisualQualityConfig:
	var tier := VisualQualityConfig.Tier.HIGH
	var gs := get_node_or_null("/root/GameServices")
	if gs and gs.save:
		var settings: Dictionary = gs.save.profile.get("settings", {})
		tier = int(settings.get("quality_tier", int(VisualQualityConfig.Tier.HIGH))) as VisualQualityConfig.Tier
	var path := "res://resources/configs/visual/quality_high.tres"
	match tier:
		VisualQualityConfig.Tier.LOW:
			path = "res://resources/configs/visual/quality_low.tres"
		VisualQualityConfig.Tier.MEDIUM:
			path = "res://resources/configs/visual/quality_med.tres"
		_:
			path = "res://resources/configs/visual/quality_high.tres"
	var q := load(path) as VisualQualityConfig
	if q == null:
		return VisualQualityConfig.make_high()
	return q.duplicate(true) as VisualQualityConfig


func _build_session_and_puzzle() -> void:
	session = BoardSession.new()
	engine = PuzzleEngine.new()
	engine.bind_session(session)
	engine.setup_catalog(PuzzleCatalog.build_all())
	engine.puzzle_events.connect(_on_puzzle_events)

	if _play_mode == MODE_DAILY or _play_mode == MODE_ENDLESS:
		_ensure_align_puzzle()
		_align_puzzle.apply_to_session(session)
		engine.bind_session(session)
		engine.bootstrap_from_board()
		_apply_align_pars(_align_puzzle)
		_initial_snapshot = session.get_state().to_dict()
		return

	if _play_mode == MODE_CAMPAIGN:
		if _align_puzzle != null and _align_puzzle.is_well_formed():
			_align_puzzle.apply_to_session(session)
			engine.bind_session(session)
			engine.bootstrap_from_board()
			_apply_align_pars(_align_puzzle)
		elif not _campaign_layout.is_empty():
			CampaignLevelCatalog.apply_layout(engine, session, _campaign_layout)
			if _par_hard > 0:
				_best = _par_hard
			if _par_soft < 0 and _par_hard > 0:
				_par_soft = _par_hard + 4
		else:
			_place_demo_fallback()
		_initial_snapshot = session.get_state().to_dict()
		return

	_place_demo_fallback()
	_initial_snapshot = session.get_state().to_dict()


func _place_demo_fallback() -> void:
	var cfg := BoardConfig.new()
	cfg.width = 8
	cfg.height = 8
	session.setup_from_config(cfg)
	_place_demo_layout()
	engine.bootstrap_from_board()
	_par_soft = PAR_BEST + 6
	_par_hard = PAR_BEST
	_best = PAR_BEST


func _apply_align_pars(puzzle: PuzzleDef) -> void:
	if puzzle == null:
		return
	_par_hard = puzzle.par_hard if puzzle.par_hard > 0 else maxi(1, puzzle.optimal_moves)
	_par_soft = puzzle.par_soft if puzzle.par_soft > 0 else (_par_hard + 2)
	## Dial target = hard par (concept “BEST” ring); personal best tracked separately on clear.
	_best = _par_hard


func _place_demo_layout() -> void:
	## Sparse neon layout — beam blocked until the player shifts the crate clear.
	engine.place(Vector2i(1, 3), &"laser_emitter")
	engine.place(Vector2i(2, 3), &"crate")
	engine.place(Vector2i(4, 3), &"mirror")
	engine.place(Vector2i(4, 1), &"laser_receiver")
	engine.place(Vector2i(0, 5), &"switch")
	engine.place(Vector2i(6, 3), &"door")
	engine.place(Vector2i(2, 5), &"magnet")
	engine.place(Vector2i(5, 5), &"ghost_block")
	engine.place(Vector2i(6, 6), &"time_rewind")
	engine.place(Vector2i(1, 6), &"gravity_block")
	engine.place(Vector2i(7, 2), &"teleporter", true)
	## Color blocks — red has horizontal axis-lock.
	engine.place(Vector2i(2, 1), &"block_red")
	engine.place(Vector2i(5, 2), &"block_blue")
	engine.place(Vector2i(6, 5), &"block_green")
	engine.place(Vector2i(3, 4), &"block_yellow")


func _try_restore_resume() -> void:
	var gs := get_node_or_null("/root/GameServices")
	if gs == null or gs.save == null or not gs.save.has_resume():
		return
	var resume: Dictionary = gs.save.get_resume()
	var resume_level := str(resume.get("level_id", ""))
	var expected := String(_campaign_level_id) if _play_mode == MODE_CAMPAIGN else String(LEVEL_ID)
	if resume_level != expected and str(resume.get("scene", "")) != SCENE_PATH:
		## Different level id — still accept concept slice resume payloads for free-play.
		if _play_mode == MODE_CAMPAIGN or not resume.has("board"):
			return
	var board_data: Variant = resume.get("board", {})
	if board_data is Dictionary and not (board_data as Dictionary).is_empty():
		var state := BoardState.from_dict((board_data as Dictionary).duplicate(true))
		session.setup_from_state(state)
		engine.bind_session(session)
		engine.bootstrap_from_board()
	_moves = int(resume.get("moves", 0))
	_best = int(resume.get("best", _best if _best > 0 else PAR_BEST))
	if resume.has("world_skin"):
		_world_skin = WorldSkin.id_from_key(StringName(str(resume["world_skin"])))
		WorldSkin.apply_to_tokens(tokens, _world_skin)
		if director:
			director.configure(tokens, director.quality, feel)
	## Keep authored layout as restart baseline.
	if _initial_snapshot.is_empty():
		_initial_snapshot = session.get_state().to_dict()


func _build_view() -> void:
	_board_host = Control.new()
	_board_host.name = "BoardHost"
	_board_host.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_board_host.offset_top = 100.0
	_board_host.offset_bottom = -150.0
	_board_host.offset_left = 16.0
	_board_host.offset_right = -16.0
	_board_host.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_board_host)

	bridge = BoardViewBridge.new()
	bridge.name = "Bridge"
	add_child(bridge)
	bridge.bind_session(session)

	board_view = BoardView.new()
	board_view.name = "BoardView"
	board_view.tokens = tokens
	board_view.cell_size = Vector2(64, 64)
	board_view.gap = 7.0
	board_view.quality = director.quality if director else null
	_board_host.add_child(board_view)
	board_view.rebuild(session.get_state())
	board_view.set_quality(director.quality if director else null)
	_board_host.resized.connect(_fit_board)
	var win := get_window()
	if win and not win.size_changed.is_connected(_fit_board):
		win.size_changed.connect(_fit_board)
	if not board_view.cell_pressed.is_connected(_on_cell_pressed):
		board_view.cell_pressed.connect(_on_cell_pressed)
	call_deferred("_fit_board")


func _fit_board() -> void:
	if board_view == null or _board_host == null:
		return
	var host := _board_host.size
	if host.x < 32.0 or host.y < 32.0:
		return
	var cols := maxi(board_view.width, 1)
	var rows := maxi(board_view.height, 1)
	var gap := board_view.gap
	var pad := 8.0
	var avail := host - Vector2(pad * 2.0, pad * 2.0)
	var cell_w := (avail.x - gap * float(cols - 1)) / float(cols)
	var cell_h := (avail.y - gap * float(rows - 1)) / float(rows)
	var cell := clampf(floorf(minf(cell_w, cell_h)), 40.0, 84.0)
	var new_size := Vector2(cell, cell)
	if not board_view.cell_size.is_equal_approx(new_size):
		board_view.cell_size = new_size
		board_view.rebuild(session.get_state())
		_refresh_lasers()
		if feel_controller and feel_controller.audio:
			feel_controller.audio.set_board_rect(Rect2(Vector2.ZERO, board_view.board_pixel_size()))
	var sz := board_view.board_pixel_size()
	board_view.position = Vector2((host.x - sz.x) * 0.5, (host.y - sz.y) * 0.5)


func _build_feel() -> void:
	feel_controller = BoardFeelController.new()
	feel_controller.name = "Feel"
	feel_controller.feel = feel
	feel_controller.catalog = SatisfactionCatalog.load_or_builtin()
	feel_controller.land_burst_scene = load("res://scenes/effects/land_burst.tscn") as PackedScene
	feel_controller.wrap_spark_scene = load("res://scenes/effects/wrap_spark.tscn") as PackedScene
	feel_controller.quality = director.quality if director else null
	feel_controller.puzzle_engine = engine
	add_child(feel_controller)
	feel_controller.setup(session, bridge, board_view, feel)
	if feel_controller.satisfaction:
		feel_controller.satisfaction.visual_director = director
		feel_controller.satisfaction.quality = director.quality
	if not feel_controller.shift_committed.is_connected(_on_shift_committed):
		feel_controller.shift_committed.connect(_on_shift_committed)
	if feel_controller.animator and not feel_controller.animator.animation_finished.is_connected(_on_anim_finished):
		feel_controller.animator.animation_finished.connect(_on_anim_finished)
	if feel_controller.input_controller:
		feel_controller.input_controller.selection_changed.connect(
			func(row: int, col: int) -> void:
				if board_view:
					board_view.set_selection(row, -1)
		)


func _build_hud() -> void:
	hud = MinimalHud.new()
	hud.name = "PlayHud"
	hud.tokens = tokens
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.z_index = 10
	add_child(hud)
	hud.configure(tokens, feel.reduce_motion if feel else false)
	set_level_title_for_mode()
	hud.set_subtitle(_mode_subtitle())
	hud.set_budget(_moves, _best)
	hud.undo_pressed.connect(_on_undo)
	hud.restart_pressed.connect(_on_restart)
	hud.hint_pressed.connect(_on_hint)
	hud.levels_pressed.connect(_on_levels)
	hud.menu_pressed.connect(_on_menu)


func set_level_title_for_mode() -> void:
	if hud == null:
		return
	match _play_mode:
		MODE_DAILY:
			hud.set_title("DAILY")
		MODE_ENDLESS:
			hud.set_title("WAVE %d" % _endless_wave)
		MODE_CAMPAIGN:
			hud.set_title(_level_title if not _level_title.is_empty() else "LEVEL")
		_:
			hud.set_level(LEVEL_INDEX)


func _mode_subtitle() -> String:
	var skin := WorldSkin.display_name(_world_skin)
	match _play_mode:
		MODE_DAILY:
			var target := _align_puzzle.optimal_moves if _align_puzzle and _align_puzzle.optimal_moves > 0 else _par_hard
			return "Daily %s · Soft %d / Hard %d · target %d · %s" % [
				_daily_date, _par_soft, _par_hard, target, skin,
			]
		MODE_ENDLESS:
			return "Endless W%d · d%d · Soft %d / Hard %d · %s" % [
				_endless_wave, _endless_difficulty, _par_soft, _par_hard, skin,
			]
		MODE_CAMPAIGN:
			var tag := str(_campaign_layout.get("hint", _campaign_hint))
			if tag.is_empty():
				tag = "authored chapter"
			return "%s · Soft %d / Hard %d · %s" % [tag, _par_soft, _par_hard, skin]
		_:
			return "%s · swipe row · lasers" % skin


func _build_victory() -> void:
	victory = VictorySheet.new()
	victory.name = "VictorySheet"
	victory.tokens = tokens
	victory.z_index = 40
	add_child(victory)
	victory.configure(tokens)
	victory.continue_pressed.connect(_on_victory_continue)
	victory.retry_pressed.connect(_on_restart)


func _on_shift_committed(cmd: BoardCommand, tile_moves: Array) -> void:
	if session and session.history:
		_moves = session.history.undoable_count()
	else:
		_moves += 1
	if hud:
		hud.set_budget(_moves, _best)
	if board_view:
		board_view.record_echo(cmd)
		if session:
			board_view.capture_echo_board(session.get_state())
	## Board already applied by feel — resolve puzzle cascades (gravity/clone/countdown/doors).
	var br := SimResult.new()
	br.success = true
	for item in tile_moves:
		if item is TileMove:
			br.moves.append(item as TileMove)
	engine.resolve_after(br)
	if board_view and session:
		board_view.sync_occupants(session.get_state())
	## Axis-cycle / any shift: force laser+channel view to match sim immediately.
	_refresh_lasers()
	_persist_progress(true)
	_check_solve()


func _on_anim_finished(ctx: Dictionary) -> void:
	if board_view and session:
		board_view.sync_occupants(session.get_state())
	_refresh_lasers()
	if board_view:
		board_view.pulse_connection_land()
	if bool(ctx.get("axis_cycle", false)) and engine:
		## Extra settle pass after cycle-around-fixed so beams never desync from tiles.
		var events := engine.recompute()
		if board_view:
			board_view.apply_puzzle_events(events)
			_sync_door_switch_visuals()


func _on_puzzle_events(events: Array) -> void:
	if board_view:
		board_view.apply_puzzle_events(events)
	for e in events:
		if not (e is PuzzleEvent):
			continue
		var pe: PuzzleEvent = e
		match pe.kind:
			PuzzleEvent.Kind.LASER_RECEIVER_HIT:
				if feel_controller and feel_controller.audio:
					feel_controller.audio.play_laser()
				if feel_controller and feel_controller.satisfaction:
					feel_controller.satisfaction.play(&"laser_fire", {
						"targets": _tiles_at([pe.cell]),
					})
			PuzzleEvent.Kind.DOOR_OPENED, PuzzleEvent.Kind.DOOR_CLOSED:
				if feel_controller and feel_controller.satisfaction:
					feel_controller.satisfaction.play(&"door_open", {
						"targets": _tiles_at([pe.cell]),
					})
			PuzzleEvent.Kind.SWITCH_TOGGLED:
				if feel_controller and feel_controller.satisfaction:
					feel_controller.satisfaction.play(&"switch_toggle", {
						"targets": _tiles_at([pe.cell]),
					})


func _tiles_at(cells: Array) -> Array:
	var out: Array = []
	if board_view == null:
		return out
	for c in cells:
		if c is Vector2i:
			var t := board_view.tile_at((c as Vector2i).x, (c as Vector2i).y)
			if t:
				out.append(t)
	return out


func _on_cell_pressed(x: int, y: int) -> void:
	if engine == null or _solved:
		return
	var events := engine.interact_at(Vector2i(x, y))
	if events.is_empty():
		return
	if board_view and session:
		board_view.sync_occupants(session.get_state())
	_persist_progress(true)
	_check_solve()


func _refresh_lasers() -> void:
	if engine == null:
		return
	var events := engine.recompute()
	if board_view:
		board_view.apply_puzzle_events(events)
		_sync_door_switch_visuals()
	_check_solve()


func _sync_door_switch_visuals() -> void:
	if board_view == null or engine == null:
		return
	for obj in engine.world.objects_with(&"door"):
		var door: DoorComponent = obj.get_component(&"door") as DoorComponent
		var tile := board_view.tile_at(obj.cell.x, obj.cell.y)
		if door and tile:
			tile.set_door_open(door.open, false)
	for obj in engine.world.objects_with(&"switch"):
		var sw: SwitchComponent = obj.get_component(&"switch") as SwitchComponent
		var tile := board_view.tile_at(obj.cell.x, obj.cell.y)
		if sw and tile:
			tile.set_switch_on(sw.activated, false)


func _check_solve() -> void:
	if _solved or engine == null:
		return
	var won := false
	if _align_puzzle != null and (
		_play_mode == MODE_DAILY or _play_mode == MODE_ENDLESS
		or (_play_mode == MODE_CAMPAIGN and str(_campaign_layout.get("mode", "")) == "align")
	):
		won = _align_puzzle.is_solved_state(session.get_state())
	elif _play_mode == MODE_CAMPAIGN or _play_mode == MODE_CONCEPT:
		## Laser / switch campaigns: door channel lit. Switch-only may win on interact (0 moves).
		var need_move := _play_mode == MODE_CONCEPT
		if (not need_move or _moves > 0) and engine.get_channels().is_active(&"door"):
			won = true
	if not won:
		return
	_fire_victory()


## Shared victory sheet + puzzle_solve recipe for concept laser and Align (daily/endless).
func _fire_victory() -> void:
	_solved = true
	var stars := _star_rating(_moves)
	var display_best := _best
	if _best < 0 or (_moves < _best and (_play_mode == MODE_CONCEPT or _play_mode == MODE_CAMPAIGN)):
		_best = _moves
		display_best = _best
	elif _play_mode == MODE_DAILY or _play_mode == MODE_ENDLESS:
		## Keep dial/target as hard par; victory line shows hard par as TARGET.
		display_best = _par_hard if _par_hard > 0 else _best
	_local_rank = -1
	_on_mode_cleared()
	var title := "LEVEL COMPLETE"
	var best_label := "BEST"
	match _play_mode:
		MODE_DAILY:
			title = "DAILY CLEAR"
			best_label = "HARD"
		MODE_ENDLESS:
			title = "WAVE %d CLEAR" % _endless_wave
			best_label = "HARD"
		MODE_CAMPAIGN:
			title = (_level_title if not _level_title.is_empty() else "LEVEL") + " CLEAR"
			best_label = "BEST"
		_:
			title = "LEVEL COMPLETE"
			best_label = "BEST"
	if victory:
		victory.present(_moves, display_best, stars, title, _local_rank, best_label)
	if feel_controller and feel_controller.ui_feel:
		feel_controller.ui_feel.puzzle_solve(board_view)
	elif feel_controller and feel_controller.satisfaction:
		feel_controller.satisfaction.play(&"puzzle_solve", {})
	var audio := get_tree().root.get_node_or_null("Audio") as AudioDirector
	if audio:
		audio.music_set_state(AdaptiveMusicPlayer.MusicState.VICTORY)
	_persist_progress(true)


func _star_rating(moves: int) -> int:
	## Align: 3 ≤ hard, 2 ≤ soft, else 1. Concept laser: same bands vs PAR_BEST.
	var hard := _par_hard if _par_hard > 0 else _best
	var soft := _par_soft if _par_soft > 0 else (hard + 6)
	if hard < 0:
		return 3
	if moves <= hard:
		return 3
	if moves <= soft:
		return 2
	return 1


func _on_mode_cleared() -> void:
	var gs := get_node_or_null("/root/GameServices")
	if gs == null or gs.save == null:
		return
	match _play_mode:
		MODE_CAMPAIGN:
			if not String(_campaign_level_id).is_empty():
				var stars := _star_rating(_moves)
				gs.save.record_level_clear(_campaign_chapter_id, _campaign_level_id, stars, _moves, true)
				if gs.analytics:
					gs.analytics.track(AnalyticsEvents.LEVEL_CLEAR, {
						"level_id": String(_campaign_level_id),
						"chapter_id": String(_campaign_chapter_id),
						"moves": _moves,
						"stars": stars,
						"mode": "campaign",
					})
		MODE_DAILY:
			if _daily_ranked and not _daily_date.is_empty():
				gs.save.record_daily_clear(_daily_date, _moves, true)
				if gs.leaderboards:
					gs.leaderboards.submit_daily(_moves, 0.0, _daily_date)
					_local_rank = gs.leaderboards.self_rank(LeaderboardService.BOARD_DAILY)
				if gs.analytics:
					gs.analytics.track(AnalyticsEvents.DAILY_CLEAR, {
						"seed": _daily_date, "moves": _moves,
					})
		MODE_ENDLESS:
			gs.save.record_endless_wave(_endless_wave, _endless_seed, true)
			_endless_cleared_any = true
			if gs.leaderboards:
				## Higher score = farther wave; encode wave*1e6 + (budget - moves) for ties.
				var score := _endless_wave * 1_000_000 + maxi(0, 999_999 - _moves)
				gs.leaderboards.submit_endless(score, _endless_wave, _moves)
				_local_rank = gs.leaderboards.self_rank(LeaderboardService.BOARD_ENDLESS)
			if gs.analytics:
				gs.analytics.track(AnalyticsEvents.LEVEL_CLEAR, {
					"wave": _endless_wave, "moves": _moves, "seed": _endless_seed, "mode": "endless",
				})


func _persist_progress(save_now: bool) -> void:
	## Daily / endless keep their own save blobs; don't clobber campaign resume.
	if _play_mode != MODE_CONCEPT and _play_mode != MODE_CAMPAIGN:
		return
	var gs := get_node_or_null("/root/GameServices")
	if gs == null or gs.save == null or session == null:
		return
	var lid := String(_campaign_level_id) if _play_mode == MODE_CAMPAIGN else String(LEVEL_ID)
	var payload := {
		"level_id": lid,
		"chapter_id": String(_campaign_chapter_id) if _play_mode == MODE_CAMPAIGN else "",
		"level_index": LEVEL_INDEX,
		"scene": SCENE_PATH,
		"mode": String(_play_mode),
		"moves": _moves,
		"best": _best,
		"solved": _solved,
		"world_skin": String(WorldSkin.key_for(_world_skin)),
		"board": session.get_state().to_dict(),
		"updated_unix": int(Time.get_unix_time_from_system()),
	}
	gs.save.write_resume(payload, save_now)


func _on_undo() -> void:
	if feel_controller:
		feel_controller._on_undo()
	_moves = session.history.undoable_count() if session and session.history else maxi(0, _moves - 1)
	if hud:
		hud.set_budget(_moves, _best)
	_solved = false
	if victory:
		victory.dismiss()
	if board_view and session:
		board_view.sync_occupants(session.get_state())
	_refresh_lasers()
	_persist_progress(true)


func _on_restart() -> void:
	_solved = false
	_hint_stage = 0
	if victory:
		victory.dismiss()
	if _initial_snapshot.is_empty():
		return
	var state := BoardState.from_dict(_initial_snapshot.duplicate(true))
	session.setup_from_state(state)
	bridge.bind_session(session)
	feel_controller.puzzle_engine = engine
	feel_controller.setup(session, bridge, board_view, feel)
	if not feel_controller.shift_committed.is_connected(_on_shift_committed):
		feel_controller.shift_committed.connect(_on_shift_committed)
	engine.bind_session(session)
	engine.bootstrap_from_board()
	_moves = 0
	if hud:
		hud.set_budget(_moves, _best)
		hud.set_subtitle(_mode_subtitle())
	if board_view and board_view.echo_layer and board_view.echo_layer.has_method("clear"):
		board_view.echo_layer.call("clear")
	board_view.rebuild(session.get_state())
	_fit_board()
	_refresh_lasers()
	_persist_progress(true)


func _on_hint() -> void:
	## Hint only — world skins change exclusively via Worlds screen.
	var tip := "align emitter → mirror → receiver"
	if _align_puzzle != null and (
		_play_mode == MODE_DAILY or _play_mode == MODE_ENDLESS
		or (_play_mode == MODE_CAMPAIGN and str(_campaign_layout.get("mode", "")) == "align")
	):
		var h := _hint_gen.hint(_align_puzzle, _hint_stage, session.get_state())
		tip = h.blurb if h and not h.blurb.is_empty() else "No hint available."
		_hint_stage = mini(2, _hint_stage + 1)
	elif _play_mode == MODE_CAMPAIGN and not _campaign_hint.is_empty():
		tip = _campaign_hint
		_hint_stage = mini(2, _hint_stage + 1)
	else:
		tip = "red rides rows; cols cycle around · %s" % tip
	if hud:
		hud.set_subtitle(tip)
	if feel_controller and feel_controller.ui_feel:
		feel_controller.ui_feel.button_press(hud)


func _exit_tree() -> void:
	_submit_endless_run_end()
	_persist_progress(true)
	PowerPolicy.set_gameplay_active(false)


func _submit_endless_run_end() -> void:
	## Final wave submit when leaving endless after at least one clear this run.
	if _play_mode != MODE_ENDLESS or not _endless_cleared_any:
		return
	var gs := get_node_or_null("/root/GameServices")
	if gs == null or gs.leaderboards == null:
		return
	var score := _endless_wave * 1_000_000 + maxi(0, 999_999 - _moves)
	gs.leaderboards.submit_endless(score, _endless_wave, _moves)
	if gs.analytics:
		gs.analytics.track(AnalyticsEvents.ENDLESS_OVER, {
			"wave": _endless_wave, "moves": _moves, "seed": _endless_seed,
		})
	_endless_cleared_any = false


func _on_levels() -> void:
	_persist_progress(true)
	get_tree().change_scene_to_file("res://scenes/ui/main_shell.tscn")


func _on_menu() -> void:
	_persist_progress(true)
	get_tree().change_scene_to_file("res://scenes/ui/main_shell.tscn")


func _on_victory_continue() -> void:
	if _play_mode == MODE_ENDLESS:
		_advance_endless()
		return
	_persist_progress(true)
	get_tree().change_scene_to_file("res://scenes/ui/main_shell.tscn")


func _advance_endless() -> void:
	_solved = false
	_local_rank = -1
	if victory:
		victory.dismiss()
	_endless_wave += 1
	_endless_difficulty = clampi(1 + int((_endless_wave - 1) / 2), 1, 10)
	_endless_seed = int((_endless_seed * 1103515245 + 12345 + _endless_wave * 9176) & 0x7FFFFFFF)
	if _endless_seed == 0:
		_endless_seed = _endless_wave * 7919 + 1
	_align_puzzle = _gen.generate(_endless_seed, _endless_difficulty)
	_align_puzzle.apply_to_session(session)
	engine.bind_session(session)
	engine.bootstrap_from_board()
	_initial_snapshot = session.get_state().to_dict()
	_moves = 0
	_hint_stage = 0
	_apply_align_pars(_align_puzzle)
	bridge.bind_session(session)
	feel_controller.puzzle_engine = engine
	feel_controller.setup(session, bridge, board_view, feel)
	if not feel_controller.shift_committed.is_connected(_on_shift_committed):
		feel_controller.shift_committed.connect(_on_shift_committed)
	if board_view and board_view.echo_layer and board_view.echo_layer.has_method("clear"):
		board_view.echo_layer.call("clear")
	board_view.rebuild(session.get_state())
	_fit_board()
	_refresh_lasers()
	if hud:
		set_level_title_for_mode()
		hud.set_budget(_moves, _best)
		hud.set_subtitle(_mode_subtitle())
	var audio := get_tree().root.get_node_or_null("Audio") as AudioDirector
	if audio:
		audio.music_set_state(AdaptiveMusicPlayer.MusicState.THINK)
