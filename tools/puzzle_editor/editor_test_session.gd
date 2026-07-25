class_name EditorTestSession
extends RefCounted
## Spins up BoardSession (+ optional PuzzleEngine) from EditorDocument without
## mutating the draft. Exit test discards the runtime session.

signal events_emitted(events: Array)
signal solved
signal exited

var document: EditorDocument = null
var session: BoardSession = null
var engine: PuzzleEngine = null
var active: bool = false
var instant_play: bool = false
var moves_made: int = 0


func start(doc: EditorDocument, with_puzzle_engine: bool = true) -> bool:
	assert(doc != null)
	stop()
	document = doc
	var puzzle := doc.to_puzzle_def()
	if not puzzle.is_well_formed():
		return false
	session = BoardSession.new()
	puzzle.apply_to_session(session)
	if not session.events_emitted.is_connected(_on_events):
		session.events_emitted.connect(_on_events)
	if with_puzzle_engine:
		engine = PuzzleEngine.new()
		engine.bind_session(session)
		engine.setup_catalog(PuzzleCatalog.build_all())
		_seed_puzzle_objects(doc)
		engine.bootstrap_from_board()
	active = true
	moves_made = 0
	return true


func stop() -> void:
	if session and session.events_emitted.is_connected(_on_events):
		session.events_emitted.disconnect(_on_events)
	session = null
	engine = null
	active = false
	instant_play = false
	exited.emit()


func shift_row(row: int, dir: int, steps: int = 1) -> bool:
	if not active or session == null:
		return false
	var ok := false
	if engine:
		ok = engine.shift_row(row, dir, steps).success
	else:
		ok = session.shift_row(row, dir, steps).success
	if ok:
		moves_made += 1
		_check_solved()
	return ok


func shift_column(column: int, dir: int, steps: int = 1) -> bool:
	if not active or session == null:
		return false
	var ok := false
	if engine:
		ok = engine.shift_column(column, dir, steps).success
	else:
		ok = session.shift_column(column, dir, steps).success
	if ok:
		moves_made += 1
		_check_solved()
	return ok


func undo() -> bool:
	if not active or session == null:
		return false
	return session.undo().success


func redo() -> bool:
	if not active or session == null:
		return false
	return session.redo().success


func is_solved() -> bool:
	if document == null or session == null:
		return false
	return document.to_puzzle_def().is_solved_state(session.get_state())


func _check_solved() -> void:
	if is_solved():
		solved.emit()


func _seed_puzzle_objects(doc: EditorDocument) -> void:
	if engine == null:
		return
	for y in doc.height:
		for x in doc.width:
			var cell := doc.get_cell(x, y, EditorDocument.Layer.START)
			if not cell.floor_puzzle.is_empty():
				var fdef := StringName(str(cell.floor_puzzle.get("def", "")))
				if fdef != &"":
					engine.place(Vector2i(x, y), fdef, true)
			if not cell.puzzle.is_empty():
				var def := StringName(str(cell.puzzle.get("def", "")))
				if def != &"" and not EditorTool._is_align_color(def):
					engine.place(Vector2i(x, y), def, false)


func _on_events(events: Array) -> void:
	events_emitted.emit(events)
