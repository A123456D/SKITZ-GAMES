class_name MotionDeform
extends RefCounted
## Squash / stretch / anticipation / follow-through / secondary motion helpers.
## Frame-independent tweens on CanvasItem (tiles + UI).

static func play_anticipation(target: CanvasItem, scale_to: Vector2, duration: float) -> Tween:
	if target == null or duration <= 0.0:
		return null
	var base := _base_scale(target)
	var tw := target.create_tween()
	tw.tween_property(target, "scale", base * scale_to, duration).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	return tw


static func play_squash(
	target: CanvasItem,
	squash_scale: Vector2,
	duration: float,
	follow_through: bool = true,
	follow_ms: float = 0.06
) -> Tween:
	if target == null or duration <= 0.0:
		return null
	var base := _base_scale(target)
	var tw := target.create_tween()
	var half := duration * 0.45
	tw.tween_property(target, "scale", base * squash_scale, half).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(target, "scale", base, duration * 0.55).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	if follow_through and follow_ms > 0.0:
		var soft := Vector2(
			lerpf(1.0, squash_scale.x, 0.25),
			lerpf(1.0, squash_scale.y, 0.25)
		)
		tw.tween_property(target, "scale", base * soft, follow_ms * 0.45).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		tw.tween_property(target, "scale", base, follow_ms * 0.55).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	return tw


static func play_press(target: CanvasItem, press_scale: float, duration: float) -> Tween:
	return play_squash(target, Vector2(press_scale, press_scale), duration, true, duration * 0.5)


static func play_secondary_lag(child: CanvasItem, parent: CanvasItem, lag_px: float = 2.5, duration: float = 0.06) -> Tween:
	## Nudge a child opposite to recent parent motion, then settle â€” cheap mass cue.
	if child == null or parent == null or duration <= 0.0:
		return null
	var dir := Vector2.RIGHT
	if parent.get_meta("last_move_dir", null) != null:
		dir = parent.get_meta("last_move_dir") as Vector2
	var origin: Vector2 = child.position
	var tw := child.create_tween()
	tw.tween_property(child, "position", origin - dir.normalized() * lag_px, duration * 0.4)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(child, "position", origin, duration * 0.6)\
		.set_trans(Tween.TRANS_SPRING).set_ease(Tween.EASE_OUT)
	return tw


static func axis_squash(direction: Vector2, amount: float = 0.05) -> Vector2:
	## Compress along motion axis, stretch perpendicular.
	if direction.length_squared() < 0.0001:
		return Vector2(1.0 + amount, 1.0 - amount)
	if absf(direction.x) >= absf(direction.y):
		return Vector2(1.0 + amount, 1.0 - amount)
	return Vector2(1.0 - amount, 1.0 + amount)


static func axis_anticipation(direction: Vector2, amount: float = 0.03) -> Vector2:
	## Stretch against motion before commit.
	if absf(direction.x) >= absf(direction.y):
		return Vector2(1.0 - amount, 1.0 + amount)
	return Vector2(1.0 + amount, 1.0 - amount)


static func _base_scale(target: CanvasItem) -> Vector2:
	if target.get_meta("deform_base_scale", null) != null:
		return target.get_meta("deform_base_scale") as Vector2
	var s: Vector2 = target.scale
	target.set_meta("deform_base_scale", s)
	return s
