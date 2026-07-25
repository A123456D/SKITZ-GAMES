class_name PowerPolicy
extends Object
## Battery / thermal policy. Low-processor mode ONLY in idle menus —
## never during gameplay (hurts touch→visual latency budget ≤50ms).
## Desktop aims for 120 FPS feel; physics stays low (puzzle is not RigidBody).

static var gameplay_active: bool = false
static var menu_idle: bool = false
static var battery_saver: bool = false
const DESKTOP_TARGET_FPS := 120
const MENU_IDLE_FPS := 30


static func set_gameplay_active(active: bool) -> void:
	gameplay_active = active
	_apply()


static func set_menu_idle(idle: bool) -> void:
	menu_idle = idle
	_apply()


static func set_battery_saver(on: bool) -> void:
	battery_saver = on
	_apply()


static func _apply() -> void:
	# Godot: sleep between frames when idle. Forbidden while playing.
	var allow_low := menu_idle and not gameplay_active
	OS.set_low_processor_usage_mode(allow_low)
	if allow_low:
		# ~20–30 FPS-ish idle; wakes on input. Battery saver sleeps longer.
		OS.set_low_processor_usage_mode_sleep_usec(33000 if battery_saver else 20000)
		Engine.max_fps = MENU_IDLE_FPS
	else:
		OS.set_low_processor_usage_mode_sleep_usec(0)
		## Uncap toward 120 on desktop / high-refresh; mobile still vsync-limited.
		if battery_saver:
			Engine.max_fps = 60
		else:
			Engine.max_fps = DESKTOP_TARGET_FPS
		_prefer_desktop_vsync()


static func _prefer_desktop_vsync() -> void:
	## Adaptive vsync on desktop lets high-refresh panels exceed 60 without tearing spikes.
	if OS.has_feature("mobile") or OS.has_feature("web"):
		return
	var adaptive := DisplayServer.VSYNC_ADAPTIVE
	if DisplayServer.window_get_vsync_mode() != adaptive:
		DisplayServer.window_set_vsync_mode(adaptive)


static func particle_multiplier() -> float:
	if battery_saver:
		return 0.4
	return 1.0


static func bloom_multiplier() -> float:
	if battery_saver:
		return 0.55
	return 1.0
