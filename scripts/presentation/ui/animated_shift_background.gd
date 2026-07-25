class_name AnimatedShiftBackground
extends Control
## Slow parallax grid + shifting light planes. Elegant ambient — never busy.

const _ShaderFx := preload("res://scripts/utils/shader_fx.gd")

var _fill: ColorRect
var _mat: ShaderMaterial
var _tokens: DesignTokens
var _quality: VisualQualityConfig
var _parallax: Vector2 = Vector2.ZERO
var _target_parallax: Vector2 = Vector2.ZERO


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill = ColorRect.new()
	_fill.name = "GradientFill"
	_fill.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fill)
	_mat = _ShaderFx.load_material(
		"res://assets/shaders/materials/dynamic_gradient_bg.tres",
		"res://assets/shaders/source/dynamic_gradient_bg.gdshader"
	) as ShaderMaterial
	if _mat:
		_fill.material = _mat
	else:
		# Solid fallback when canvas shader cannot compile (avoids white RD spam).
		_fill.color = Color(0.055, 0.067, 0.086, 1)
	set_process(true)


func apply_tokens(tokens: DesignTokens, quality: VisualQualityConfig) -> void:
	_tokens = tokens
	_quality = quality
	if _mat == null:
		return
	_mat.set_shader_parameter("color_a", tokens.gradient_a)
	_mat.set_shader_parameter("color_b", tokens.gradient_b)
	_mat.set_shader_parameter("color_c", tokens.gradient_c)
	_mat.set_shader_parameter("beam_color", tokens.beam_color)
	_mat.set_shader_parameter("grid_color", Color(tokens.bg_grid_line.r, tokens.bg_grid_line.g, tokens.bg_grid_line.b, tokens.grid_opacity))
	_mat.set_shader_parameter("grid_scale", tokens.grid_cell_px)
	var intensity := quality.background_intensity if quality else 1.0
	var animate := quality == null or quality.animated_background
	var beams := quality == null or (quality.light_beams_enabled and not quality.reduce_motion)
	_mat.set_shader_parameter("intensity", intensity)
	_mat.set_shader_parameter("beams_enabled", 1.0 if beams else 0.0)
	_mat.set_shader_parameter("drift_speed", tokens.duration_bg_drift * 0.028 if animate and (quality == null or not quality.reduce_motion) else 0.0)
	_mat.set_shader_parameter("beam_speed", 0.05 if beams else 0.0)
	set_process(quality == null or quality.effective_parallax())


func _process(delta: float) -> void:
	if _quality and not _quality.effective_parallax():
		_parallax = Vector2.ZERO
		if _mat:
			_mat.set_shader_parameter("parallax_offset", _parallax)
		return
	var amp := _tokens.parallax_px if _tokens else 12.0
	# Gentle idle drift (frame-independent).
	_target_parallax = Vector2(
		sin(Time.get_ticks_msec() * 0.00015) * amp,
		cos(Time.get_ticks_msec() * 0.00011) * amp * 0.65
	)
	_parallax = _parallax.lerp(_target_parallax, 1.0 - exp(-delta * 2.2))
	if _mat:
		_mat.set_shader_parameter("parallax_offset", _parallax)
