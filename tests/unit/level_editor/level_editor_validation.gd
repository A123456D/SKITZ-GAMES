class_name LevelEditorValidation
extends RefCounted
## Headless checks: workshop roundtrip, undo, validation, clipboard.

var _passed: int = 0
var _failed: int = 0
var _errors: PackedStringArray = PackedStringArray()


func run_all() -> int:
	_passed = 0
	_failed = 0
	_errors.clear()
	_test_workshop_roundtrip()
	_test_workshop_example_file()
	_test_undo_redo_paint()
	_test_clipboard_paste()
	_test_validator_start_equals_goal()
	_test_validator_solvable_sample()
	_test_difficulty_analyzer()
	_test_resize_undo()
	_test_test_session_solves()
	print("LevelEditorValidation: %d passed, %d failed" % [_passed, _failed])
	for e in _errors:
		printerr("  FAIL: ", e)
	return _failed


func _ok(name: String) -> void:
	_passed += 1
	print("  PASS ", name)


func _fail(name: String, msg: String) -> void:
	_failed += 1
	_errors.append("%s — %s" % [name, msg])
	printerr("  FAIL ", name, " — ", msg)


func _assert_true(cond: bool, name: String, msg: String) -> void:
	if cond:
		_ok(name)
	else:
		_fail(name, msg)


func _sample_doc() -> EditorDocument:
	var doc := EditorDocument.new(3, 3)
	doc.title = "Half Shift"
	doc.author = "test"
	doc.puzzle_id = &"workshop_half_3"
	doc.difficulty = 1
	doc.fill_occupants(
		EditorDocument.Layer.GOAL,
		PackedStringArray(["A", "A", "A", "A", "A", "A", "B", "B", "B"]),
		false
	)
	doc.fill_occupants(
		EditorDocument.Layer.START,
		PackedStringArray(["A", "A", "A", "B", "A", "A", "B", "B", "A"]),
		false
	)
	return doc


func _test_workshop_roundtrip() -> void:
	var doc := _sample_doc()
	_assert_true(WorkshopIO.roundtrip_ok(doc), "workshop_roundtrip", "export/import mismatch")


func _test_workshop_example_file() -> void:
	var path := "res://resources/puzzles/workshop/example_align_3x3.shiftr.json"
	var result := WorkshopIO.load_from_file(path)
	_assert_true(result.get("ok", false), "example_file_loads", str(result.get("error", "?")))
	if result.get("ok", false):
		var doc: EditorDocument = result["document"]
		_assert_true(doc.width == 3 and doc.height == 3, "example_size", "expected 3x3")
		_assert_true(doc.title == "Half Shift", "example_title", doc.title)


func _test_undo_redo_paint() -> void:
	var ctrl := LevelEditorController.new()
	ctrl.setup(_sample_doc())
	var before := ctrl.document.get_cell(0, 0).occupant_id
	ctrl.set_paint_color(&"C")
	ctrl.set_tool(EditorTool.Id.BRUSH)
	ctrl.begin_pointer(Vector2i(0, 0))
	ctrl.end_pointer(Vector2i(0, 0))
	_assert_true(ctrl.document.get_cell(0, 0).occupant_id == &"C", "brush_applied", "paint failed")
	ctrl.undo()
	_assert_true(ctrl.document.get_cell(0, 0).occupant_id == before, "undo_paint", "undo failed")
	ctrl.redo()
	_assert_true(ctrl.document.get_cell(0, 0).occupant_id == &"C", "redo_paint", "redo failed")


func _test_clipboard_paste() -> void:
	var ctrl := LevelEditorController.new()
	ctrl.setup(_sample_doc())
	ctrl.document.set_selection(Rect2i(0, 0, 2, 1))
	ctrl.copy_selection()
	_assert_true(not ctrl.clipboard.is_empty(), "clipboard_copy", "empty after copy")
	ctrl.set_paint_color(&"")
	ctrl.set_tool(EditorTool.Id.ERASE)
	ctrl.begin_pointer(Vector2i(0, 2))
	ctrl.end_pointer(Vector2i(1, 2))
	ctrl.paste_selection(Vector2i(0, 2))
	_assert_true(
		ctrl.document.get_cell(0, 2).occupant_id == ctrl.clipboard.cells[0].occupant_id,
		"clipboard_paste",
		"paste mismatch"
	)


func _test_validator_start_equals_goal() -> void:
	var doc := EditorDocument.new(3, 3)
	doc.fill_occupants(EditorDocument.Layer.START, PackedStringArray(["A", "A", "A", "A", "A", "A", "A", "A", "A"]))
	doc.fill_occupants(EditorDocument.Layer.GOAL, PackedStringArray(["A", "A", "A", "A", "A", "A", "A", "A", "A"]))
	var v := EditorValidator.new()
	var r := v.validate_detailed(doc)
	var codes: PackedStringArray = PackedStringArray()
	for issue in r["issues"]:
		codes.append(str(issue["code"]))
	_assert_true(codes.has("start_equals_goal"), "validator_already_solved", ",".join(codes))


func _test_validator_solvable_sample() -> void:
	var doc := _sample_doc()
	var v := EditorValidator.new()
	var r := v.validate_detailed(doc)
	_assert_true(r.get("ok", false), "validator_sample_ok", "errors=%s" % str(r.get("errors")))
	var has_solvable := false
	for issue in r["issues"]:
		if str(issue["code"]) == "solvable":
			has_solvable = true
	_assert_true(has_solvable, "validator_reports_solvable", "missing solvable info")


func _test_difficulty_analyzer() -> void:
	var doc := _sample_doc()
	var a := EditorDifficultyAnalyzer.new()
	var r := a.analyze(doc)
	_assert_true(r.get("ok", false), "analyzer_ok", str(r.get("error", "?")))
	_assert_true(int(r.get("optimal_moves", -1)) == 1, "analyzer_optimal", str(r.get("optimal_moves")))
	_assert_true(doc.optimal_moves == 1, "analyzer_writes_doc", str(doc.optimal_moves))


func _test_resize_undo() -> void:
	var ctrl := LevelEditorController.new()
	ctrl.setup(_sample_doc())
	ctrl.resize_board(4, 4)
	_assert_true(ctrl.document.width == 4, "resize_apply", str(ctrl.document.width))
	ctrl.undo()
	_assert_true(ctrl.document.width == 3, "resize_undo", str(ctrl.document.width))


func _test_test_session_solves() -> void:
	var doc := _sample_doc()
	var ts := EditorTestSession.new()
	_assert_true(ts.start(doc, false), "test_session_start", "start failed")
	## Optimal: shift row 1 left (NEGATIVE)
	ts.shift_row(1, BoardEnums.Direction.NEGATIVE, 1)
	_assert_true(ts.is_solved(), "test_session_solved", "expected solved after one shift")
	ts.stop()
