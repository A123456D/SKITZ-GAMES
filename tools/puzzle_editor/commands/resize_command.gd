class_name ResizeCommand
extends EditorCommand
## Resize with full layer snapshots for exact undo.

var old_w: int
var old_h: int
var new_w: int
var new_h: int
var old_start: Array = []
var old_goal: Array = []
var new_start: Array = []
var new_goal: Array = []


func _init() -> void:
	label = &"resize"


static func capture(doc: EditorDocument, w: int, h: int) -> ResizeCommand:
	var cmd := ResizeCommand.new()
	cmd.old_w = doc.width
	cmd.old_h = doc.height
	cmd.new_w = clampi(w, EditorDocument.MIN_SIZE, EditorDocument.MAX_SIZE)
	cmd.new_h = clampi(h, EditorDocument.MIN_SIZE, EditorDocument.MAX_SIZE)
	cmd.old_start = doc.snapshot_layer(EditorDocument.Layer.START)
	cmd.old_goal = doc.snapshot_layer(EditorDocument.Layer.GOAL)
	## Preview new layers without mutating history yet.
	var tmp := doc.duplicate_document()
	tmp.resize(cmd.new_w, cmd.new_h, false)
	cmd.new_start = tmp.snapshot_layer(EditorDocument.Layer.START)
	cmd.new_goal = tmp.snapshot_layer(EditorDocument.Layer.GOAL)
	return cmd


func execute(doc: EditorDocument) -> void:
	_apply_size(doc, new_w, new_h, new_start, new_goal)


func undo(doc: EditorDocument) -> void:
	_apply_size(doc, old_w, old_h, old_start, old_goal)


func _apply_size(doc: EditorDocument, w: int, h: int, start_snap: Array, goal_snap: Array) -> void:
	doc.width = w
	doc.height = h
	doc.start_cells = []
	doc.goal_cells = []
	doc.start_cells.resize(start_snap.size())
	doc.goal_cells.resize(goal_snap.size())
	for i in start_snap.size():
		var c: EditorCell = start_snap[i] as EditorCell
		doc.start_cells[i] = c.duplicate_cell() if c else EditorCell.new()
	for i in goal_snap.size():
		var c2: EditorCell = goal_snap[i] as EditorCell
		doc.goal_cells[i] = c2.duplicate_cell() if c2 else EditorCell.new()
	doc.selection = Rect2i()
	doc.dirty = true
	doc.changed.emit()
