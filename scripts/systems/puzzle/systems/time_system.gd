class_name TimeSystem
extends RefCounted
## Applies chronolock / slow markers onto actors inside time fields.


static func run(ctx: PuzzleContext, is_tick: bool) -> void:
	## Reset actor locks each pass, then re-apply.
	for actor_obj in ctx.world.objects_with(&"actor"):
		var actor: ActorComponent = actor_obj.get_component(&"actor") as ActorComponent
		if actor:
			actor.blocked_by_chronolock = false
			## Slow: inflate step_interval dynamically via tick skip.
			if _is_slowed(ctx, actor_obj) and is_tick:
				## Skip every other effective step by requiring extra accum.
				if ctx.tick_index % _slow_factor_for(ctx, actor_obj) != 0:
					actor.blocked_by_chronolock = true

	for time_obj in ctx.world.objects_with(&"time"):
		var tc: TimeComponent = time_obj.get_component(&"time") as TimeComponent
		if tc == null or not tc.is_field_active(ctx):
			continue
		if tc.mode == PuzzleEnums.TimeMode.CHRONOLOCK:
			for actor_obj in ctx.world.objects_with(&"actor"):
				if tc.contains_cell(actor_obj.cell):
					var actor: ActorComponent = actor_obj.get_component(&"actor") as ActorComponent
					if actor:
						actor.blocked_by_chronolock = true
						ctx.emit(
							PuzzleEvent.make(PuzzleEvent.Kind.TIME_LOCK, actor_obj.cell)
							.with_uid(actor_obj.uid)
							.with_payload({"source": String(time_obj.uid)})
						)
		## REWIND_POCKET capture/pulse handled in TimeComponent.on_tick


static func _is_slowed(ctx: PuzzleContext, obj: PuzzleObject) -> bool:
	for time_obj in ctx.world.objects_with(&"time"):
		var tc: TimeComponent = time_obj.get_component(&"time") as TimeComponent
		if tc and tc.mode == PuzzleEnums.TimeMode.SLOW and tc.is_field_active(ctx) and tc.contains_cell(obj.cell):
			return true
	return false


static func _slow_factor_for(ctx: PuzzleContext, obj: PuzzleObject) -> int:
	for time_obj in ctx.world.objects_with(&"time"):
		var tc: TimeComponent = time_obj.get_component(&"time") as TimeComponent
		if tc and tc.mode == PuzzleEnums.TimeMode.SLOW and tc.is_field_active(ctx) and tc.contains_cell(obj.cell):
			return tc.slow_factor
	return 1
