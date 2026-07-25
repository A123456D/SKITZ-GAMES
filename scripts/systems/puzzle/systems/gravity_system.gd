class_name GravitySystem
extends RefCounted
## Movables on gravity floors fall one cell along gravity dir if free.


static func run(ctx: PuzzleContext) -> void:
	for grav_obj in ctx.world.objects_with(&"gravity"):
		var grav: GravityComponent = grav_obj.get_component(&"gravity") as GravityComponent
		if grav == null:
			continue
		## Occupant on this floor cell, or gravity field affecting objects in same cell / as component on movable.
		var occ := ctx.get_object_at(grav_obj.cell)
		if occ and grav.affects(occ) and occ.uid != grav_obj.uid:
			_try_fall(ctx, occ, grav.dir)
		## Also: gravity component attached to a movable itself.
		if grav_obj.has_component(&"movable") and grav.affects(grav_obj):
			_try_fall(ctx, grav_obj, grav.dir)


static func _try_fall(ctx: PuzzleContext, obj: PuzzleObject, dir: int) -> void:
	var vec := PuzzleEnums.dir_to_vec(dir)
	var dest := Vector2i(obj.cell.x + vec.x, obj.cell.y + vec.y)
	if not ctx.in_bounds(dest):
		return
	if ctx.is_blocking(dest, obj):
		return
	var mov: MovableComponent = obj.get_component(&"movable") as MovableComponent
	if mov:
		mov.set_slide_dir(dir)
	ctx.request_move(obj.uid, dest, &"gravity")
