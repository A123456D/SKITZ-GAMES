class_name ShiftFeelConfig
extends Resource
## Tunable movement / juice profile for board shifts.
## Pure data — presentation systems read this; BoardSim never sees it.

@export_group("Timing")
## Base travel duration in seconds (frame-independent).
@export_range(0.04, 0.4, 0.001) var shift_duration: float = 0.088
## Floor when the command queue is deep (skilled chain play).
@export_range(0.03, 0.25, 0.001) var min_shift_duration: float = 0.042
## Multiplier applied per queued command ahead: duration *= factor ^ depth.
@export_range(0.5, 1.0, 0.01) var queue_pressure_factor: float = 0.86
## Near end of a tween, allow starting the next buffered command (gapless handoff).
@export_range(0.0, 0.08, 0.001) var handoff_window: float = 0.016
## Max buffered ShiftRow/ShiftColumn commands while animating.
@export_range(1, 8, 1) var max_command_queue: int = 3

@export_group("Easing")
## Godot Tween transition for primary travel (ELASTIC / SPRING preferred).
## Tween.TransitionType: ELASTIC=6, BACK=10, SPRING=11, CUBIC=7, QUAD=4
@export_enum("ELASTIC:6", "SPRING:11", "BACK:10", "CUBIC:7", "QUAD:4") var travel_trans: int = 6
@export_enum("EASE_OUT:1", "EASE_IN_OUT:2", "EASE_IN:0") var travel_ease: int = 1
## Extra settle punch after travel (seconds). 0 disables.
@export_range(0.0, 0.2, 0.001) var settle_duration: float = 0.032
@export_range(0.0, 0.2, 0.001) var overshoot_pixels: float = 8.0

@export_group("Camera")
@export_range(0.0, 2.0, 0.01) var shake_intensity: float = 1.0
@export_range(0.0, 1.0, 0.01) var land_trauma: float = 0.22
@export_range(0.0, 1.0, 0.01) var wrap_trauma: float = 0.12
@export_range(0.5, 8.0, 0.1) var trauma_decay: float = 3.2
@export_range(0.0, 24.0, 0.1) var shake_max_offset: float = 7.0
@export_range(0.0, 20.0, 0.1) var nudge_pixels: float = 5.0
@export_range(0.05, 0.5, 0.01) var nudge_return: float = 0.16
## Default land zoom pulse peak (fraction). Recipes may override.
@export_range(0.0, 0.05, 0.001) var land_zoom_pulse: float = 0.014

@export_group("Hit stop")
## Master enable for presentation hit-stop (view-only; see HitStopClock).
@export var hit_stop_enabled: bool = true
@export_range(0.0, 80.0, 1.0) var land_hit_stop_ms: float = 28.0

@export_group("Trails & Blur")
@export var trails_enabled: bool = true
@export_range(0.02, 0.4, 0.01) var trail_lifetime: float = 0.12
@export_range(1.0, 24.0, 0.5) var trail_width: float = 8.0
@export var motion_blur_enabled: bool = true
@export_range(0.0, 2.0, 0.05) var motion_blur_strength: float = 0.85

@export_group("Particles")
@export var particles_enabled: bool = true
@export_range(0, 48, 1) var land_burst_amount: int = 14
@export_range(0, 32, 1) var wrap_burst_amount: int = 8

@export_group("Audio")
@export var audio_enabled: bool = true
@export_range(0.0, 1.0, 0.01) var sfx_volume: float = 0.85
@export_range(0.0, 0.3, 0.01) var pitch_variance: float = 0.06

@export_group("Haptics")
@export var haptics_enabled: bool = true
@export_range(0.0, 1.0, 0.01) var haptic_intensity: float = 0.7

@export_group("Accessibility")
## Cuts overshoot, shake, blur, trails, hit-stop, zoom; keeps clarity land flash.
@export var reduce_motion: bool = false
@export var disable_motion_blur: bool = false
@export var disable_shake: bool = false
@export var disable_hit_stop: bool = false
@export var disable_zoom_pulse: bool = false

@export_group("Input")
@export_range(8.0, 80.0, 1.0) var swipe_threshold_px: float = 28.0
@export_range(0.0, 1.0, 0.05) var swipe_axis_bias: float = 0.35
## If true, mid-flight interrupt snaps current visuals then starts next (see docs).
@export var allow_interrupt_blend: bool = false


func effective_duration(queue_depth: int) -> float:
	var depth := maxi(0, queue_depth)
	var d := shift_duration * pow(queue_pressure_factor, float(depth))
	return maxf(min_shift_duration, d)


func effective_shake_scale() -> float:
	if reduce_motion or disable_shake:
		return 0.0
	return shake_intensity


func wants_trails() -> bool:
	return trails_enabled and not reduce_motion


func wants_blur() -> bool:
	return motion_blur_enabled and not disable_motion_blur and not reduce_motion


func wants_particles() -> bool:
	return particles_enabled and not reduce_motion


func wants_hit_stop() -> bool:
	return hit_stop_enabled and not reduce_motion and not disable_hit_stop


func wants_zoom_pulse() -> bool:
	return not reduce_motion and not disable_zoom_pulse and land_zoom_pulse > 0.0


func travel_transition() -> Tween.TransitionType:
	return travel_trans as Tween.TransitionType


func travel_ease_type() -> Tween.EaseType:
	return travel_ease as Tween.EaseType
