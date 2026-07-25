class_name EffectRecipe
extends Resource
## Data-driven satisfaction beat. Add a new interaction = new recipe asset + play(id).
## Presentation only — BoardSim never loads this.

enum Intensity { MICRO, MEDIUM, HEAVY }

@export var id: StringName = &""
@export var intensity: Intensity = Intensity.MEDIUM
@export_multiline var notes: String = ""

@export_group("Time")
## Real-time hit-stop duration in milliseconds (ignore_time_scale). 0 = off.
@export_range(0.0, 120.0, 1.0) var hit_stop_ms: float = 0.0
@export_range(0.01, 0.2, 0.01) var hit_stop_time_scale: float = 0.06

@export_group("Camera")
@export_range(0.0, 1.0, 0.01) var trauma: float = 0.0
## -1 = use ShiftFeelConfig.nudge_pixels; 0 = skip nudge.
@export_range(-1.0, 24.0, 0.1) var nudge_pixels: float = -1.0
@export var nudge_opposite_first: bool = false
## Peak zoom delta (0.015 = +1.5%). 0 = off.
@export_range(0.0, 0.05, 0.001) var zoom_pulse: float = 0.0
@export_range(0.0, 400.0, 1.0) var zoom_pulse_ms: float = 100.0

@export_group("Motion deform")
@export var anticipation: bool = false
@export var anticipation_scale: Vector2 = Vector2(0.97, 1.03)
@export_range(0.0, 80.0, 1.0) var anticipation_ms: float = 28.0
@export var squash: bool = false
@export var squash_scale: Vector2 = Vector2(1.05, 0.95)
@export_range(0.0, 120.0, 1.0) var squash_ms: float = 45.0
@export var overshoot_settle: bool = false
@export var follow_through: bool = false
@export_range(0.0, 200.0, 1.0) var follow_through_ms: float = 60.0
@export var secondary_motion: bool = false

@export_group("Particles / glow")
@export var particles: bool = false
## -1 = feel default amount.
@export_range(-1, 64, 1) var particle_amount: int = -1
@export var wrap_particles: bool = false
@export var glow_pulse: bool = false
@export_range(0.0, 2.0, 0.01) var glow_strength: float = 0.7
@export_range(0.0, 400.0, 1.0) var glow_ms: float = 120.0

@export_group("Audio layers")
@export var audio_whoosh: bool = false
@export var audio_tick: bool = false
@export var audio_land: bool = false
@export var audio_sub: bool = false
@export var audio_combo: bool = false
@export var audio_ui: bool = false
@export var audio_solve: bool = false
@export var audio_error: bool = false

@export_group("Haptics")
## 0 none · 1 light · 2 medium · 3 heavy
@export_range(0, 3, 1) var haptic: int = 0


func hit_stop_sec() -> float:
	return hit_stop_ms * 0.001


func zoom_pulse_sec() -> float:
	return zoom_pulse_ms * 0.001


func anticipation_sec() -> float:
	return anticipation_ms * 0.001


func squash_sec() -> float:
	return squash_ms * 0.001


func follow_through_sec() -> float:
	return follow_through_ms * 0.001


func glow_sec() -> float:
	return glow_ms * 0.001


func intensity_scale() -> float:
	match intensity:
		Intensity.MICRO:
			return 0.65
		Intensity.HEAVY:
			return 1.35
		_:
			return 1.0
