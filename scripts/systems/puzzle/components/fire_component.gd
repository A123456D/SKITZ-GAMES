class_name FireComponent
extends PuzzleComponent
## Burns burnable objects on this cell (floor) or adjacent if spread enabled.

var spread: bool = false
var damage: int = 1
var tick_interval: int = 1 ## apply every N ticks
var _tick_accum: int = 0


func _on_setup() -> void:
	spread = get_param_bool("spread", false)
	damage = get_param_int("damage", 1)
	tick_interval = maxi(1, get_param_int("tick_interval", 1))


func on_tick(ctx: PuzzleContext, tick_index: int, dt_ms: int) -> void:
	_tick_accum += 1


func should_burn_this_tick() -> bool:
	if _tick_accum < tick_interval:
		return false
	_tick_accum = 0
	return true


func write_state(state: Dictionary) -> void:
	state["tick_accum"] = _tick_accum


func read_state(state: Dictionary) -> void:
	if state.has("tick_accum"):
		_tick_accum = int(state["tick_accum"])
