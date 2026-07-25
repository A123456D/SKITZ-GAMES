class_name EditorCell
extends RefCounted
## One authored cell. Color occupants (Align) and optional puzzle blobs coexist.

var occupant_id: StringName = BoardEnums.EMPTY_OCCUPANT
var state: int = BoardEnums.TileStateFlags.NONE
var modifiers: Array[StringName] = []
## Occupant puzzle blob {def, uid, state} â€” payload.pz
var puzzle: Dictionary = {}
## Floor puzzle blob â€” payload.pz_floor
var floor_puzzle: Dictionary = {}
var payload_extra: Dictionary = {}


func duplicate_cell() -> EditorCell:
	var c := EditorCell.new()
	c.occupant_id = occupant_id
	c.state = state
	c.modifiers = modifiers.duplicate()
	c.puzzle = puzzle.duplicate(true)
	c.floor_puzzle = floor_puzzle.duplicate(true)
	c.payload_extra = payload_extra.duplicate(true)
	return c


func is_empty() -> bool:
	return (
		(occupant_id == BoardEnums.EMPTY_OCCUPANT or String(occupant_id).is_empty())
		and puzzle.is_empty()
		and floor_puzzle.is_empty()
	)


func content_equals(other: EditorCell) -> bool:
	if other == null:
		return false
	if occupant_id != other.occupant_id or state != other.state:
		return false
	if modifiers.size() != other.modifiers.size():
		return false
	for i in modifiers.size():
		if modifiers[i] != other.modifiers[i]:
			return false
	return puzzle == other.puzzle and floor_puzzle == other.floor_puzzle and payload_extra == other.payload_extra


func to_tile(x: int, y: int) -> BoardTileData:
	var t := BoardTileData.new()
	t.x = x
	t.y = y
	t.occupant_id = occupant_id
	t.state = state
	t.modifiers = modifiers.duplicate()
	t.payload = payload_extra.duplicate(true)
	if not puzzle.is_empty():
		PuzzleTile.set_blob(t, puzzle)
		if str(puzzle.get("def", "")) != "":
			t.occupant_id = StringName(str(puzzle.get("def")))
	if not floor_puzzle.is_empty():
		PuzzleTile.set_floor_blob(t, floor_puzzle)
		var fid := str(floor_puzzle.get("def", ""))
		if fid != "":
			var mod := StringName("floor:%s" % fid)
			if not t.has_modifier(mod):
				t.add_modifier(mod)
	return t


static func from_tile(tile: BoardTileData) -> EditorCell:
	var c := EditorCell.new()
	if tile == null:
		return c
	c.occupant_id = tile.occupant_id
	c.state = tile.state
	c.modifiers = tile.modifiers.duplicate()
	c.puzzle = PuzzleTile.get_blob(tile)
	c.floor_puzzle = PuzzleTile.get_floor_blob(tile)
	c.payload_extra = tile.payload.duplicate(true)
	c.payload_extra.erase(PuzzleTile.KEY)
	c.payload_extra.erase(PuzzleTile.FLOOR_KEY)
	## Strip floor: mods from modifiers list for clean roundtrip â€” re-added on to_tile.
	var cleaned: Array[StringName] = []
	for m in c.modifiers:
		if not String(m).begins_with("floor:"):
			cleaned.append(m)
	c.modifiers = cleaned
	return c


func to_dict() -> Dictionary:
	var mods: Array = []
	for m in modifiers:
		mods.append(String(m))
	return {
		"occupant_id": String(occupant_id),
		"state": state,
		"modifiers": mods,
		"puzzle": puzzle.duplicate(true),
		"floor_puzzle": floor_puzzle.duplicate(true),
		"payload_extra": payload_extra.duplicate(true),
	}


static func from_dict(data: Dictionary) -> EditorCell:
	var c := EditorCell.new()
	c.occupant_id = StringName(str(data.get("occupant_id", "")))
	c.state = int(data.get("state", 0))
	c.modifiers = []
	var mods: Variant = data.get("modifiers", [])
	if mods is Array:
		for m in mods:
			c.modifiers.append(StringName(str(m)))
	var pz: Variant = data.get("puzzle", {})
	c.puzzle = pz.duplicate(true) if pz is Dictionary else {}
	var fl: Variant = data.get("floor_puzzle", {})
	c.floor_puzzle = fl.duplicate(true) if fl is Dictionary else {}
	var ex: Variant = data.get("payload_extra", {})
	c.payload_extra = ex.duplicate(true) if ex is Dictionary else {}
	return c
