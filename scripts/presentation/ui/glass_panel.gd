class_name GlassPanel
extends Panel
## Glass surface: StyleBox from tokens, optional frosted shader when quality allows.

const _ShaderFx := preload("res://scripts/utils/shader_fx.gd")

@export var tokens: DesignTokens
@export var use_frosted_shader: bool = true

var _frost: ColorRect
var _quality: VisualQualityConfig


func _ready() -> void:
	if tokens == null:
		tokens = _load_tokens()
	_apply()


func configure(p_tokens: DesignTokens, quality: VisualQualityConfig = null) -> void:
	tokens = p_tokens
	_quality = quality
	_apply()


func _apply() -> void:
	if tokens == null:
		return
	add_theme_stylebox_override("panel", tokens.make_panel_style())
	var want_frost := use_frosted_shader and (_quality == null or _quality.effective_glass_blur())
	if want_frost:
		_ensure_frost()
	elif _frost:
		_frost.visible = false


func _ensure_frost() -> void:
	if _frost == null:
		var mat := _ShaderFx.load_material(
			"res://assets/shaders/materials/glass_panel.tres",
			"res://assets/shaders/source/glass_panel.gdshader"
		) as ShaderMaterial
		if mat == null:
			# StyleBox panel still shows; skip frosted screen sample rather than white-screening.
			return
		var copy := BackBufferCopy.new()
		copy.name = "GlassCopy"
		copy.copy_mode = BackBufferCopy.COPY_MODE_VIEWPORT
		add_child(copy)
		move_child(copy, 0)
		_frost = ColorRect.new()
		_frost.name = "Frost"
		_frost.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_frost.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		mat.set_shader_parameter("tint", tokens.surface_glass)
		mat.set_shader_parameter("border_color", tokens.surface_glass_border)
		mat.set_shader_parameter("glow_color", Color(tokens.accent_signal.r, tokens.accent_signal.g, tokens.accent_signal.b, 0.12))
		if _quality:
			mat.set_shader_parameter("blur_samples", _quality.glass_blur_samples)
			mat.set_shader_parameter("blur_amount", 1.6 if _quality.effective_glass_blur() else 0.0)
			mat.set_shader_parameter("noise_strength", 0.0 if _quality.battery_saver or _quality.tier == VisualQualityConfig.Tier.LOW else 0.035)
		_frost.material = mat
		add_child(_frost)
		move_child(_frost, 1)
	_frost.visible = true


func _load_tokens() -> DesignTokens:
	var path := "res://resources/configs/visual/default_design_tokens.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is DesignTokens:
			return res as DesignTokens
	return DesignTokens.new()
