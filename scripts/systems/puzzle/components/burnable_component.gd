class_name BurnableComponent
extends PuzzleComponent
## Hit points consumed by fire. At 0, object is destroyed.

var hp: int = 1
var max_hp: int = 1


func _on_setup() -> void:
	hp = get_param_int("hp", 1)
	max_hp = get_param_int("max_hp", hp)


func apply_burn(ctx: PuzzleContext, damage: int) -> void:
	hp = maxi(0, hp - damage)
	ctx.emit(
		PuzzleEvent.make(PuzzleEvent.Kind.BURN, owner_object.cell)
		.with_uid(owner_object.uid)
		.with_payload({"hp": hp, "damage": damage})
	)
	if hp <= 0:
		ctx.request_destroy(owner_object.uid)


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"is_burnable":
		return true
	if query_id == &"burn_hp":
		return hp
	return null


func write_state(state: Dictionary) -> void:
	state["hp"] = hp


func read_state(state: Dictionary) -> void:
	if state.has("hp"):
		hp = int(state["hp"])
