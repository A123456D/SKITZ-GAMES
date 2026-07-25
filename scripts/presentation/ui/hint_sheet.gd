class_name HintSheet
extends CanvasLayer
## Progressive non-spoiler hint bottom sheet.

signal dismissed
signal step_revealed(index: int)

var router: UiRouter
var tokens: DesignTokens
var settings: UiSettingsState

var _scrim: ColorRect
var _panel: PanelContainer
var _title: Label
var _level: Label
var _steps_host: VBoxContainer
var _close: GlassButton
var _revealed: int = 0
var _pack: HintPackDef
var _busy: bool = false


func configure(p_router: UiRouter) -> void:
	router = p_router
	tokens = router.tokens
	settings = router.settings
	layer = 80
	_build()


func present(params: Dictionary = {}) -> void:
	if _busy:
		return
	_pack = router.catalog.hint_pack if router and router.catalog else null
	if params.has("hint_pack"):
		_pack = params["hint_pack"] as HintPackDef
	_revealed = int(params.get("revealed", 1))
	visible = true
	_refresh_steps()
	await _animate_in()


func dismiss() -> void:
	if _busy:
		return
	await _animate_out()
	visible = false
	dismissed.emit()


func _build() -> void:
	_scrim = ColorRect.new()
	_scrim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_scrim.color = Color(0.05, 0.07, 0.09, 0.0)
	_scrim.gui_input.connect(_on_scrim_input)
	add_child(_scrim)

	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	_panel = PanelContainer.new()
	_panel.anchor_left = 0.0
	_panel.anchor_right = 1.0
	_panel.anchor_top = 1.0
	_panel.anchor_bottom = 1.0
	_panel.offset_left = 16
	_panel.offset_right = -16
	_panel.offset_top = -420
	_panel.offset_bottom = -24
	if tokens:
		_panel.add_theme_stylebox_override("panel", tokens.make_panel_style())
	root.add_child(_panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", tokens.space_md if tokens else 16)
	margin.add_theme_constant_override("margin_right", tokens.space_md if tokens else 16)
	margin.add_theme_constant_override("margin_top", tokens.space_md if tokens else 16)
	margin.add_theme_constant_override("margin_bottom", tokens.space_md if tokens else 16)
	_panel.add_child(margin)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", tokens.space_sm if tokens else 8)
	margin.add_child(col)

	_level = Label.new()
	_level.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(_level)

	_title = Label.new()
	_title.text = "Hints"
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(_title)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.custom_minimum_size = Vector2(0, 220)
	col.add_child(scroll)

	_steps_host = VBoxContainer.new()
	_steps_host.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_steps_host.add_theme_constant_override("separation", 10)
	scroll.add_child(_steps_host)

	_close = GlassButton.new()
	_close.text = "Close"
	_close.tokens = tokens
	_close.custom_minimum_size = Vector2(0, 48)
	_close.pressed.connect(func() -> void:
		if router:
			router.play_button_feel(_close)
		dismiss()
	)
	col.add_child(_close)
	_style_headers()
	visible = false


func _style_headers() -> void:
	if tokens == null:
		return
	var scale := settings.text_scale if settings else 1.0
	_title.add_theme_color_override("font_color", tokens.ink_primary)
	_title.add_theme_font_size_override("font_size", int(round(tokens.font_title * scale)))
	_level.add_theme_color_override("font_color", tokens.accent_signal)
	_level.add_theme_font_size_override("font_size", int(round(tokens.font_caption * scale)))


func _refresh_steps() -> void:
	for c in _steps_host.get_children():
		c.queue_free()
	if _pack == null:
		return
	_level.text = _pack.level_title
	var scale := settings.text_scale if settings else 1.0
	for i in range(_pack.steps.size()):
		var step: HintStepDef = _pack.steps[i]
		var unlocked := i < _revealed
		var row := VBoxContainer.new()
		row.add_theme_constant_override("separation", 4)
		var head := Label.new()
		var cost := ""
		if step.spark_cost > 0 and not unlocked:
			cost = "  ·  %d Sparks" % step.spark_cost
		head.text = "%d. %s%s" % [step.step_index, step.title, cost]
		head.add_theme_color_override("font_color", tokens.accent_beam if unlocked else tokens.ink_muted)
		head.add_theme_font_size_override("font_size", int(round(tokens.font_body * scale)))
		row.add_child(head)
		if unlocked:
			var body := Label.new()
			body.text = step.body
			body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			body.add_theme_color_override("font_color", tokens.ink_secondary)
			body.add_theme_font_size_override("font_size", int(round(tokens.font_caption * scale)))
			row.add_child(body)
		else:
			var reveal := GlassButton.new()
			reveal.text = "Reveal"
			reveal.tokens = tokens
			reveal.custom_minimum_size = Vector2(120, 44)
			var idx := i
			reveal.pressed.connect(func() -> void: _reveal_step(idx, reveal))
			row.add_child(reveal)
		_steps_host.add_child(row)


func _reveal_step(index: int, btn: Control) -> void:
	if index != _revealed:
		if router and router.ui_feel:
			router.ui_feel.invalid()
		return
	if router:
		router.play_button_feel(btn)
	var step: HintStepDef = _pack.steps[index]
	if settings and step.spark_cost > 0:
		if settings.sparks < step.spark_cost:
			if router and router.ui_feel:
				router.ui_feel.invalid()
			return
		settings.sparks -= step.spark_cost
		settings.notify()
	_revealed = index + 1
	step_revealed.emit(index)
	_refresh_steps()


func _on_scrim_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		dismiss()


func _animate_in() -> void:
	_busy = true
	var reduce := settings != null and settings.reduce_motion
	_scrim.color.a = 0.0
	_panel.offset_top = 40
	_panel.modulate.a = 0.0
	var dur := 0.08 if reduce else (tokens.duration_panel if tokens else 0.22)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(_scrim, "color:a", 0.62, dur)
	tw.tween_property(_panel, "offset_top", -420.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(_panel, "modulate:a", 1.0, dur)
	await tw.finished
	_busy = false


func _animate_out() -> void:
	_busy = true
	var reduce := settings != null and settings.reduce_motion
	var dur := 0.06 if reduce else (tokens.duration_panel if tokens else 0.18)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(_scrim, "color:a", 0.0, dur)
	tw.tween_property(_panel, "offset_top", 40.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tw.tween_property(_panel, "modulate:a", 0.0, dur)
	await tw.finished
	_busy = false
