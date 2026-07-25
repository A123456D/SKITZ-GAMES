class_name GlassButton
extends Button
## Touch-friendly glass CTA: press + focus states (not hover-only).

@export var tokens: DesignTokens
@export var use_shader_glass: bool = false

var _glow: ColorRect
var _glass_overlay: ColorRect
var _press_tween: Tween
var _idle_tween: Tween


func _ready() -> void:
	if tokens == null:
		tokens = _load_tokens()
	focus_mode = Control.FOCUS_ALL
	custom_minimum_size = Vector2(tokens.touch_min * 2.5, tokens.touch_min)
	_apply_styles()
	_ensure_glow()
	button_down.connect(_on_down)
	button_up.connect(_on_up)
	focus_entered.connect(_on_focus.bind(true))
	focus_exited.connect(_on_focus.bind(false))
	resized.connect(_layout_overlays)
	_layout_overlays()


func configure(p_tokens: DesignTokens) -> void:
	tokens = p_tokens
	_apply_styles()


func _apply_styles() -> void:
	if tokens == null:
		return
	add_theme_stylebox_override("normal", tokens.make_glass_style(false, false))
	add_theme_stylebox_override("pressed", tokens.make_glass_style(true, false))
	add_theme_stylebox_override("hover", tokens.make_glass_style(false, true))
	add_theme_stylebox_override("focus", tokens.make_glass_style(false, true))
	add_theme_color_override("font_color", tokens.ink_primary)
	add_theme_color_override("font_pressed_color", tokens.accent_signal)
	add_theme_color_override("font_hover_color", tokens.accent_beam)
	add_theme_color_override("font_focus_color", tokens.accent_focus)
	add_theme_font_size_override("font_size", tokens.font_body)


func _ensure_glow() -> void:
	_glow = ColorRect.new()
	_glow.name = "PressGlow"
	_glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_glow.color = Color(tokens.accent_signal.r, tokens.accent_signal.g, tokens.accent_signal.b, 0.0)
	var mat_res := load("res://assets/shaders/materials/soft_glow.tres") as ShaderMaterial
	if mat_res:
		var mat := mat_res.duplicate() as ShaderMaterial
		mat.set_shader_parameter("glow_color", tokens.glow_tint)
		mat.set_shader_parameter("glow_strength", 0.0)
		_glow.material = mat
	add_child(_glow)
	move_child(_glow, 0)


func _layout_overlays() -> void:
	if _glow:
		_glow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		_glow.offset_left = -8
		_glow.offset_top = -8
		_glow.offset_right = 8
		_glow.offset_bottom = 8


func _on_down() -> void:
	if _press_tween and _press_tween.is_valid():
		_press_tween.kill()
	_press_tween = IconMotion.play_press(self, tokens, _set_glow)


func _on_up() -> void:
	_set_glow(false)


func _on_focus(on: bool) -> void:
	IconMotion.play_focus(self, tokens, on)
	if on:
		_set_glow(true)
	else:
		_set_glow(false)


func _set_glow(on: bool) -> void:
	if _glow == null or _glow.material == null:
		return
	var mat := _glow.material as ShaderMaterial
	var strength := tokens.glow_press if on else 0.0
	mat.set_shader_parameter("glow_strength", strength)
	_glow.color.a = 0.35 if on else 0.0


func _load_tokens() -> DesignTokens:
	var path := "res://resources/configs/visual/default_design_tokens.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is DesignTokens:
			return res as DesignTokens
	return DesignTokens.new()
