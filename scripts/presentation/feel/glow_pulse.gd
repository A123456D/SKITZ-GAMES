class_name GlowPulse
extends RefCounted
## Soft glow / modulate pulses for tiles and UI overlays.

static func pulse_modulate(target: CanvasItem, strength: float, duration: float, tint: Color = Color(1.2, 1.25, 1.18, 1.0)) -> Tween:
	if target == null or duration <= 0.0:
		return null
	var peak := Color(
		lerpf(1.0, tint.r, strength),
		lerpf(1.0, tint.g, strength),
		lerpf(1.0, tint.b, strength),
		1.0
	)
	var tw := target.create_tween()
	tw.tween_property(target, "modulate", peak, duration * 0.35).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(target, "modulate", Color.WHITE, duration * 0.65).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	return tw


static func pulse_shader_glow(material: ShaderMaterial, peak_strength: float, duration: float) -> Tween:
	if material == null or duration <= 0.0:
		return null
	var host := Engine.get_main_loop() as SceneTree
	if host == null or host.root == null:
		return null
	# Drive via a throwaway Node tween on the scene tree root.
	var probe := host.root
	var tw := probe.create_tween()
	tw.tween_method(
		func(v: float) -> void:
			if material:
				material.set_shader_parameter("glow_strength", v),
		0.0,
		peak_strength,
		duration * 0.35
	).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_method(
		func(v: float) -> void:
			if material:
				material.set_shader_parameter("glow_strength", v),
		peak_strength,
		0.0,
		duration * 0.65
	).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
	return tw


static func set_glow_strength(material: ShaderMaterial, strength: float) -> void:
	if material:
		material.set_shader_parameter("glow_strength", strength)
