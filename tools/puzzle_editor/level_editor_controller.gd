class_name LevelEditorController
extends RefCounted
## Orchestrates document, history, tools, clipboard, validate, analyze, test/IO.

signal document_changed
signal tool_changed
signal history_changed
signal issues_changed(result: Dictionary)
signal analysis_changed(result: Dictionary)
signal test_mode_changed(active: bool, instant: bool)
signal status_message(text: String)

var document: EditorDocument = null
var history: EditorHistory = null
var clipboard: EditorClipboard = null
var validator: EditorValidator = null
var analyzer: EditorDifficultyAnalyzer = null
var test_session: EditorTestSession = null

var tools: Dictionary = {} ## EditorTool.Id -> EditorTool
var active_tool: EditorTool = null
var paint_occupant: StringName = &"A"
var paint_puzzle_def: StringName = &""
var paint_floor_def: StringName = &""
var paint_mode: StringName = &"color"
var last_issues: Dictionary = {}
var last_analysis: Dictionary = {}
var preview_cells: Array[Vector2i] = []
var _stroke_active: bool = false
var _stroke_start: Vector2i = Vector2i.ZERO


func setup(doc: EditorDocument = null) -> void:
	document = doc if doc else _default_document()
	if String(document.puzzle_id).is_empty():
		document.ensure_id()
	history = EditorHistory.new()
	history.setup()
	clipboard = EditorClipboard.new()
	validator = EditorValidator.new()
	analyzer = EditorDifficultyAnalyzer.new()
	test_session = EditorTestSession.new()
	test_session.solved.connect(func() -> void: status_message.emit("Solved!"))
	_register_tools()
	set_tool(EditorTool.Id.BRUSH)
	if not document.changed.is_connected(_on_doc_changed):
		document.changed.connect(_on_doc_changed)
	if not history.changed.is_connected(_on_history_changed):
		history.changed.connect(_on_history_changed)


func _default_document() -> EditorDocument:
	## Seed a tiny solvable draft so Validate/Analyze work immediately.
	var path := "res://resources/puzzles/workshop/example_align_3x3.shiftr.json"
	if FileAccess.file_exists(path):
		var result := WorkshopIO.load_from_file(path)
		if result.get("ok", false):
			var loaded: EditorDocument = result["document"]
			loaded.dirty = false
			return loaded
	var d := EditorDocument.new(4, 4)
	var goal := PackedStringArray()
	var start := PackedStringArray()
	for i in 16:
		goal.append("A" if i < 8 else "B")
		start.append("A" if i < 8 else "B")
	## One column shift from goal for a trivial start.
	start[0] = "B"
	start[12] = "A"
	d.fill_occupants(EditorDocument.Layer.GOAL, goal, false)
	d.fill_occupants(EditorDocument.Layer.START, start, false)
	d.title = "Untitled"
	return d


func _register_tools() -> void:
	tools[EditorTool.Id.BRUSH] = BrushTool.new()
	tools[EditorTool.Id.ERASE] = EraseTool.new()
	tools[EditorTool.Id.FILL] = FillTool.new()
	tools[EditorTool.Id.LINE] = LineTool.new()
	tools[EditorTool.Id.RECT] = RectTool.new()
	tools[EditorTool.Id.SELECT] = SelectTool.new()


func set_tool(id: int) -> void:
	active_tool = tools.get(id) as EditorTool
	_sync_tool_paint()
	preview_cells.clear()
	tool_changed.emit()


func set_paint_color(occupant: StringName) -> void:
	paint_occupant = occupant
	paint_mode = &"color"
	_sync_tool_paint()


func set_paint_object(def_id: StringName) -> void:
	paint_puzzle_def = def_id
	paint_mode = &"object"
	_sync_tool_paint()


func set_paint_floor(def_id: StringName) -> void:
	paint_floor_def = def_id
	paint_mode = &"floor"
	_sync_tool_paint()


func set_layer(layer: int) -> void:
	document.set_active_layer(layer)


func _sync_tool_paint() -> void:
	if active_tool == null:
		return
	active_tool.paint_occupant = paint_occupant
	active_tool.paint_puzzle_def = paint_puzzle_def
	active_tool.paint_floor_def = paint_floor_def
	if active_tool.tool_id != EditorTool.Id.ERASE:
		active_tool.paint_mode = paint_mode
	else:
		active_tool.paint_mode = paint_mode if paint_mode == &"floor" or paint_mode == &"object" else &"erase"


func begin_pointer(cell: Vector2i, shift_held: bool = false) -> void:
	if test_session.active or active_tool == null:
		return
	if active_tool is RectTool:
		(active_tool as RectTool).filled = shift_held
	_stroke_active = true
	_stroke_start = cell
	active_tool.begin_stroke(document, cell)
	_update_preview(cell)


func drag_pointer(cell: Vector2i) -> void:
	if not _stroke_active or active_tool == null or test_session.active:
		return
	active_tool.drag_to(document, cell)
	_update_preview(cell)


func end_pointer(cell: Vector2i) -> void:
	if not _stroke_active or active_tool == null:
		return
	_stroke_active = false
	preview_cells.clear()
	var cmd := active_tool.end_stroke(document, cell)
	if cmd != null:
		history.push(cmd, document)
	document_changed.emit()


func undo() -> void:
	if test_session.active:
		test_session.undo()
		document_changed.emit()
		return
	if history.undo(document):
		status_message.emit("Undo")


func redo() -> void:
	if test_session.active:
		test_session.redo()
		document_changed.emit()
		return
	if history.redo(document):
		status_message.emit("Redo")


func copy_selection() -> void:
	if clipboard.copy_from_document(document):
		status_message.emit("Copied %dx%d" % [clipboard.width, clipboard.height])
	else:
		status_message.emit("Nothing selected")


func paste_selection(origin: Vector2i = Vector2i(-1, -1)) -> void:
	if clipboard.is_empty():
		status_message.emit("Clipboard empty")
		return
	var at := origin
	if at.x < 0:
		at = document.selection.position if document.has_selection() else Vector2i.ZERO
	var cmd := clipboard.build_paste_command(document, at)
	if cmd:
		history.push(cmd, document)
		status_message.emit("Pasted")
	else:
		status_message.emit("Paste had no effect")


func resize_board(w: int, h: int) -> void:
	var cmd := ResizeCommand.capture(document, w, h)
	if cmd.old_w == cmd.new_w and cmd.old_h == cmd.new_h:
		return
	history.push(cmd, document)


func apply_meta(updates: Dictionary) -> void:
	var cmd := MetaCommand.capture(document, updates)
	history.push(cmd, document)


func run_validation() -> Dictionary:
	last_issues = validator.validate_detailed(document)
	issues_changed.emit(last_issues)
	var n := int(last_issues.get("errors", 0))
	var w := int(last_issues.get("warnings", 0))
	status_message.emit("Validation: %d error(s), %d warning(s)" % [n, w])
	return last_issues


func run_analysis() -> Dictionary:
	## Sync path for tests / CI. Prefer `run_analysis_async` from UI.
	last_analysis = analyzer.analyze(document)
	analysis_changed.emit(last_analysis)
	_emit_analysis_status(last_analysis)
	return last_analysis


func run_analysis_async() -> void:
	## Off-thread BFS so the editor viewport stays responsive.
	status_message.emit("Analyzing…")
	await analyzer.analyze_async(document, func(result: Dictionary) -> void:
		last_analysis = result
		analysis_changed.emit(last_analysis)
		_emit_analysis_status(last_analysis)
	)


func _emit_analysis_status(result: Dictionary) -> void:
	if result.get("ok", false):
		status_message.emit(
			"Difficulty %.1f · optimal %s" % [
				float(result.get("score", 0.0)),
				str(result.get("optimal_moves", -1)),
			]
		)
	else:
		status_message.emit("Analysis failed: %s" % str(result.get("error", "?")))


func enter_test(instant: bool = false) -> bool:
	if not test_session.start(document, true):
		status_message.emit("Cannot test — malformed document")
		return false
	test_session.instant_play = instant
	test_mode_changed.emit(true, instant)
	status_message.emit("Instant play" if instant else "Test mode")
	document_changed.emit()
	return true


func exit_test() -> void:
	if not test_session.active:
		return
	test_session.stop()
	test_mode_changed.emit(false, false)
	status_message.emit("Back to edit")
	document_changed.emit()


func toggle_test() -> void:
	if test_session.active:
		exit_test()
	else:
		enter_test(false)


func export_json() -> String:
	return WorkshopIO.export_json(document)


func import_json(text: String) -> bool:
	var result := WorkshopIO.import_json(text)
	if not result.get("ok", false):
		status_message.emit("Import failed: %s" % str(result.get("error", "?")))
		return false
	var doc: EditorDocument = result["document"]
	_replace_document(doc)
	history.clear()
	status_message.emit("Imported")
	return true


func save_file(path: String) -> bool:
	var err := WorkshopIO.save_to_file(document, path)
	if err != OK:
		status_message.emit("Save failed (%d)" % err)
		return false
	status_message.emit("Saved %s" % path.get_file())
	return true


func load_file(path: String) -> bool:
	var result := WorkshopIO.load_from_file(path)
	if not result.get("ok", false):
		status_message.emit("Load failed: %s" % str(result.get("error", "?")))
		return false
	_replace_document(result["document"])
	history.clear()
	status_message.emit("Loaded %s" % path.get_file())
	return true


func new_document(w: int = 4, h: int = 4) -> void:
	_replace_document(EditorDocument.new(w, h))
	history.clear()
	status_message.emit("New %dx%d" % [w, h])


func _replace_document(doc: EditorDocument) -> void:
	if document and document.changed.is_connected(_on_doc_changed):
		document.changed.disconnect(_on_doc_changed)
	document = doc
	document.changed.connect(_on_doc_changed)
	document_changed.emit()


func _update_preview(cell: Vector2i) -> void:
	if active_tool == null:
		return
	preview_cells = active_tool.preview_cells(document, _stroke_start, cell)
	document_changed.emit()


func _on_doc_changed() -> void:
	document_changed.emit()


func _on_history_changed() -> void:
	history_changed.emit()
