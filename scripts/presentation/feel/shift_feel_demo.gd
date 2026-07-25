class_name ShiftFeelDemo
extends Node2D
## Minimal playable feel lab: 6×6 board, swipe / keys / gamepad.
## Visual aesthetic + SatisfactionDirector recipes (does not touch sim).

@onready var camera: Camera2D = $Camera2D
@onready var juice_cam: JuiceCamera = $JuiceCamera
@onready var board_host: Control = $UI/BoardHost
@onready var hint: Label = $UI/Hint
@onready var toggles: VBoxContainer = $UI/Toggles
@onready var title: Label = $UI/Title
@onready var subtitle: Label = $UI/Subtitle

var session: BoardSession
var bridge: BoardViewBridge
var board_view: BoardView
var feel: ShiftFeelConfig
var feel_controller: BoardFeelController
var director: VisualDirector
var tokens: DesignTokens
var ui_feel: UiFeel


func _ready() -> void:
	feel = _load_feel()
	_build_aesthetic()
	_build_session()
	_build_view()
	_build_feel()
	_build_toggles()
	_build_satisfaction_buttons()
	hint.text = "Swipe board · Q/E row · R/F col · WASD select · Z undo · Tab focus"


func _load_feel() -> ShiftFeelConfig:
	var path := "res://resources/configs/feel/default_shift_feel.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is ShiftFeelConfig:
			return res as ShiftFeelConfig
	return ShiftFeelConfig.new()


func _build_aesthetic() -> void:
	tokens = load("res://resources/configs/visual/default_design_tokens.tres") as DesignTokens
	if tokens == null:
		tokens = DesignTokens.new()
	var bg := get_node_or_null("BG") as CanvasLayer
	if bg:
		bg.visible = false
	director = VisualDirector.new()
	director.name = "VisualDirector"
	director.tokens = tokens
	director.quality = (load("res://resources/configs/visual/quality_high.tres") as VisualQualityConfig).duplicate(true) as VisualQualityConfig
	director.feel_config = feel
	add_child(director)
	director.configure(tokens, director.quality, feel)
	var ui := get_node_or_null("UI") as CanvasLayer
	if ui:
		for c in ui.get_children():
			if c is Control:
				(c as Control).theme = director.get_theme()
	_style_chrome()


func _style_chrome() -> void:
	if tokens == null:
		return
	if title:
		title.add_theme_color_override("font_color", tokens.ink_primary)
		title.add_theme_font_size_override("font_size", tokens.font_display)
	if subtitle:
		subtitle.add_theme_color_override("font_color", tokens.accent_signal)
		subtitle.add_theme_font_size_override("font_size", tokens.font_caption)
		subtitle.text = "satisfaction · movement feel lab"
	if hint:
		hint.add_theme_color_override("font_color", tokens.ink_secondary)
		hint.add_theme_font_size_override("font_size", tokens.font_body)


func _build_session() -> void:
	session = BoardSession.new()
	var cfg := BoardConfig.new()
	cfg.width = 6
	cfg.height = 6
	session.setup_from_config(cfg)
	var ids: Array = []
	var letters := ["A", "B", "C", "D", "E", "F"]
	for y in 6:
		for x in 6:
			ids.append("%s%d" % [letters[x], y])
	session.get_state().fill_occupants_row_major(ids)

	bridge = BoardViewBridge.new()
	bridge.name = "Bridge"
	add_child(bridge)
	bridge.bind_session(session)


func _build_view() -> void:
	board_view = BoardView.new()
	board_view.name = "BoardView"
	board_view.cell_size = Vector2(72, 72)
	board_view.gap = 8.0
	board_host.add_child(board_view)
	board_view.rebuild(session.get_state())
	board_host.resized.connect(_fit_board_to_host)
	var win := get_window()
	if win and not win.size_changed.is_connected(_fit_board_to_host):
		win.size_changed.connect(_fit_board_to_host)
	call_deferred("_fit_board_to_host")


func _fit_board_to_host() -> void:
	if board_view == null or board_host == null or session == null:
		return
	var vp_w := get_viewport().get_visible_rect().size.x if get_viewport() else 720.0
	## Lab toggles are desktop/debug chrome — hide on phone-width so the board stays primary.
	if toggles:
		toggles.visible = vp_w >= 640.0
	var host_size := board_host.size
	if host_size.x < 1.0 or host_size.y < 1.0:
		return
	var cols := maxi(board_view.width, 1)
	var rows := maxi(board_view.height, 1)
	var gap := board_view.gap
	var pad := 12.0
	var avail := host_size - Vector2(pad * 2.0, pad * 2.0)
	## Leave a lane for toggles when they are visible so tiles don't sit under chrome.
	if toggles and toggles.visible:
		avail.x = maxf(64.0, avail.x - 200.0)
	if avail.x < 32.0 or avail.y < 32.0:
		return
	var cell_w := (avail.x - gap * float(cols - 1)) / float(cols)
	var cell_h := (avail.y - gap * float(rows - 1)) / float(rows)
	## Keep tiles at least ~44px for touch; cap so small boards don't look sparse.
	var cell := clampf(floorf(minf(cell_w, cell_h)), 44.0, 96.0)
	var new_size := Vector2(cell, cell)
	if not board_view.cell_size.is_equal_approx(new_size):
		board_view.cell_size = new_size
		board_view.rebuild(session.get_state())
		if feel_controller and feel_controller.audio:
			feel_controller.audio.set_board_rect(Rect2(Vector2.ZERO, board_view.board_pixel_size()))
	var sz := board_view.board_pixel_size()
	var origin_x := (host_size.x - sz.x) * 0.5
	if toggles and toggles.visible:
		origin_x = minf(origin_x, (host_size.x - 200.0 - sz.x) * 0.5)
	board_view.position = Vector2(maxf(pad, origin_x), (host_size.y - sz.y) * 0.5)


func _center_board() -> void:
	_fit_board_to_host()


func _build_feel() -> void:
	feel_controller = BoardFeelController.new()
	feel_controller.name = "Feel"
	feel_controller.feel = feel
	feel_controller.catalog = SatisfactionCatalog.load_or_builtin()
	feel_controller.land_burst_scene = load("res://scenes/effects/land_burst.tscn") as PackedScene
	feel_controller.wrap_spark_scene = load("res://scenes/effects/wrap_spark.tscn") as PackedScene
	feel_controller.quality = director.quality if director else null
	add_child(feel_controller)
	if juice_cam:
		feel_controller.juice_camera = juice_cam
		juice_cam.configure(feel)
	feel_controller.setup(session, bridge, board_view, feel)
	ui_feel = feel_controller.ui_feel
	if feel_controller.satisfaction:
		feel_controller.satisfaction.visual_director = director
		feel_controller.satisfaction.quality = director.quality if director else null
	if PerfOverlay.should_allow():
		var overlay := PerfOverlay.new()
		overlay.name = "PerfOverlay"
		add_child(overlay)
	PowerPolicy.set_gameplay_active(true)
	PowerPolicy.set_menu_idle(false)
	if feel_controller.audio and board_view:
		feel_controller.audio.set_board_rect(Rect2(Vector2.ZERO, board_view.board_pixel_size()))


func _build_satisfaction_buttons() -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	toggles.add_child(row)

	var press_btn := GlassButton.new()
	press_btn.text = "UI press"
	press_btn.tokens = tokens
	press_btn.custom_minimum_size = Vector2(110, 44)
	press_btn.pressed.connect(func() -> void:
		if ui_feel:
			ui_feel.button_press(press_btn)
		if director:
			director.spawn_ui_confirm(press_btn.get_global_rect().get_center())
	)
	row.add_child(press_btn)

	var solve_btn := GlassButton.new()
	solve_btn.text = "Solve juice"
	solve_btn.tokens = tokens
	solve_btn.custom_minimum_size = Vector2(120, 44)
	solve_btn.pressed.connect(func() -> void:
		if ui_feel:
			ui_feel.button_press(solve_btn)
			ui_feel.puzzle_solve(board_view)
		_music(AdaptiveMusicPlayer.MusicState.VICTORY)
	)
	row.add_child(solve_btn)

	var music_row := HBoxContainer.new()
	music_row.add_theme_constant_override("separation", 6)
	toggles.add_child(music_row)
	_add_music_btn(music_row, "Explore", AdaptiveMusicPlayer.MusicState.EXPLORE)
	_add_music_btn(music_row, "Think", AdaptiveMusicPlayer.MusicState.THINK)
	_add_music_btn(music_row, "Tension", AdaptiveMusicPlayer.MusicState.TENSION)
	_add_music_btn(music_row, "Fail", AdaptiveMusicPlayer.MusicState.FAILURE)

	_music(AdaptiveMusicPlayer.MusicState.EXPLORE)


func _add_music_btn(parent: Control, label: String, state: AdaptiveMusicPlayer.MusicState) -> void:
	var b := GlassButton.new()
	b.text = label
	b.tokens = tokens
	b.custom_minimum_size = Vector2(84, 40)
	b.pressed.connect(func() -> void: _music(state))
	parent.add_child(b)


func _music(state: AdaptiveMusicPlayer.MusicState) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var audio := tree.root.get_node_or_null("Audio") as AudioDirector
	if audio:
		audio.music_set_state(state)


func _build_toggles() -> void:
	_add_check("Reduce motion", feel.reduce_motion, func(on: bool) -> void:
		feel.reduce_motion = on
		feel_controller.feel = feel
		feel_controller.animator.configure(feel, feel_controller.trails)
		feel_controller.trails.configure(feel)
		feel_controller.juice_camera.configure(feel)
		if feel_controller.satisfaction:
			feel_controller.satisfaction.feel = feel
			feel_controller.satisfaction.hit_stop.configure(feel)
		if director:
			director.set_reduce_motion(on)
	)
	_add_check("Motion blur", feel.motion_blur_enabled and not feel.disable_motion_blur, func(on: bool) -> void:
		feel.disable_motion_blur = not on
		feel.motion_blur_enabled = true
	)
	_add_check("Shake", feel.shake_intensity > 0.0 and not feel.disable_shake, func(on: bool) -> void:
		feel.disable_shake = not on
		feel.shake_intensity = 1.0 if on else 0.0
		feel_controller.juice_camera.configure(feel)
	)
	_add_check("Hit stop", feel.hit_stop_enabled and not feel.disable_hit_stop, func(on: bool) -> void:
		feel.disable_hit_stop = not on
		feel.hit_stop_enabled = on
	)
	_add_check("Zoom pulse", not feel.disable_zoom_pulse, func(on: bool) -> void:
		feel.disable_zoom_pulse = not on
	)
	_add_check("Trails", feel.trails_enabled, func(on: bool) -> void:
		feel.trails_enabled = on
		feel_controller.trails.configure(feel)
	)
	_add_check("Interrupt blend", feel.allow_interrupt_blend, func(on: bool) -> void:
		feel.allow_interrupt_blend = on
	)
	_add_check("Bloom FX", director.quality.bloom_enabled if director else true, func(on: bool) -> void:
		if director and director.quality:
			director.quality.bloom_enabled = on
			director.configure(tokens, director.quality, feel)
	)
	_add_check("Battery saver", director.quality.battery_saver if director and director.quality else false, func(on: bool) -> void:
		if director:
			director.set_battery_saver(on)
			feel_controller.quality = director.quality
	)


func _add_check(label: String, initial: bool, on_change: Callable) -> void:
	var row := HBoxContainer.new()
	var cb := CheckBox.new()
	cb.button_pressed = initial
	cb.text = label
	cb.toggled.connect(func(on: bool) -> void: on_change.call(on))
	row.add_child(cb)
	toggles.add_child(row)
