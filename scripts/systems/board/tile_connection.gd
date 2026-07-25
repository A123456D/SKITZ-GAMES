class_name TileConnection
extends RefCounted
## Directed (optionally bidirectional) link between tiles.
## Mechanics (bonds, portals, signals) read `kind` + `meta` — core board never switches on kind.

var kind: StringName = &"link"
var to_x: int = 0
var to_y: int = 0
var bidirectional: bool = false
var meta: Dictionary = {}


func duplicate_connection() -> TileConnection:
	var c := TileConnection.new()
	c.kind = kind
	c.to_x = to_x
	c.to_y = to_y
	c.bidirectional = bidirectional
	c.meta = meta.duplicate(true)
	return c


func to_dict() -> Dictionary:
	return {
		"kind": String(kind),
		"to_x": to_x,
		"to_y": to_y,
		"bidirectional": bidirectional,
		"meta": meta.duplicate(true),
	}


static func from_dict(data: Dictionary) -> TileConnection:
	var c := TileConnection.new()
	c.kind = StringName(str(data.get("kind", "link")))
	c.to_x = int(data.get("to_x", 0))
	c.to_y = int(data.get("to_y", 0))
	c.bidirectional = bool(data.get("bidirectional", false))
	var m: Variant = data.get("meta", {})
	c.meta = m.duplicate(true) if m is Dictionary else {}
	return c


func equals(other: TileConnection) -> bool:
	if other == null:
		return false
	return (
		kind == other.kind
		and to_x == other.to_x
		and to_y == other.to_y
		and bidirectional == other.bidirectional
		and meta == other.meta
	)
