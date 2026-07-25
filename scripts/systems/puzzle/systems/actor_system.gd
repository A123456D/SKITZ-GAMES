class_name ActorSystem
extends RefCounted
## Advance enemy patrol one cell when their tick interval allows.


static func run(ctx: PuzzleContext) -> void:
	for obj in ctx.world.objects_with(&"actor"):
		var actor: ActorComponent = obj.get_component(&"actor") as ActorComponent
		if actor == null or not actor.should_step_this_tick():
			continue
		var dir := actor.next_dir()
		var vec := PuzzleEnums.dir_to_vec(dir)
		var dest := Vector2i(obj.cell.x + vec.x, obj.cell.y + vec.y)
		if not ctx.in_bounds(dest) or ctx.is_blocking(dest, obj):
			continue
		var mov: MovableComponent = obj.get_component(&"movable") as MovableComponent
		if mov:
			mov.set_slide_dir(dir)
		ctx.request_move(obj.uid, dest, &"actor")
