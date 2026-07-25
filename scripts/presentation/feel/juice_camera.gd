class_name JuiceCamera
extends Node2D
## Trauma-based screen shake + directional micro-nudge + tiny zoom pulse.
## Attach as a child of the play Camera2D (or parent the camera under this node).
## All motion is delta-timed — never assumes 60 FPS.
## _process idles off when trauma/nudge/zoom are settled (CPU / battery).

var feel: ShiftFeelConfig = null

var _trauma: float = 0.0
var _shake_dir: Vector2 = Vector2.RIGHT
var _nudge: Vector2 = Vector2.ZERO
var _nudge_vel: Vector2 = Vector2.ZERO
var _zoom_pulse: float = 0.0
var _zoom_vel: float = 0.0
var _base_zoom: Vector2 = Vector2.ONE
var _base_zoom_captured: bool = false
var _rng := RandomNumberGenerator.new()

@onready var _camera: Camera2D = _resolve_camera()


func _ready() -> void:
	_rng.randomize()
	set_process(false)
	if _camera == null:
		_camera = _resolve_camera()
	_capture_base_zoom()


func configure(p_feel: ShiftFeelConfig) -> void:
	feel = p_feel


func add_trauma(amount: float, direction: Vector2 = Vector2.ZERO) -> void:
	if feel == null:
		return
	var scale := feel.effective_shake_scale()
	if scale <= 0.0 or amount <= 0.0:
		return
	_trauma = clampf(_trauma + amount * scale, 0.0, 1.0)
	if direction.length_squared() < 0.0001:
		var a := _rng.randf() * TAU
		_shake_dir = Vector2(cos(a), sin(a))
	else:
		_shake_dir = direction.normalized()
	set_process(true)


func nudge(direction: Vector2, strength: float = -1.0) -> void:
	if feel == null or feel.reduce_motion:
		return
	var px := feel.nudge_pixels if strength < 0.0 else strength
	if px <= 0.0:
		return
	var dir := direction.normalized() if direction.length_squared() > 0.0001 else Vector2.RIGHT
	_nudge_vel += dir * (px * 18.0)
	set_process(true)


func pulse_zoom(peak: float, duration: float = 0.1) -> void:
	## peak: fractional zoom (0.015 = +1.5%). duration is settle window hint.
	if peak <= 0.0:
		return
	if feel and (feel.reduce_motion or feel.disable_zoom_pulse):
		return
	_capture_base_zoom()
	var boost := 1.0
	if duration > 0.0:
		boost = clampf(0.1 / duration, 0.6, 1.8)
	_zoom_vel += peak * 22.0 * boost
	set_process(true)


func _capture_base_zoom() -> void:
	if _camera == null:
		return
	if not _base_zoom_captured:
		_base_zoom = _camera.zoom
		_base_zoom_captured = true


func _resolve_camera() -> Camera2D:
	if has_node("Camera2D"):
		return $Camera2D as Camera2D
	var parent := get_parent()
	if parent is Camera2D:
		return parent as Camera2D
	if parent:
		for c in parent.get_children():
			if c is Camera2D:
				return c as Camera2D
	var viewport := get_viewport()
	if viewport:
		return viewport.get_camera_2d()
	return null


func _process(delta: float) -> void:
	if _camera == null:
		_camera = _resolve_camera()
		if _camera == null:
			set_process(false)
			return
	_capture_base_zoom()
	var decay := 3.2
	var max_off := 7.0
	var return_t := 0.16
	if feel:
		decay = feel.trauma_decay
		max_off = feel.shake_max_offset
		return_t = maxf(0.05, feel.nudge_return)

	if _trauma > 0.0:
		_trauma = maxf(_trauma - decay * delta * (_trauma + 0.15), 0.0)

	var shake := Vector2.ZERO
	if _trauma > 0.0 and (feel == null or feel.effective_shake_scale() > 0.0):
		var t2 := _trauma * _trauma
		var perp := Vector2(-_shake_dir.y, _shake_dir.x)
		var j := (_rng.randf() * 2.0 - 1.0)
		shake = (_shake_dir * t2 + perp * j * t2 * 0.35) * max_off

	var stiffness := 1.0 / return_t
	_nudge_vel += (-_nudge * (stiffness * stiffness) - _nudge_vel * (2.0 * stiffness)) * delta
	_nudge += _nudge_vel * delta

	var z_stiff := 1.0 / maxf(0.08, return_t * 0.85)
	_zoom_vel += (-_zoom_pulse * (z_stiff * z_stiff) - _zoom_vel * (2.0 * z_stiff)) * delta
	_zoom_pulse += _zoom_vel * delta
	if absf(_zoom_pulse) < 0.00005 and absf(_zoom_vel) < 0.00005:
		_zoom_pulse = 0.0
		_zoom_vel = 0.0

	_camera.offset = shake + _nudge
	var z := 1.0 + _zoom_pulse
	_camera.zoom = _base_zoom * z

	var idle := (
		_trauma <= 0.0001
		and _nudge.length_squared() < 0.0001
		and _nudge_vel.length_squared() < 0.0001
		and _zoom_pulse == 0.0
		and _zoom_vel == 0.0
	)
	if idle:
		_camera.offset = Vector2.ZERO
		_camera.zoom = _base_zoom
		set_process(false)
