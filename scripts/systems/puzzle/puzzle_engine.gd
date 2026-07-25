class_name PuzzleEngine
extends RefCounted
## Coordinates BoardSession → puzzle RulePipe without polluting BoardSim.
## Usage: engine.bind_session(session); engine.apply(cmd) OR resolve_after(sim_result).

signal puzzle_events(events: Array)
signal resolved(turn: PuzzleTurnResult)

var session: BoardSession = null
var world: PuzzleWorld = PuzzleWorld.new()
var pipe: RulePipe = RulePipe.new()
var tick_index: int = 0
var tick_ms: int = PuzzleEnums.DEFAULT_TICK_MS
var last_resolve_passes: int = 0
var _uid_seed: int = 1


func bind_session(p_session: BoardSession) -> void:
	session = p_session


func setup_catalog(defs: Array) -> void:
	world.setup_catalog(defs)


func register_def(def: PuzzleObjectDef) -> void:
	world.register_def(def)


func bootstrap_from_board() -> void:
	assert(session != null)
	world.rebuild_from_board(session.get_state())
	var ctx := _make_context()
	for obj in world.all_objects():
		obj.call_setup(ctx)
	## Initial settle (doors/lasers + any immediate gravity/teleport cascades).
	_emit_events(_resolve_loop(ctx, false))


## Player/network command: board apply then deterministic puzzle resolve.
func apply(cmd: BoardCommand, record: bool = true) -> PuzzleTurnResult:
	assert(session != null)
	## Axis-lock: cycle other cells around fixed riders, or reject if impossible.
	var plan := AxisLockFilter.plan_cycle_around_locks(self, cmd)
	if not plan.is_empty():
		if bool(plan.get("reject", false)):
			var rejected := SimResult.rejected(AxisLockFilter.REJECT_REASON, cmd)
			var turn_r := PuzzleTurnResult.from_board_only(rejected)
			turn_r.success = false
			return turn_r
		if bool(plan.get("noop", false)):
			var noop := SimResult.ok([SimEvent.shift_settled(cmd, [])], [])
			return PuzzleTurnResult.from_board_only(noop)
		var writes: Array = plan.get("writes", [])
		var moves: Array = plan.get("moves", [])
		var meta := {
			"movable": plan.get("movable", []),
			"k": int(plan.get("k", 0)),
			"is_row": bool(plan.get("is_row", false)),
		}
		var br_cycle := session.apply_axis_cycle(cmd, writes, moves, record, meta)
		AxisLockFilter.remap_connections_for_cycle(
			session.get_state(),
			cmd,
			meta["movable"],
			int(meta["k"]),
			bool(meta["is_row"])
		)
		## Force channel/laser settle after cycle-around-fixed (connections remapped).
		return resolve_after(br_cycle)
	var br := session.apply(cmd, record)
	return resolve_after(br)


func shift_row(row: int, dir: int, steps: int = 1) -> PuzzleTurnResult:
	return apply(BoardCommand.shift_row(row, dir, steps))


func shift_column(column: int, dir: int, steps: int = 1) -> PuzzleTurnResult:
	return apply(BoardCommand.shift_column(column, dir, steps))


## Hook for external session.apply — call after a successful board command.
func resolve_after(sim_result: SimResult) -> PuzzleTurnResult:
	var turn := PuzzleTurnResult.from_board_only(sim_result)
	if sim_result == null or not sim_result.success:
		return turn
	## Safety net if feel/session applied a shift that violated axis-lock.
	AxisLockFilter.correct_after_shift(self, sim_result)
	world.rebuild_from_board(session.get_state())
	var ctx := _make_context()
	pipe.run_post_shift(ctx, sim_result)
	var all_events := _resolve_loop(ctx, true)
	turn.events = all_events
	turn.resolve_passes = last_resolve_passes
	turn.success = true
	_emit_events(all_events)
	resolved.emit(turn)
	return turn


## Discrete sim tick for enemies / fire / time. Pass seeded dt_ms (not Node delta).
func tick(p_dt_ms: int = -1) -> Array[PuzzleEvent]:
	assert(session != null)
	if p_dt_ms > 0:
		tick_ms = p_dt_ms
	tick_index += 1
	world.rebuild_from_board(session.get_state())
	var ctx := _make_context()
	ctx.tick_index = tick_index
	ctx.dt_ms = tick_ms
	pipe.run_tick(ctx)
	var all_events := _resolve_loop(ctx, true)
	_emit_events(all_events)
	return all_events


func place(cell: Vector2i, def_id: StringName, as_floor: bool = false, uid: StringName = &"") -> PuzzleObject:
	assert(session != null)
	return world.place_new(session.get_state(), cell, def_id, uid, as_floor)


func get_channels() -> PuzzleChannelBus:
	return world.channels


## Force a full puzzle recompute (doors/lasers/etc.) without a board command.
func recompute() -> Array[PuzzleEvent]:
	assert(session != null)
	world.rebuild_from_board(session.get_state())
	var ctx := _make_context()
	pipe.run_recompute(ctx)
	var all_events := _resolve_loop(ctx, true)
	_emit_events(all_events)
	return all_events


## Activate a switch at cell (player interact / test helper).
func interact_at(cell: Vector2i) -> Array[PuzzleEvent]:
	world.rebuild_from_board(session.get_state())
	var obj := world.get_at(cell)
	if obj == null:
		obj = world.get_floor_at(cell)
	if obj == null:
		return []
	var sw: SwitchComponent = obj.get_component(&"switch") as SwitchComponent
	if sw == null:
		return []
	var ctx := _make_context()
	sw.force_activate(ctx)
	world.flush_to_board(session.get_state())
	var events: Array[PuzzleEvent] = []
	events.append_array(ctx.events)
	events.append_array(recompute())
	return events


func is_door_open(cell: Vector2i) -> bool:
	var obj := world.get_at(cell)
	if obj == null:
		obj = world.get_floor_at(cell)
	if obj == null:
		return false
	var q: Variant = obj.query(_make_context(), &"door_open", {})
	return bool(q) if q != null else false


## Continues cascade after an initial pipe run already executed on `ctx`.
## If `already_ran` is false, runs recompute first.
func _resolve_loop(ctx: PuzzleContext, already_ran: bool) -> Array[PuzzleEvent]:
	var all_events: Array[PuzzleEvent] = []
	var passes := 0
	if not already_ran:
		pipe.run_recompute(ctx)
	passes = 1
	all_events.append_array(ctx.events)
	var needs_more := ctx.mutated
	while needs_more and passes < PuzzleEnums.RESOLVE_PASS_CAP:
		world.rebuild_from_board(session.get_state())
		ctx = _make_context()
		ctx.tick_index = tick_index
		ctx.dt_ms = tick_ms
		pipe.run_recompute(ctx)
		all_events.append_array(ctx.events)
		passes += 1
		needs_more = ctx.mutated
	last_resolve_passes = passes
	return all_events


func _make_context() -> PuzzleContext:
	var ctx := PuzzleContext.new()
	ctx.world = world
	ctx.board = session.get_state()
	ctx.channels = world.channels
	ctx.catalog = world.catalog
	ctx.tick_index = tick_index
	ctx.dt_ms = tick_ms
	ctx.events = []
	ctx.clear_pass_buffers()
	return ctx


func _emit_events(events: Array[PuzzleEvent]) -> void:
	if events.is_empty():
		return
	puzzle_events.emit(events)
