class_name MagnetSystem
extends RefCounted
## Pull/push tagged movables one step along row/col toward/away from magnet.


static func run(ctx: PuzzleContext) -> void:
	for mag_obj in ctx.world.objects_with(&"magnet"):
		var mag: MagnetComponent = mag_obj.get_component(&"magnet") as MagnetComponent
		if mag == null:
			continue
		for target in ctx.world.all_objects():
			if target.uid == mag_obj.uid:
				continue
			if not target.has_component(&"movable"):
				continue
			if not String(mag.target_tag).is_empty() and not target.has_tag(String(mag.target_tag)):
				continue
			if not _aligned(mag_obj.cell, target.cell, mag.axis):
				continue
			var dist := _axis_dist(mag_obj.cell, target.cell, mag.axis)
			if dist <= 0 or dist > mag.range_cells:
				continue
			if not _line_clear(ctx, mag_obj.cell, target.cell, mag.axis):
				continue
			var step := _step_vector(mag_obj.cell, target.cell, mag.polarity)
			if step == Vector2i.ZERO:
				continue
			var dest := Vector2i(target.cell.x + step.x * mag.strength, target.cell.y + step.y * mag.strength)
			## Clamp to one step for stability (strength>1 still one cell per pass; cascades via resolve loop).
			dest = Vector2i(target.cell.x + step.x, target.cell.y + step.y)
			if ctx.in_bounds(dest) and not ctx.is_blocking(dest, target):
				var mov: MovableComponent = target.get_component(&"movable") as MovableComponent
				if mov:
					mov.set_slide_dir(PuzzleEnums.vec_to_dir(step if mag.polarity > 0 else -step))
				ctx.request_move(target.uid, dest, &"magnet")


static func _aligned(a: Vector2i, b: Vector2i, axis: StringName) -> bool:
	match String(axis):
		"row":
			return a.y == b.y
		"col":
			return a.x == b.x
		"both":
			return a.x == b.x or a.y == b.y
		_:
			return a.y == b.y


static func _axis_dist(a: Vector2i, b: Vector2i, axis: StringName) -> int:
	if a.y == b.y:
		return absi(a.x - b.x)
	if a.x == b.x:
		return absi(a.y - b.y)
	return 0


static func _line_clear(ctx: PuzzleContext, from: Vector2i, to: Vector2i, axis: StringName) -> bool:
	## Intermediate cells between from and to must be non-blocking (excluding endpoints).
	var step := Vector2i(
		signi(to.x - from.x),
		signi(to.y - from.y)
	)
	if step == Vector2i.ZERO:
		return false
	var c := Vector2i(from.x + step.x, from.y + step.y)
	while c != to:
		if ctx.is_blocking(c):
			return false
		c = Vector2i(c.x + step.x, c.y + step.y)
	return true


static func _step_vector(mag: Vector2i, target: Vector2i, polarity: int) -> Vector2i:
	## ATTRACT: move target toward magnet. REPEL: away.
	var dx := signi(mag.x - target.x)
	var dy := signi(mag.y - target.y)
	if polarity < 0:
		dx = -dx
		dy = -dy
	## Prefer primary axis of separation.
	if absi(mag.x - target.x) >= absi(mag.y - target.y):
		return Vector2i(dx, 0)
	return Vector2i(0, dy)
