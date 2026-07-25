class_name TileMove
extends RefCounted
## One tile's coordinate change for presentation (from → to). Pure data — no timing.

var from_x: int = 0
var from_y: int = 0
var to_x: int = 0
var to_y: int = 0
var occupant_id: StringName = BoardEnums.EMPTY_OCCUPANT
## True when the slide wrapped across the board edge (view may split trail).
var wrapped: bool = false
## Stable identity for this cell's content during the move (flat index before apply).
var source_index: int = -1


func to_dict() -> Dictionary:
	return {
		"from_x": from_x,
		"from_y": from_y,
		"to_x": to_x,
		"to_y": to_y,
		"occupant_id": String(occupant_id),
		"wrapped": wrapped,
		"source_index": source_index,
	}


static func from_dict(data: Dictionary) -> TileMove:
	var m := TileMove.new()
	m.from_x = int(data.get("from_x", 0))
	m.from_y = int(data.get("from_y", 0))
	m.to_x = int(data.get("to_x", 0))
	m.to_y = int(data.get("to_y", 0))
	m.occupant_id = StringName(str(data.get("occupant_id", "")))
	m.wrapped = bool(data.get("wrapped", false))
	m.source_index = int(data.get("source_index", -1))
	return m


static func make(
	from_x: int,
	from_y: int,
	to_x: int,
	to_y: int,
	occupant_id: StringName,
	wrapped: bool,
	source_index: int
) -> TileMove:
	var m := TileMove.new()
	m.from_x = from_x
	m.from_y = from_y
	m.to_x = to_x
	m.to_y = to_y
	m.occupant_id = occupant_id
	m.wrapped = wrapped
	m.source_index = source_index
	return m
