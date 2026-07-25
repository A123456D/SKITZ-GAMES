class_name FireSystem
extends RefCounted
## Burn burnables on the same cell (and optionally neighbors).


static func run(ctx: PuzzleContext, is_tick: bool) -> void:
	## Fire resolves on discrete ticks only (frame-independent). Avoids multi-hit during ice cascades.
	if not is_tick:
		return
	for fire_obj in ctx.world.objects_with(&"fire"):
		var fire: FireComponent = fire_obj.get_component(&"fire") as FireComponent
		if fire == null:
			continue
		if not fire.should_burn_this_tick():
			continue
		_burn_cell(ctx, fire_obj.cell, fire.damage, fire_obj.uid)
		if fire.spread:
			for v in PuzzleEnums.DIR_VECTORS:
				var n := Vector2i(fire_obj.cell.x + v.x, fire_obj.cell.y + v.y)
				if ctx.in_bounds(n):
					_burn_cell(ctx, n, fire.damage, fire_obj.uid)


static func _burn_cell(ctx: PuzzleContext, cell: Vector2i, damage: int, source_uid: StringName) -> void:
	var occ := ctx.get_object_at(cell)
	if occ and occ.has_component(&"burnable") and occ.uid != source_uid:
		var b: BurnableComponent = occ.get_component(&"burnable") as BurnableComponent
		if b:
			b.apply_burn(ctx, damage)
	var fl := ctx.world.get_floor_at(cell)
	if fl and fl.has_component(&"burnable") and fl.uid != source_uid:
		var bf: BurnableComponent = fl.get_component(&"burnable") as BurnableComponent
		if bf:
			bf.apply_burn(ctx, damage)
