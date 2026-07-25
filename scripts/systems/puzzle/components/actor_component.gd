class_name ActorComponent
extends PuzzleComponent
## Enemy / NPC. Patrol pattern is data: Array of Dir ints, looping.

var pattern: Array = [] ## e.g. [0,0,1,1] = E,E,S,S
var pattern_index: int = 0
var step_interval: int = 1 ## act every N ticks
var _tick_accum: int = 0
var blocked_by_chronolock: bool = false


func _on_setup() -> void:
	var p: Variant = params.get("pattern", [0])
	pattern = []
	if p is Array:
		for d in p:
			pattern.append(int(d))
	if pattern.is_empty():
		pattern = [PuzzleEnums.Dir.EAST]
	pattern_index = get_param_int("pattern_index", 0)
	step_interval = maxi(1, get_param_int("step_interval", 1))


func on_tick(ctx: PuzzleContext, tick_index: int, dt_ms: int) -> void:
	_tick_accum += 1


func should_step_this_tick() -> bool:
	if blocked_by_chronolock:
		return false
	if _tick_accum < step_interval:
		return false
	_tick_accum = 0
	return true


func next_dir() -> int:
	var d := int(pattern[pattern_index % pattern.size()])
	pattern_index = (pattern_index + 1) % pattern.size()
	return d


func peek_dir() -> int:
	return int(pattern[pattern_index % pattern.size()])


func write_state(state: Dictionary) -> void:
	state["pattern_index"] = pattern_index
	state["tick_accum"] = _tick_accum


func read_state(state: Dictionary) -> void:
	if state.has("pattern_index"):
		pattern_index = int(state["pattern_index"])
	if state.has("tick_accum"):
		_tick_accum = int(state["tick_accum"])
