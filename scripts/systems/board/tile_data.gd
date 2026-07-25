class_name BoardTileData
extends RefCounted
## One cell on the board. Always carries coordinates, occupant, state, modifiers, connections.
## Extensibility: new mechanics add modifier ids / connection kinds / payload keys â€” not subclass trees.

var x: int = 0
var y: int = 0
var occupant_id: StringName = BoardEnums.EMPTY_OCCUPANT
## Bitfield from BoardEnums.TileStateFlags (and mode-reserved CUSTOM_*).
var state: int = BoardEnums.TileStateFlags.NONE
var modifiers: Array[StringName] = []
var connections: Array[TileConnection] = []
## Occupant- or mode-specific payload (must be JSON-friendly for save / MP).
var payload: Dictionary = {}


func duplicate_tile() -> BoardTileData:
	var t := BoardTileData.new()
	t.x = x
	t.y = y
	t.occupant_id = occupant_id
	t.state = state
	t.modifiers = modifiers.duplicate()
	t.connections = []
	for c in connections:
		t.connections.append(c.duplicate_connection())
	t.payload = payload.duplicate(true)
	return t


func has_flag(flag: int) -> bool:
	return (state & flag) != 0


func set_flag(flag: int, enabled: bool = true) -> void:
	if enabled:
		state |= flag
	else:
		state &= ~flag


func is_empty() -> bool:
	return occupant_id == BoardEnums.EMPTY_OCCUPANT or String(occupant_id).is_empty()


func add_modifier(mod_id: StringName) -> void:
	if not modifiers.has(mod_id):
		modifiers.append(mod_id)


func remove_modifier(mod_id: StringName) -> void:
	modifiers.erase(mod_id)


func has_modifier(mod_id: StringName) -> bool:
	return modifiers.has(mod_id)


func add_connection(conn: TileConnection) -> void:
	connections.append(conn)


func clear_connections() -> void:
	connections.clear()


func to_dict() -> Dictionary:
	var conns: Array = []
	for c in connections:
		conns.append(c.to_dict())
	var mods: Array = []
	for m in modifiers:
		mods.append(String(m))
	return {
		"x": x,
		"y": y,
		"occupant_id": String(occupant_id),
		"state": state,
		"modifiers": mods,
		"connections": conns,
		"payload": payload.duplicate(true),
	}


static func from_dict(data: Dictionary) -> BoardTileData:
	var t := BoardTileData.new()
	t.x = int(data.get("x", 0))
	t.y = int(data.get("y", 0))
	t.occupant_id = StringName(str(data.get("occupant_id", "")))
	t.state = int(data.get("state", 0))
	t.modifiers = []
	var mods: Variant = data.get("modifiers", [])
	if mods is Array:
		for m in mods:
			t.modifiers.append(StringName(str(m)))
	t.connections = []
	var conns: Variant = data.get("connections", [])
	if conns is Array:
		for c in conns:
			if c is Dictionary:
				t.connections.append(TileConnection.from_dict(c))
	var p: Variant = data.get("payload", {})
	t.payload = p.duplicate(true) if p is Dictionary else {}
	return t


func content_equals(other: BoardTileData, ignore_coords: bool = false) -> bool:
	if other == null:
		return false
	if not ignore_coords and (x != other.x or y != other.y):
		return false
	if occupant_id != other.occupant_id or state != other.state:
		return false
	if modifiers.size() != other.modifiers.size():
		return false
	for i in modifiers.size():
		if modifiers[i] != other.modifiers[i]:
			return false
	if connections.size() != other.connections.size():
		return false
	for i in connections.size():
		if not connections[i].equals(other.connections[i]):
			return false
	return payload == other.payload
