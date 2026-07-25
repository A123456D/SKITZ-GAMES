class_name PuzzleContext
extends RefCounted
## Read/write facade passed into components & systems. Deterministic; no Time.*.

var world: PuzzleWorld = null
var board: BoardState = null
var channels: PuzzleChannelBus = null
var catalog: Dictionary = {} ## def_id StringName → PuzzleObjectDef
var tick_index: int = 0
var dt_ms: int = PuzzleEnums.DEFAULT_TICK_MS
var events: Array[PuzzleEvent] = []
## Mutation requests collected this pass (applied by RulePipe / engine).
var move_requests: Array[Dictionary] = []
var destroy_requests: Array[StringName] = []
var spawn_requests: Array[Dictionary] = []
var mutated: bool = false


func emit(event: PuzzleEvent) -> void:
	if event:
		events.append(event)


func request_move(uid: StringName, to_cell: Vector2i, reason: StringName = &"") -> void:
	move_requests.append({
		"uid": uid,
		"to": to_cell,
		"reason": reason,
	})


func request_destroy(uid: StringName) -> void:
	if not destroy_requests.has(uid):
		destroy_requests.append(uid)


func request_spawn(def_id: StringName, cell: Vector2i, as_floor: bool = false, state: Dictionary = {}) -> void:
	spawn_requests.append({
		"def_id": def_id,
		"cell": cell,
		"as_floor": as_floor,
		"state": state.duplicate(true),
	})


func get_object_at(cell: Vector2i) -> PuzzleObject:
	return world.get_at(cell) if world else null


func get_object(uid: StringName) -> PuzzleObject:
	return world.get_by_uid(uid) if world else null


func get_def(def_id: StringName) -> PuzzleObjectDef:
	return catalog.get(def_id, null)


func in_bounds(cell: Vector2i) -> bool:
	return board != null and board.in_bounds(cell.x, cell.y)


func is_blocking(cell: Vector2i, mover: PuzzleObject = null) -> bool:
	if not in_bounds(cell):
		return true
	var obj := get_object_at(cell)
	if obj == null:
		return false
	var args := {"mover": mover, "cell": cell}
	var q: Variant = obj.query(self, &"blocks_movement", args)
	if q == null:
		return false
	return bool(q)


func objects_with(component_id: StringName) -> Array[PuzzleObject]:
	return world.objects_with(component_id) if world else []


func clear_pass_buffers() -> void:
	move_requests.clear()
	destroy_requests.clear()
	spawn_requests.clear()


func begin_pass() -> void:
	clear_pass_buffers()
	mutated = false
