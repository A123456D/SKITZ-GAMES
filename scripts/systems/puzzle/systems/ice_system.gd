class_name IceSystem
extends RefCounted
## If a movable sits on ice with slide_dir set, keep sliding one cell.


static func run(ctx: PuzzleContext) -> void:
	for obj in ctx.world.objects_with(&"movable"):
		var mov: MovableComponent = obj.get_component(&"movable") as MovableComponent
		if mov == null or mov.slide_dir < 0:
			continue
		var floor_obj := ctx.world.get_floor_at(obj.cell)
		var on_ice := false
		if floor_obj and floor_obj.has_component(&"ice"):
			on_ice = true
		elif obj.has_component(&"ice"):
			on_ice = true
		if not on_ice:
			## Left ice — clear momentum.
			mov.set_slide_dir(-1)
			continue
		var vec := PuzzleEnums.dir_to_vec(mov.slide_dir)
		var dest := Vector2i(obj.cell.x + vec.x, obj.cell.y + vec.y)
		if not ctx.in_bounds(dest) or ctx.is_blocking(dest, obj):
			mov.set_slide_dir(-1)
			continue
		ctx.request_move(obj.uid, dest, &"ice")
