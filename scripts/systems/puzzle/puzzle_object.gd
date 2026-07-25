class_name PuzzleObject
extends RefCounted
## Runtime instance: def + components + cell. Behavior is 100% from components.

var uid: StringName = &""
var def_id: StringName = &""
var def: PuzzleObjectDef = null
var cell: Vector2i = Vector2i.ZERO
var tags: PackedStringArray = PackedStringArray()
var components: Array[PuzzleComponent] = []
## Per-component runtime state keyed by component_id string.
var state: Dictionary = {}


func attach_def(p_def: PuzzleObjectDef, p_uid: StringName, p_cell: Vector2i, p_state: Dictionary = {}) -> void:
	assert(p_def != null)
	def = p_def
	def_id = p_def.id
	uid = p_uid
	cell = p_cell
	tags = p_def.tags.duplicate()
	state = p_state.duplicate(true)
	components.clear()
	for spec in p_def.components:
		if spec == null:
			continue
		var c := PuzzleRegistry.create_from_spec(spec)
		if c == null:
			continue
		c.owner_object = self
		var key := String(c.component_id)
		if state.has(key) and state[key] is Dictionary:
			c.read_state(state[key])
		components.append(c)


func get_component(component_id: StringName) -> PuzzleComponent:
	for c in components:
		if c.component_id == component_id:
			return c
	return null


func has_component(component_id: StringName) -> bool:
	return get_component(component_id) != null


func has_tag(tag: String) -> bool:
	return tags.has(tag)


func query(ctx: PuzzleContext, query_id: StringName, args: Dictionary = {}) -> Variant:
	for c in components:
		var r: Variant = c.on_query(ctx, query_id, args)
		if r != null:
			return r
	return null


func sync_state_from_components() -> void:
	for c in components:
		var bucket: Dictionary = {}
		c.write_state(bucket)
		if not bucket.is_empty():
			state[String(c.component_id)] = bucket


func write_to_tile(tile: BoardTileData) -> void:
	sync_state_from_components()
	PuzzleTile.place(tile, def_id, uid, state)


func call_setup(ctx: PuzzleContext) -> void:
	for c in components:
		c.on_setup(ctx)


func call_shift(ctx: PuzzleContext, board_result: SimResult) -> void:
	for c in components:
		c.on_shift(ctx, board_result)


func call_enter(ctx: PuzzleContext, other: PuzzleObject) -> void:
	for c in components:
		c.on_enter(ctx, other)


func call_exit(ctx: PuzzleContext, other: PuzzleObject) -> void:
	for c in components:
		c.on_exit(ctx, other)


func call_tick(ctx: PuzzleContext, tick_index: int, dt_ms: int) -> void:
	for c in components:
		c.on_tick(ctx, tick_index, dt_ms)
