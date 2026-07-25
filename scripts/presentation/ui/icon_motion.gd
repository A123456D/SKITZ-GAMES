class_name IconMotion
extends RefCounted
## Subtle idle breathe + press squash/glow for icon buttons. Frame-independent tweens.

static func play_idle(target: CanvasItem, tokens: DesignTokens, reduce_motion: bool = false) -> Tween:
	if target == null or reduce_motion:
		return null
	var tw := target.create_tween()
	tw.set_loops()
	var dur := tokens.duration_icon_idle if tokens else 3.6
	var base: Vector2 = target.scale
	tw.tween_property(target, "scale", base * 1.035, dur * 0.5).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tw.tween_property(target, "scale", base, dur * 0.5).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	return tw


static func play_press(target: CanvasItem, tokens: DesignTokens, on_glow: Callable = Callable()) -> Tween:
	if target == null:
		return null
	var press_scale := tokens.press_scale if tokens else 0.96
	var dur := tokens.duration_press if tokens else 0.08
	var base := Vector2.ONE
	if target.get_meta("icon_base_scale", null) != null:
		base = target.get_meta("icon_base_scale") as Vector2
	else:
		base = target.scale
		target.set_meta("icon_base_scale", base)
	var tw := target.create_tween()
	tw.tween_property(target, "scale", base * press_scale, dur).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(target, "scale", base, dur * 1.15).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	if on_glow.is_valid():
		on_glow.call(true)
		tw.finished.connect(func() -> void: on_glow.call(false))
	return tw


static func play_focus(target: CanvasItem, tokens: DesignTokens, focused: bool) -> Tween:
	if target == null:
		return null
	var focus_scale := tokens.focus_scale if tokens else 1.02
	var dur := tokens.duration_focus if tokens else 0.14
	var base := Vector2.ONE
	if target.get_meta("icon_base_scale", null) != null:
		base = target.get_meta("icon_base_scale") as Vector2
	else:
		base = target.scale
		target.set_meta("icon_base_scale", base)
	var tw := target.create_tween()
	var to := base * focus_scale if focused else base
	tw.tween_property(target, "scale", to, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	return tw
