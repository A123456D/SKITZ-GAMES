class_name TeleporterComponent
extends PuzzleComponent
## Link pairs share link_id. Entering A sends movable to B (and vice versa).

var link_id: StringName = &"tp"
var cooldown_ticks: int = 1
var cooldown_left: int = 0
var bidirectional: bool = true


func _on_setup() -> void:
	link_id = get_param_string_name("link_id", &"tp")
	cooldown_ticks = get_param_int("cooldown_ticks", 1)
	bidirectional = get_param_bool("bidirectional", true)
	cooldown_left = 0


func on_tick(ctx: PuzzleContext, tick_index: int, dt_ms: int) -> void:
	if cooldown_left > 0:
		cooldown_left -= 1


func write_state(state: Dictionary) -> void:
	state["cooldown_left"] = cooldown_left


func read_state(state: Dictionary) -> void:
	if state.has("cooldown_left"):
		cooldown_left = int(state["cooldown_left"])
