class_name CountdownComponent
extends PuzzleComponent
## Yellow-block fuse: decrements on each board shift settle, then destroys.
## Pure puzzle rule — BoardSim untouched.

var turns: int = 3
var max_turns: int = 3


func _on_setup() -> void:
	turns = get_param_int("turns", 3)
	max_turns = get_param_int("max_turns", turns)


func on_shift(ctx: PuzzleContext, board_result: SimResult) -> void:
	if turns <= 0:
		return
	## Tick on any successful board shift settle (fuse pressure).
	if board_result != null and not board_result.success:
		return
	turns -= 1
	ctx.emit(
		PuzzleEvent.make(PuzzleEvent.Kind.COUNTDOWN_TICK, owner_object.cell)
		.with_uid(owner_object.uid)
		.with_payload({"turns": turns, "max_turns": max_turns})
	)
	if turns <= 0:
		ctx.emit(
			PuzzleEvent.make(PuzzleEvent.Kind.BURN, owner_object.cell)
			.with_uid(owner_object.uid)
			.with_payload({"explode": true, "reason": "countdown"})
		)
		ctx.request_destroy(owner_object.uid)


func on_query(_ctx: PuzzleContext, query_id: StringName, _args: Dictionary) -> Variant:
	if query_id == &"countdown_turns":
		return turns
	return null


func write_state(state: Dictionary) -> void:
	state["turns"] = turns


func read_state(state: Dictionary) -> void:
	if state.has("turns"):
		turns = int(state["turns"])
