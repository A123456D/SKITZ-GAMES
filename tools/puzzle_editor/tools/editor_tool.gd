class_name EditorTool
extends RefCounted
## Strategy base for paint / select interactions.

enum Id {
	BRUSH = 0,
	ERASE = 1,
	FILL = 2,
	LINE = 3,
	RECT = 4,
	SELECT = 5,
}

var tool_id: int = Id.BRUSH
var display_name: String = "Tool"

## Set by controller each frame / stroke.
var paint_occupant: StringName = &"A"
var paint_puzzle_def: StringName = &""
var paint_floor_def: StringName = &""
var paint_mode: StringName = &"color" ## color | object | floor | erase_all


func begin_stroke(_doc: EditorDocument, _cell: Vector2i) -> void:
	pass


func drag_to(_doc: EditorDocument, _cell: Vector2i) -> void:
	pass


## Returns a command to push, or null if no-op.
func end_stroke(_doc: EditorDocument, _cell: Vector2i) -> EditorCommand:
	return null


func preview_cells(_doc: EditorDocument, _from: Vector2i, _to: Vector2i) -> Array[Vector2i]:
	return []


func make_painted_cell(base: EditorCell) -> EditorCell:
	var c := base.duplicate_cell()
	match String(paint_mode):
		"erase_all":
			return EditorCell.new()
		"color":
			c.occupant_id = paint_occupant
			if String(paint_occupant).is_empty():
				c.occupant_id = BoardEnums.EMPTY_OCCUPANT
		"object":
			if String(paint_puzzle_def).is_empty():
				c.puzzle = {}
				if not _is_align_color(c.occupant_id):
					c.occupant_id = BoardEnums.EMPTY_OCCUPANT
			else:
				var uid := StringName("e_%s_%d" % [String(paint_puzzle_def), Time.get_ticks_usec()])
				c.puzzle = PuzzleTile.make_blob(paint_puzzle_def, uid)
				c.occupant_id = paint_puzzle_def
		"floor":
			if String(paint_floor_def).is_empty():
				c.floor_puzzle = {}
			else:
				var uid2 := StringName("f_%s_%d" % [String(paint_floor_def), Time.get_ticks_usec()])
				c.floor_puzzle = PuzzleTile.make_blob(paint_floor_def, uid2)
		"erase":
			c.occupant_id = BoardEnums.EMPTY_OCCUPANT
			c.puzzle = {}
			## Keep floor unless erase_all.
	return c


func make_erased_cell(base: EditorCell) -> EditorCell:
	var c := base.duplicate_cell()
	match String(paint_mode):
		"floor":
			c.floor_puzzle = {}
		"object":
			c.puzzle = {}
			if not _is_align_color(c.occupant_id):
				c.occupant_id = BoardEnums.EMPTY_OCCUPANT
		_:
			c.occupant_id = BoardEnums.EMPTY_OCCUPANT
			c.puzzle = {}
	return c


static func _is_align_color(id: StringName) -> bool:
	var s := String(id)
	return s in ["A", "B", "C", "D", "E", "F"]


static func build_patch(
	doc: EditorDocument,
	coords: Array[Vector2i],
	painter: Callable,
	label: StringName
) -> CellPatchCommand:
	var before_cells: Array[EditorCell] = []
	var after_cells: Array[EditorCell] = []
	var unique: Dictionary = {}
	var ordered: Array[Vector2i] = []
	for p in coords:
		var key := "%d,%d" % [p.x, p.y]
		if unique.has(key) or not doc.in_bounds(p.x, p.y):
			continue
		unique[key] = true
		ordered.append(p)
	for p in ordered:
		var base := doc.get_cell(p.x, p.y)
		before_cells.append(base.duplicate_cell())
		after_cells.append(painter.call(base) as EditorCell)
	var cmd := CellPatchCommand.make(doc.active_layer, ordered, before_cells, after_cells, label)
	return null if cmd.is_empty() else cmd
