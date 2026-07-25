class_name VictorySheet
extends Control
## Glass victory card — 3 stars, moves, best, celebration beat. Presentation only.

signal continue_pressed
signal retry_pressed

@export var tokens: DesignTokens

var _scrim: ColorRect
var _panel: Panel
var _title: Label
var _stars: HBoxContainer
var _moves: Label
var _best: Label
var _rank: Label
var _continue: GlassButton
var _retry: GlassButton
var _star_labels: Array[Label] = []
var _burst: GPUParticles2D
var _present_tween: Tween


func _ready() -> void:
	if tokens == null:
		tokens = _load_tokens()
	visible = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build()


func configure(p_tokens: DesignTokens) -> void:
	tokens = p_tokens
	_style()


## Optional: title override, par/best line, local rank (≥1 shows "LOCAL RANK #n").
func present(
	moves: int,
	best: int,
	stars: int = 3,
	title: String = "",
	rank: int = -1,
	best_label: String = "BEST"
) -> void:
	visible = true
	modulate.a = 0.0
	if _title and not title.is_empty():
		_title.text = title
	elif _title:
		_title.text = "LEVEL COMPLETE"
	_moves.text = "MOVES  %d" % moves
	_best.text = ("%s  %d" % [best_label, best]) if best >= 0 else ("%s  —" % best_label)
	if _rank:
		if rank >= 1:
			_rank.visible = true
			_rank.text = "LOCAL RANK  #%d" % rank
		else:
			_rank.visible = false
			_rank.text = ""
	for i in _star_labels.size():
		_star_labels[i].modulate = Color(1, 1, 1, 0.15)
		_star_labels[i].scale = Vector2(0.4, 0.4)
		_star_labels[i].add_theme_color_override(
			"font_color",
			tokens.accent_star if i < stars else tokens.ink_muted
		)
	if _panel:
		_panel.scale = Vector2(0.92, 0.92)
		_panel.pivot_offset = _panel.size * 0.5
	TweenUtil.kill(_present_tween)
	_present_tween = create_tween()
	_present_tween.set_parallel(true)
	_present_tween.tween_property(self, "modulate:a", 1.0, tokens.duration_panel if tokens else 0.22).set_ease(Tween.EASE_OUT)
	if _panel:
		_present_tween.tween_property(_panel, "scale", Vector2.ONE, 0.32).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	_present_tween.set_parallel(false)
	for i in mini(stars, _star_labels.size()):
		var s := _star_labels[i]
		s.pivot_offset = s.size * 0.5
		_present_tween.tween_property(s, "modulate:a", 1.0, 0.08)
		_present_tween.parallel().tween_property(s, "scale", Vector2(1.15, 1.15), 0.12).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		_present_tween.tween_property(s, "scale", Vector2.ONE, 0.1)
	for i in range(stars, _star_labels.size()):
		_star_labels[i].modulate = Color(1, 1, 1, 0.22)
		_star_labels[i].scale = Vector2.ONE
	if _burst:
		_burst.restart()
		_burst.emitting = true


func dismiss() -> void:
	visible = false
	if _burst:
		_burst.emitting = false


func _build() -> void:
	_scrim = ColorRect.new()
	_scrim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_scrim.color = Color(0.02, 0.01, 0.06, 0.72)
	_scrim.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_scrim)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	_panel = Panel.new()
	_panel.custom_minimum_size = Vector2(300, 340)
	center.add_child(_panel)

	_burst = GPUParticles2D.new()
	_burst.name = "VictoryBurst"
	_burst.one_shot = true
	_burst.explosiveness = 0.92
	_burst.lifetime = 0.55
	_burst.amount = 22
	_burst.emitting = false
	_burst.texture = SharedAtlas.soft_glow_texture()
	_burst.process_material = SharedAtlas.make_particle_material(
		Color(0.98, 0.78, 0.28, 1.0), 30.0, 140.0
	)
	_burst.position = Vector2(150, 80)
	_panel.add_child(_burst)

	var col := VBoxContainer.new()
	col.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 14)
	_panel.add_child(col)

	var pad := MarginContainer.new()
	pad.add_theme_constant_override("margin_left", 28)
	pad.add_theme_constant_override("margin_right", 28)
	pad.add_theme_constant_override("margin_top", 28)
	pad.add_theme_constant_override("margin_bottom", 28)
	col.add_child(pad)

	var inner := VBoxContainer.new()
	inner.add_theme_constant_override("separation", 16)
	inner.alignment = BoxContainer.ALIGNMENT_CENTER
	pad.add_child(inner)

	_title = Label.new()
	_title.text = "LEVEL COMPLETE"
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	inner.add_child(_title)

	_stars = HBoxContainer.new()
	_stars.alignment = BoxContainer.ALIGNMENT_CENTER
	_stars.add_theme_constant_override("separation", 12)
	inner.add_child(_stars)
	_star_labels.clear()
	for _i in 3:
		var s := Label.new()
		s.text = "★"
		s.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		s.add_theme_font_size_override("font_size", 40)
		s.custom_minimum_size = Vector2(44, 44)
		_stars.add_child(s)
		_star_labels.append(s)

	_moves = Label.new()
	_moves.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_moves.text = "MOVES  0"
	inner.add_child(_moves)

	_best = Label.new()
	_best.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_best.text = "BEST  —"
	inner.add_child(_best)

	_rank = Label.new()
	_rank.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_rank.text = ""
	_rank.visible = false
	inner.add_child(_rank)

	_continue = GlassButton.new()
	_continue.text = "CONTINUE"
	_continue.tokens = tokens
	_continue.custom_minimum_size = Vector2(220, 52)
	_continue.pressed.connect(func() -> void: continue_pressed.emit())
	inner.add_child(_continue)

	_retry = GlassButton.new()
	_retry.text = "RETRY"
	_retry.tokens = tokens
	_retry.custom_minimum_size = Vector2(220, 48)
	_retry.pressed.connect(func() -> void: retry_pressed.emit())
	inner.add_child(_retry)

	_style()


func _style() -> void:
	if tokens == null:
		return
	_panel.add_theme_stylebox_override("panel", tokens.make_panel_style())
	_title.add_theme_color_override("font_color", tokens.ink_primary)
	_title.add_theme_font_size_override("font_size", tokens.font_title)
	_moves.add_theme_color_override("font_color", tokens.ink_secondary)
	_moves.add_theme_font_size_override("font_size", tokens.font_body)
	_best.add_theme_color_override("font_color", tokens.accent_beam)
	_best.add_theme_font_size_override("font_size", tokens.font_caption)
	if _rank:
		_rank.add_theme_color_override("font_color", tokens.accent_signal)
		_rank.add_theme_font_size_override("font_size", tokens.font_caption)
	_continue.configure(tokens)
	_retry.configure(tokens)


func _load_tokens() -> DesignTokens:
	var path := "res://resources/configs/visual/default_design_tokens.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is DesignTokens:
			return res as DesignTokens
	return DesignTokens.new()
