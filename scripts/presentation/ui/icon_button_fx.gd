class_name IconButtonFx
extends Button
## Minimal icon button with idle breathe + press squash/glow (touch + focus).

@export var tokens: DesignTokens
@export var icon_text: String = "◀"
@export var enable_idle: bool = true
@export var enable_shimmer: bool = false

var _label: Label
var _glow: ColorRect
var _idle_tween: Tween
var _reduce_motion: bool = false


func _ready() -> void:
	if tokens == null:
		tokens = _load_tokens()
	focus_mode = Control.FOCUS_ALL
	flat = true
	custom_minimum_size = Vector2(tokens.touch_min, tokens.touch_min)
	text = ""
	_build()
	button_down.connect(_on_down)
	focus_entered.connect(func() -> void: IconMotion.play_focus(_label, tokens, true))
	focus_exited.connect(func() -> void: IconMotion.play_focus(_label, tokens, false))
	if enable_idle:
		_idle_tween = IconMotion.play_idle(_label, tokens, _reduce_motion)


func set_icon_text(glyph: String) -> void:
	icon_text = glyph
	if _label:
		_label.text = icon_text


func configure(p_tokens: DesignTokens, reduce_motion: bool = false) -> void:
	tokens = p_tokens
	_reduce_motion = reduce_motion
	if _label:
		_label.text = icon_text
		_label.add_theme_color_override("font_color", tokens.accent_signal)
		_label.add_theme_font_size_override("font_size", tokens.font_title)
	if _idle_tween and _idle_tween.is_valid():
		_idle_tween.kill()
	if enable_idle and not reduce_motion:
		_idle_tween = IconMotion.play_idle(_label, tokens, false)


func _build() -> void:
	add_theme_stylebox_override("normal", tokens.make_ghost_style())
	add_theme_stylebox_override("pressed", tokens.make_glass_style(true, false))
	add_theme_stylebox_override("hover", tokens.make_glass_style(false, true))
	add_theme_stylebox_override("focus", tokens.make_glass_style(false, true))

	_glow = ColorRect.new()
	_glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_glow.color = Color(1, 1, 1, 0)
	var mat_res := load("res://assets/shaders/materials/soft_glow.tres") as ShaderMaterial
	if mat_res:
		var mat := mat_res.duplicate() as ShaderMaterial
		mat.set_shader_parameter("glow_color", tokens.glow_tint)
		mat.set_shader_parameter("glow_strength", tokens.glow_idle * 0.4)
		mat.set_shader_parameter("pulse", 0.35 if not _reduce_motion else 0.0)
		_glow.material = mat
	_glow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_glow)

	_label = Label.new()
	_label.text = icon_text
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_label.add_theme_color_override("font_color", tokens.accent_signal)
	_label.add_theme_font_size_override("font_size", tokens.font_title)
	if enable_shimmer:
		var shim := load("res://assets/shaders/materials/icon_shimmer.tres") as ShaderMaterial
		if shim:
			_label.material = shim.duplicate()
	add_child(_label)
	_label.set_meta("icon_base_scale", Vector2.ONE)


func _on_down() -> void:
	IconMotion.play_press(_label, tokens, func(on: bool) -> void:
		if _glow and _glow.material:
			(_glow.material as ShaderMaterial).set_shader_parameter(
				"glow_strength",
				tokens.glow_press if on else tokens.glow_idle * 0.4
			)
	)


func _load_tokens() -> DesignTokens:
	var path := "res://resources/configs/visual/default_design_tokens.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is DesignTokens:
			return res as DesignTokens
	return DesignTokens.new()
