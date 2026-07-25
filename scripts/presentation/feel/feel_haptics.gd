class_name FeelHaptics
extends RefCounted
## Thin haptic hook. Uses Input.vibrate_handheld when available; safe no-op otherwise.

var feel: ShiftFeelConfig = null


func configure(p_feel: ShiftFeelConfig) -> void:
	feel = p_feel


func pulse_light() -> void:
	_vibrate(12)


func pulse_medium() -> void:
	_vibrate(28)


func pulse_heavy() -> void:
	_vibrate(45)


func on_land() -> void:
	pulse_medium()


func on_wrap() -> void:
	pulse_light()


func on_combo() -> void:
	pulse_heavy()


func _vibrate(duration_ms: int) -> void:
	if feel and (not feel.haptics_enabled or feel.haptic_intensity <= 0.0):
		return
	var scaled := int(round(float(duration_ms) * (feel.haptic_intensity if feel else 0.7)))
	if scaled <= 0:
		return
	# Godot 4: vibrate_handheld(duration_ms). No-ops on desktop without support.
	if Input.has_method("vibrate_handheld"):
		Input.vibrate_handheld(scaled)
