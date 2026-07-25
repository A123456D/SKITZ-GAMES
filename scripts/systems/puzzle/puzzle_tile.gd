class_name PuzzleTile
extends Object
## Helpers for puzzle blobs on BoardTileData.payload.
## Primary object: payload["pz"]. Optional floor (ice/plate/fire): payload["pz_floor"].

const KEY := PuzzleEnums.PAYLOAD_KEY
const FLOOR_KEY := &"pz_floor"


static func has_puzzle(tile: BoardTileData) -> bool:
	if tile == null:
		return false
	var blob: Variant = tile.payload.get(KEY, null)
	return blob is Dictionary and not str(blob.get("def", "")).is_empty()


static func has_floor(tile: BoardTileData) -> bool:
	if tile == null:
		return false
	var blob: Variant = tile.payload.get(FLOOR_KEY, null)
	return blob is Dictionary and not str(blob.get("def", "")).is_empty()


static func get_blob(tile: BoardTileData) -> Dictionary:
	if tile == null:
		return {}
	var blob: Variant = tile.payload.get(KEY, {})
	return blob.duplicate(true) if blob is Dictionary else {}


static func get_floor_blob(tile: BoardTileData) -> Dictionary:
	if tile == null:
		return {}
	var blob: Variant = tile.payload.get(FLOOR_KEY, {})
	return blob.duplicate(true) if blob is Dictionary else {}


static func set_blob(tile: BoardTileData, blob: Dictionary) -> void:
	assert(tile != null)
	tile.payload[KEY] = blob.duplicate(true)


static func set_floor_blob(tile: BoardTileData, blob: Dictionary) -> void:
	assert(tile != null)
	tile.payload[FLOOR_KEY] = blob.duplicate(true)


static func clear(tile: BoardTileData) -> void:
	if tile == null:
		return
	tile.payload.erase(KEY)


static func clear_floor(tile: BoardTileData) -> void:
	if tile == null:
		return
	tile.payload.erase(FLOOR_KEY)


static func get_def_id(tile: BoardTileData) -> StringName:
	return StringName(str(get_blob(tile).get("def", "")))


static func get_floor_def_id(tile: BoardTileData) -> StringName:
	return StringName(str(get_floor_blob(tile).get("def", "")))


static func get_uid(tile: BoardTileData) -> StringName:
	return StringName(str(get_blob(tile).get("uid", "")))


static func get_floor_uid(tile: BoardTileData) -> StringName:
	return StringName(str(get_floor_blob(tile).get("uid", "")))


static func get_state(tile: BoardTileData) -> Dictionary:
	var st: Variant = get_blob(tile).get("state", {})
	return st.duplicate(true) if st is Dictionary else {}


static func get_floor_state(tile: BoardTileData) -> Dictionary:
	var st: Variant = get_floor_blob(tile).get("state", {})
	return st.duplicate(true) if st is Dictionary else {}


static func make_blob(def_id: StringName, uid: StringName, state: Dictionary = {}) -> Dictionary:
	return {
		"def": String(def_id),
		"uid": String(uid),
		"state": state.duplicate(true),
	}


static func place(tile: BoardTileData, def_id: StringName, uid: StringName, state: Dictionary = {}) -> void:
	assert(tile != null)
	tile.occupant_id = def_id
	set_blob(tile, make_blob(def_id, uid, state))


static func place_floor(tile: BoardTileData, def_id: StringName, uid: StringName, state: Dictionary = {}) -> void:
	assert(tile != null)
	set_floor_blob(tile, make_blob(def_id, uid, state))
	## Floor id also listed as modifier for board-system visibility / tools.
	var mod := StringName("floor:%s" % String(def_id))
	if not tile.has_modifier(mod):
		tile.add_modifier(mod)


static func remove_object(tile: BoardTileData) -> void:
	if tile == null:
		return
	tile.occupant_id = BoardEnums.EMPTY_OCCUPANT
	clear(tile)


static func remove_floor(tile: BoardTileData) -> void:
	if tile == null:
		return
	var def_id := get_floor_def_id(tile)
	clear_floor(tile)
	if def_id != &"":
		tile.remove_modifier(StringName("floor:%s" % String(def_id)))
