class_name RulePipe
extends RefCounted
## Fixed deterministic system order after each board command / tick.
## Order matters: channels → doors → lasers → magnets → gravity → ice → fire → teleport → time → actors.

enum Phase {
	CHANNELS = 1,
	DOORS = 2,
	LASERS = 3,
	MAGNETS = 4,
	GRAVITY = 5,
	ICE = 6,
	FIRE = 7,
	TELEPORT = 8,
	TIME = 9,
	ACTORS = 10,
	APPLY_MUTATIONS = 11,
}


func run_post_shift(ctx: PuzzleContext, board_result: SimResult) -> void:
	for obj in ctx.world.all_objects():
		obj.call_shift(ctx, board_result)
	_run_phases(ctx, false)


func run_tick(ctx: PuzzleContext) -> void:
	for obj in ctx.world.all_objects():
		obj.call_tick(ctx, ctx.tick_index, ctx.dt_ms)
	_run_phases(ctx, true)


func run_recompute(ctx: PuzzleContext) -> void:
	_run_phases(ctx, false)


func _run_phases(ctx: PuzzleContext, is_tick: bool) -> void:
	ctx.begin_pass()
	## Channels (plates/switches) → lasers (receivers arm channels) → doors.
	ChannelSystem.run(ctx)
	LaserSystem.run(ctx)
	DoorSystem.run(ctx)
	MagnetSystem.run(ctx)
	GravitySystem.run(ctx)
	IceSystem.run(ctx)
	FireSystem.run(ctx, is_tick)
	TeleporterSystem.run(ctx)
	TimeSystem.run(ctx, is_tick)
	if is_tick:
		ActorSystem.run(ctx)
	_apply_mutations(ctx)


func _apply_mutations(ctx: PuzzleContext) -> void:
	## Destroys first (stable uid order), then spawns, then moves.
	var destroys := ctx.destroy_requests.duplicate()
	destroys.sort_custom(func(a: StringName, b: StringName) -> bool: return String(a) < String(b))
	for uid in destroys:
		var obj := ctx.get_object(uid)
		if obj == null:
			continue
		ctx.emit(
			PuzzleEvent.make(PuzzleEvent.Kind.OBJECT_DESTROYED, obj.cell).with_uid(uid)
		)
		ctx.world.remove_uid(ctx.board, uid)
		ctx.mutated = true

	var spawns := ctx.spawn_requests.duplicate()
	spawns.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var ca: Vector2i = a["cell"]
		var cb: Vector2i = b["cell"]
		if ca.y != cb.y:
			return ca.y < cb.y
		return ca.x < cb.x
	)
	for req in spawns:
		var def_id: StringName = req["def_id"]
		var cell: Vector2i = req["cell"]
		var as_floor: bool = bool(req.get("as_floor", false))
		var state: Dictionary = req.get("state", {})
		if not ctx.in_bounds(cell):
			continue
		if not as_floor and ctx.get_object_at(cell) != null:
			continue
		if not as_floor and ctx.is_blocking(cell, null):
			continue
		var obj := ctx.world.place_new(ctx.board, cell, def_id, &"", as_floor)
		if obj == null:
			continue
		if not state.is_empty():
			for key in state.keys():
				var comp := obj.get_component(StringName(str(key)))
				if comp != null and state[key] is Dictionary:
					comp.read_state(state[key] as Dictionary)
			obj.sync_state_from_components()
			if not as_floor:
				obj.write_to_tile(ctx.board.get_tile(cell.x, cell.y))
		ctx.mutated = true

	for req in ctx.move_requests:
		var uid: StringName = req["uid"]
		var to_cell: Vector2i = req["to"]
		var reason: StringName = req.get("reason", &"")
		var obj := ctx.get_object(uid)
		if obj == null:
			continue
		if ctx.is_blocking(to_cell, obj) and ctx.get_object_at(to_cell) != obj:
			continue
		var from := obj.cell
		## Axis-lock: magnets / gravity / ice cannot pull red off its allowed axis.
		if AxisLockFilter.blocks_move(obj, from, to_cell):
			continue
		## Notify exit/enter on terrain under cells if needed — ice/teleporter listen via systems.
		if ctx.world.move_uid(ctx.board, uid, to_cell):
			ctx.mutated = true
			var kind := PuzzleEvent.Kind.RESOLVE_PASS
			match reason:
				&"magnet":
					kind = PuzzleEvent.Kind.MAGNET_PULLED
				&"gravity":
					kind = PuzzleEvent.Kind.GRAVITY_FALL
				&"ice":
					kind = PuzzleEvent.Kind.ICE_SLIDE
				&"teleport":
					kind = PuzzleEvent.Kind.TELEPORT
				&"actor":
					kind = PuzzleEvent.Kind.ACTOR_STEPPED
			ctx.emit(
				PuzzleEvent.make(kind, from).with_uid(uid).with_to(to_cell).with_payload({"reason": String(reason)})
			)

	ctx.move_requests.clear()
	ctx.destroy_requests.clear()
	ctx.spawn_requests.clear()
	ctx.world.flush_to_board(ctx.board)
