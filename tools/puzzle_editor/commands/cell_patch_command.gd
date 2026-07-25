class_name CellPatchCommand
extends EditorCommand
## Applies a sparse set of cell replacements on one layer. Inverse = restore before.

var layer: int = EditorDocument.Layer.START
## Array of {x, y, before: Dictionary, after: Dictionary}
var patches: Array = []


func _init(p_label: StringName = &"paint") -> void:
	label = p_label


static func make(
	p_layer: int,
	coords: Array[Vector2i],
	before_cells: Array[EditorCell],
	after_cells: Array[EditorCell],
	p_label: StringName = &"paint"
) -> CellPatchCommand:
	var cmd := CellPatchCommand.new(p_label)
	cmd.layer = p_layer
	assert(coords.size() == before_cells.size() and coords.size() == after_cells.size())
	for i in coords.size():
		if before_cells[i].content_equals(after_cells[i]):
			continue
		cmd.patches.append({
			"x": coords[i].x,
			"y": coords[i].y,
			"before": before_cells[i].to_dict(),
			"after": after_cells[i].to_dict(),
		})
	return cmd


func is_empty() -> bool:
	return patches.is_empty()


func execute(doc: EditorDocument) -> void:
	_apply(doc, false)


func undo(doc: EditorDocument) -> void:
	_apply(doc, true)


func _apply(doc: EditorDocument, reverse: bool) -> void:
	for p in patches:
		var x := int(p["x"])
		var y := int(p["y"])
		var data: Dictionary = p["before"] if reverse else p["after"]
		doc.set_cell(x, y, EditorCell.from_dict(data), layer, false)
	doc.dirty = true
	doc.changed.emit()
