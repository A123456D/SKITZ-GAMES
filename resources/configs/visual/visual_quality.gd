class_name VisualQualityConfig
extends Resource
## Performance tier for bloom / glow / particles / background complexity.
## Hooks ShiftFeelConfig.reduce_motion when reduce_motion is true.
## battery_saver stacks on top of tier (cuts particles / bloom / preprocess).

enum Tier { HIGH, MEDIUM, LOW }

@export var tier: Tier = Tier.HIGH

@export_group("Bloom / Glow")
@export var bloom_enabled: bool = true
@export_range(0.0, 2.0, 0.01) var bloom_strength: float = 0.55
@export_range(0.0, 2.0, 0.01) var bloom_threshold: float = 0.72
@export_range(1, 9, 1) var bloom_samples: int = 5
## 1.0 = full-res bloom pass; Med/Low/Battery use lower effective samples + strength.
@export_range(0.25, 1.0, 0.05) var bloom_resolution_scale: float = 1.0
@export var soft_glow_enabled: bool = true

@export_group("Background")
@export var animated_background: bool = true
@export var parallax_enabled: bool = true
@export var light_beams_enabled: bool = true
@export_range(0.0, 1.0, 0.01) var background_intensity: float = 1.0

@export_group("Particles")
@export var ambient_particles: bool = true
@export_range(0, 64, 1) var ambient_amount: int = 18
@export var ui_confirm_particles: bool = true
@export_range(0, 48, 1) var ui_confirm_amount: int = 12
## Cap for land/wrap board bursts (samples × per-emitter).
@export_range(0, 64, 1) var board_burst_cap: int = 32
## GPUParticles preprocess (seconds). Off on Low / battery — avoids hitch on spawn.
@export var particle_preprocess: bool = true

@export_group("Glass / UI")
@export var glass_blur_enabled: bool = true
@export_range(1, 9, 1) var glass_blur_samples: int = 5
@export var icon_shimmer_enabled: bool = true

@export_group("Accessibility / Power")
## When true, cuts bloom, parallax, shimmer, ambient particles (keeps clarity).
@export var reduce_motion: bool = false
## Extra power profile: halves particles, softens bloom, disables preprocess & idle CPU sleep in menus.
@export var battery_saver: bool = false


func effective_bloom() -> bool:
	return bloom_enabled and not reduce_motion and bloom_strength > 0.001


func effective_bloom_strength() -> float:
	var s := bloom_strength
	if battery_saver:
		s *= 0.55
	s *= clampf(bloom_resolution_scale, 0.25, 1.0)
	return s


func effective_bloom_samples() -> int:
	var n := bloom_samples
	if battery_saver:
		n = mini(n, 3)
	if bloom_resolution_scale < 0.75:
		n = mini(n, 3)
	if bloom_resolution_scale < 0.5:
		n = mini(n, 2)
	return maxi(1, n)


func effective_parallax() -> bool:
	return parallax_enabled and animated_background and not reduce_motion and not battery_saver


func effective_ambient_particles() -> bool:
	return ambient_particles and not reduce_motion


func effective_ambient_amount() -> int:
	if not effective_ambient_particles():
		return 0
	var n := ambient_amount
	if battery_saver:
		n = int(ceil(float(n) * 0.4))
	return n


func effective_ui_confirm_amount() -> int:
	if not ui_confirm_particles:
		return 0
	var n := ui_confirm_amount
	if battery_saver:
		n = maxi(2, int(ceil(float(n) * 0.4)))
	if reduce_motion:
		n = maxi(2, n / 2)
	return n


func effective_board_burst_cap() -> int:
	var n := board_burst_cap
	if battery_saver:
		n = maxi(4, int(ceil(float(n) * 0.4)))
	if reduce_motion:
		return 0
	return n


func effective_particle_preprocess() -> float:
	if not particle_preprocess or battery_saver or tier == Tier.LOW:
		return 0.0
	if tier == Tier.MEDIUM:
		return 0.5
	return 2.0


func effective_glass_blur() -> bool:
	return glass_blur_enabled and not reduce_motion and not battery_saver


func effective_shimmer() -> bool:
	return icon_shimmer_enabled and not reduce_motion and not battery_saver


func apply_reduce_motion_from_feel(feel_reduce: bool) -> void:
	if feel_reduce:
		reduce_motion = true


static func make_high() -> VisualQualityConfig:
	var q := VisualQualityConfig.new()
	q.tier = Tier.HIGH
	q.bloom_enabled = true
	q.bloom_strength = 0.55
	q.bloom_threshold = 0.72
	q.bloom_samples = 5
	q.bloom_resolution_scale = 1.0
	q.soft_glow_enabled = true
	q.animated_background = true
	q.parallax_enabled = true
	q.light_beams_enabled = true
	q.background_intensity = 1.0
	q.ambient_particles = true
	q.ambient_amount = 18
	q.ui_confirm_particles = true
	q.ui_confirm_amount = 12
	q.board_burst_cap = 32
	q.particle_preprocess = true
	q.glass_blur_enabled = true
	q.glass_blur_samples = 5
	q.icon_shimmer_enabled = true
	return q


static func make_medium() -> VisualQualityConfig:
	var q := VisualQualityConfig.new()
	q.tier = Tier.MEDIUM
	q.bloom_enabled = true
	q.bloom_strength = 0.32
	q.bloom_threshold = 0.8
	q.bloom_samples = 3
	q.bloom_resolution_scale = 0.75
	q.soft_glow_enabled = true
	q.animated_background = true
	q.parallax_enabled = true
	q.light_beams_enabled = true
	q.background_intensity = 0.75
	q.ambient_particles = true
	q.ambient_amount = 8
	q.ui_confirm_particles = true
	q.ui_confirm_amount = 8
	q.board_burst_cap = 20
	q.particle_preprocess = true
	q.glass_blur_enabled = true
	q.glass_blur_samples = 3
	q.icon_shimmer_enabled = false
	return q


static func make_low() -> VisualQualityConfig:
	var q := VisualQualityConfig.new()
	q.tier = Tier.LOW
	q.bloom_enabled = false
	q.bloom_strength = 0.0
	q.bloom_threshold = 1.0
	q.bloom_samples = 1
	q.bloom_resolution_scale = 0.5
	q.soft_glow_enabled = false
	q.animated_background = true
	q.parallax_enabled = false
	q.light_beams_enabled = false
	q.background_intensity = 0.45
	q.ambient_particles = false
	q.ambient_amount = 0
	q.ui_confirm_particles = true
	q.ui_confirm_amount = 4
	q.board_burst_cap = 8
	q.particle_preprocess = false
	q.glass_blur_enabled = false
	q.glass_blur_samples = 1
	q.icon_shimmer_enabled = false
	return q
