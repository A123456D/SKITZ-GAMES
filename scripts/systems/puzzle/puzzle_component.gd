class_name PuzzleComponent
extends RefCounted
## Base behavior unit. Objects are bags of these — never Wall extends Door trees.
## Override only the hooks you need; systems call them in a fixed order.

var component_id: StringName = &""
var params: Dictionary = {}
## Owning runtime object (set by PuzzleObject.attach).
var owner_object: PuzzleObject = null


func setup(p_params: Dictionary) -> void:
	params = p_params.duplicate(true)
	_on_setup()


func _on_setup() -> void:
	pass


## Called once after the object is placed / world rebuilt.
func on_setup(ctx: PuzzleContext) -> void:
	pass


## After a board shift/rotate settled (geometry may have moved).
func on_shift(ctx: PuzzleContext, board_result: SimResult) -> void:
	pass


## Another puzzle object (or presser) entered this cell.
func on_enter(ctx: PuzzleContext, other: PuzzleObject) -> void:
	pass


## Something left this cell.
func on_exit(ctx: PuzzleContext, other: PuzzleObject) -> void:
	pass


## Discrete sim tick (enemies, time, fire). `tick_index` is monotonic; `dt_ms` is seeded.
func on_tick(ctx: PuzzleContext, tick_index: int, dt_ms: int) -> void:
	pass


## Synchronous query (blocking?, laser reflect?, pressable?, …). Return null if unhandled.
func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	return null


## Persist/load component runtime into tile payload state dict.
func write_state(state: Dictionary) -> void:
	pass


func read_state(state: Dictionary) -> void:
	pass


func get_param(key: String, default: Variant = null) -> Variant:
	return params.get(key, default)


func get_param_bool(key: String, default: bool = false) -> bool:
	return bool(params.get(key, default))


func get_param_int(key: String, default: int = 0) -> int:
	return int(params.get(key, default))


func get_param_float(key: String, default: float = 0.0) -> float:
	return float(params.get(key, default))


func get_param_string_name(key: String, default: StringName = &"") -> StringName:
	var v: Variant = params.get(key, default)
	return StringName(str(v))
