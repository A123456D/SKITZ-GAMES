class_name PuzzleWorld
extends RefCounted
## Spatial index of PuzzleObjects derived from BoardState puzzle payloads.
## Occupants: payload["pz"]. Floors (ice/plate/fire/gravity): payload["pz_floor"].

var objects_by_uid: Dictionary = {} ## StringName â†’ PuzzleObject
var cell_index: Dictionary = {} ## Vector2i â†’ occupant uid
var floor_index: Dictionary = {} ## Vector2i â†’ floor uid
var catalog: Dictionary = {} ## StringName â†’ PuzzleObjectDef
var channels: PuzzleChannelBus = PuzzleChannelBus.new()
var _uid_counter: int = 1


func setup_catalog(defs: Array) -> void:
	catalog.clear()
	for d in defs:
		if d is PuzzleObjectDef and d.id != &"":
			catalog[d.id] = d


func register_def(def: PuzzleObjectDef) -> void:
	if def and def.id != &"":
		catalog[def.id] = def


func next_uid(prefix: String = "pz") -> StringName:
	var id := StringName("%s_%d" % [prefix, _uid_counter])
	_uid_counter += 1
	return id


func clear() -> void:
	objects_by_uid.clear()
	cell_index.clear()
	floor_index.clear()


func get_at(cell: Vector2i) -> PuzzleObject:
	var uid: Variant = cell_index.get(cell, &"")
	if uid == null or String(uid).is_empty():
		return null
	return objects_by_uid.get(uid, null)


func get_floor_at(cell: Vector2i) -> PuzzleObject:
	var uid: Variant = floor_index.get(cell, &"")
	if uid == null or String(uid).is_empty():
		return null
	return objects_by_uid.get(uid, null)


func get_by_uid(uid: StringName) -> PuzzleObject:
	return objects_by_uid.get(uid, null)


func objects_with(component_id: StringName) -> Array[PuzzleObject]:
	var out: Array[PuzzleObject] = []
	for uid in objects_by_uid.keys():
		var obj: PuzzleObject = objects_by_uid[uid]
		if obj and obj.has_component(component_id):
			out.append(obj)
	out.sort_custom(func(a: PuzzleObject, b: PuzzleObject) -> bool: return String(a.uid) < String(b.uid))
	return out


func all_objects() -> Array[PuzzleObject]:
	var out: Array[PuzzleObject] = []
	for uid in objects_by_uid.keys():
		out.append(objects_by_uid[uid])
	out.sort_custom(func(a: PuzzleObject, b: PuzzleObject) -> bool: return String(a.uid) < String(b.uid))
	return out


func rebuild_from_board(board: BoardState) -> void:
	assert(board != null)
	clear()
	for y in board.height:
		for x in board.width:
			var tile := board.get_tile(x, y)
			if PuzzleTile.has_floor(tile):
				_ingest_blob(tile, true)
			if PuzzleTile.has_puzzle(tile):
				_ingest_blob(tile, false)
			elif catalog.has(tile.occupant_id) and not tile.is_empty():
				var uid := next_uid(String(tile.occupant_id))
				PuzzleTile.place(tile, tile.occupant_id, uid, {})
				_ingest_blob(tile, false)


func _ingest_blob(tile: BoardTileData, is_floor: bool) -> void:
	var def_id: StringName
	var uid: StringName
	var state: Dictionary
	if is_floor:
		def_id = PuzzleTile.get_floor_def_id(tile)
		uid = PuzzleTile.get_floor_uid(tile)
		state = PuzzleTile.get_floor_state(tile)
	else:
		def_id = PuzzleTile.get_def_id(tile)
		uid = PuzzleTile.get_uid(tile)
		state = PuzzleTile.get_state(tile)
	if String(uid).is_empty():
		uid = next_uid(String(def_id))
		if is_floor:
			var fblob := PuzzleTile.get_floor_blob(tile)
			fblob["uid"] = String(uid)
			PuzzleTile.set_floor_blob(tile, fblob)
		else:
			var blob := PuzzleTile.get_blob(tile)
			blob["uid"] = String(uid)
			PuzzleTile.set_blob(tile, blob)
	var def: PuzzleObjectDef = catalog.get(def_id, null)
	if def == null:
		push_warning("PuzzleWorld: missing def '%s'" % String(def_id))
		return
	var obj := PuzzleObject.new()
	obj.attach_def(def, uid, Vector2i(tile.x, tile.y), state)
	objects_by_uid[uid] = obj
	if is_floor:
		floor_index[obj.cell] = uid
	else:
		cell_index[obj.cell] = uid
	_bump_counter(uid)


func _bump_counter(uid: StringName) -> void:
	var parts := String(uid).split("_")
	if parts.size() >= 2 and parts[parts.size() - 1].is_valid_int():
		_uid_counter = maxi(_uid_counter, int(parts[parts.size() - 1]) + 1)


func flush_to_board(board: BoardState) -> void:
	assert(board != null)
	for obj in all_objects():
		if not board.in_bounds(obj.cell.x, obj.cell.y):
			continue
		var tile := board.get_tile(obj.cell.x, obj.cell.y)
		obj.sync_state_from_components()
		var is_floor: bool = floor_index.get(obj.cell, &"") == obj.uid
		if is_floor:
			PuzzleTile.place_floor(tile, obj.def_id, obj.uid, obj.state)
		else:
			obj.write_to_tile(tile)


func place_new(board: BoardState, cell: Vector2i, def_id: StringName, uid: StringName = &"", as_floor: bool = false) -> PuzzleObject:
	assert(board.in_bounds(cell.x, cell.y))
	var def: PuzzleObjectDef = catalog.get(def_id, null)
	assert(def != null)
	if String(uid).is_empty():
		uid = next_uid(String(def_id))
	var tile := board.get_tile(cell.x, cell.y)
	if as_floor:
		PuzzleTile.place_floor(tile, def_id, uid, {})
	else:
		PuzzleTile.place(tile, def_id, uid, {})
	var obj := PuzzleObject.new()
	obj.attach_def(def, uid, cell, {})
	objects_by_uid[uid] = obj
	if as_floor:
		floor_index[cell] = uid
	else:
		cell_index[cell] = uid
	return obj


func remove_uid(board: BoardState, uid: StringName) -> void:
	var obj: PuzzleObject = objects_by_uid.get(uid, null)
	if obj == null:
		return
	if board.in_bounds(obj.cell.x, obj.cell.y):
		var tile := board.get_tile(obj.cell.x, obj.cell.y)
		if PuzzleTile.get_uid(tile) == uid:
			PuzzleTile.remove_object(tile)
		if PuzzleTile.get_floor_uid(tile) == uid:
			PuzzleTile.remove_floor(tile)
	if cell_index.get(obj.cell, &"") == uid:
		cell_index.erase(obj.cell)
	if floor_index.get(obj.cell, &"") == uid:
		floor_index.erase(obj.cell)
	objects_by_uid.erase(uid)


func move_uid(board: BoardState, uid: StringName, to_cell: Vector2i) -> bool:
	var obj: PuzzleObject = objects_by_uid.get(uid, null)
	if obj == null:
		return false
	if floor_index.get(obj.cell, &"") == uid:
		return false ## floors don't move with ice/gravity
	if not board.in_bounds(to_cell.x, to_cell.y):
		return false
	if cell_index.has(to_cell) and cell_index[to_cell] != uid:
		return false
	var from := obj.cell
	if from == to_cell:
		return true
	var from_tile := board.get_tile(from.x, from.y)
	var to_tile := board.get_tile(to_cell.x, to_cell.y)
	obj.sync_state_from_components()
	var blob := PuzzleTile.make_blob(obj.def_id, obj.uid, obj.state)
	PuzzleTile.remove_object(from_tile)
	to_tile.occupant_id = obj.def_id
	PuzzleTile.set_blob(to_tile, blob)
	cell_index.erase(from)
	obj.cell = to_cell
	cell_index[to_cell] = uid
	return true
