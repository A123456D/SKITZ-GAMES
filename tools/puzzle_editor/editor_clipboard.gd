class_name EditorClipboard
extends RefCounted
## In-memory selection clipboard + optional JSON snippet for paste/share.

var width: int = 0
var height: int = 0
var cells: Array[EditorCell] = []
var json_snippet: String = ""


func clear() -> void:
	width = 0
	height = 0
	cells.clear()
	json_snippet = ""


func is_empty() -> bool:
	return cells.is_empty() or width <= 0 or height <= 0


func copy_from_document(doc: EditorDocument) -> bool:
	if doc == null or not doc.has_selection():
		return false
	var rect := doc.selection
	width = rect.size.x
	height = rect.size.y
	cells.clear()
	for y in range(rect.position.y, rect.position.y + height):
		for x in range(rect.position.x, rect.position.x + width):
			var c := doc.get_cell(x, y)
			cells.append(c.duplicate_cell() if c else EditorCell.new())
	json_snippet = JSON.stringify(to_dict(), "\t")
	return true


func to_dict() -> Dictionary:
	var arr: Array = []
	for c in cells:
		arr.append(c.to_dict())
	return {
		"format": "shiftr_editor_clipboard",
		"schema_version": 1,
		"width": width,
		"height": height,
		"cells": arr,
	}


func from_dict(data: Dictionary) -> bool:
	if str(data.get("format", "")) != "shiftr_editor_clipboard":
		return false
	width = int(data.get("width", 0))
	height = int(data.get("height", 0))
	cells.clear()
	var arr: Variant = data.get("cells", [])
	if not (arr is Array):
		return false
	for item in arr:
		if item is Dictionary:
			cells.append(EditorCell.from_dict(item))
		else:
			cells.append(EditorCell.new())
	json_snippet = JSON.stringify(to_dict(), "\t")
	return not is_empty()


func from_json(text: String) -> bool:
	var parsed: Variant = JSON.parse_string(text)
	if parsed is Dictionary:
		return from_dict(parsed)
	return false


## Paste at origin; returns CellPatchCommand or null if nothing changes.
func build_paste_command(doc: EditorDocument, origin: Vector2i) -> CellPatchCommand:
	if is_empty() or doc == null:
		return null
	var coords: Array[Vector2i] = []
	var before_cells: Array[EditorCell] = []
	var after_cells: Array[EditorCell] = []
	var i := 0
	for y in height:
		for x in width:
			var tx := origin.x + x
			var ty := origin.y + y
			if doc.in_bounds(tx, ty):
				coords.append(Vector2i(tx, ty))
				before_cells.append(doc.get_cell(tx, ty).duplicate_cell())
				after_cells.append(cells[i].duplicate_cell())
			i += 1
	if coords.is_empty():
		return null
	var cmd := CellPatchCommand.make(
		doc.active_layer, coords, before_cells, after_cells, &"paste"
	)
	return null if cmd.is_empty() else cmd
