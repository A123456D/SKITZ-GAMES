class_name HistoryEntry
extends RefCounted
## Compact undo record: forward command + optional delta for non-self-inverse ops.

var command: BoardCommand = null
## For SET_TILE: tile that was replaced (full BoardTileData dict).
var previous_tile: BoardTileData = null
## Axis-lock cycle rewrite: full previous line tiles for one undoable unit.
var previous_tiles: Array = []
## Matching post-cycle tiles for redo.
var redo_tiles: Array = []
## {movable, k, is_row} for connection remap undo/redo.
var cycle_meta: Dictionary = {}


func to_dict() -> Dictionary:
	var prevs: Array = []
	for t in previous_tiles:
		if t is BoardTileData:
			prevs.append((t as BoardTileData).to_dict())
	var redos: Array = []
	for t2 in redo_tiles:
		if t2 is BoardTileData:
			redos.append((t2 as BoardTileData).to_dict())
	return {
		"command": command.to_dict() if command else null,
		"previous_tile": previous_tile.to_dict() if previous_tile else null,
		"previous_tiles": prevs,
		"redo_tiles": redos,
		"cycle_meta": cycle_meta.duplicate(true),
	}


static func from_dict(data: Dictionary) -> HistoryEntry:
	var e := HistoryEntry.new()
	var cmd_data: Variant = data.get("command", null)
	if cmd_data is Dictionary:
		e.command = BoardCommand.from_dict(cmd_data)
	var prev: Variant = data.get("previous_tile", null)
	if prev is Dictionary:
		e.previous_tile = BoardTileData.from_dict(prev)
	var prevs: Variant = data.get("previous_tiles", [])
	if prevs is Array:
		for p in prevs:
			if p is Dictionary:
				e.previous_tiles.append(BoardTileData.from_dict(p))
	var redos: Variant = data.get("redo_tiles", [])
	if redos is Array:
		for r in redos:
			if r is Dictionary:
				e.redo_tiles.append(BoardTileData.from_dict(r))
	var meta: Variant = data.get("cycle_meta", {})
	if meta is Dictionary:
		e.cycle_meta = (meta as Dictionary).duplicate(true)
	return e
