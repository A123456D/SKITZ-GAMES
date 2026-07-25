class_name BoardSystemValidation
extends RefCounted
## Headless unit-style checks for the board system. No scene tree required.
## Run via: godot --headless -s res://tests/unit/board/run_board_validation.gd

var _passed: int = 0
var _failed: int = 0
var _errors: PackedStringArray = PackedStringArray()


func run_all() -> int:
	_passed = 0
	_failed = 0
	_errors.clear()
	_test_row_shift_wrap()
	_test_col_shift_wrap()
	_test_shift_invertible()
	_test_rotate_square()
	_test_rotate_nonsquare()
	_test_undo_redo()
	_test_serialize_roundtrip()
	_test_tile_fields_preserved()
	_test_history_capacity_no_full_snapshots()
	_test_locked_blocks_row()
	_test_any_size()
	_test_seeded_rng_deterministic()
	_test_connections_follow_row_shift()
	print("BoardSystemValidation: %d passed, %d failed" % [_passed, _failed])
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


func _grid_ids(state: BoardState) -> Array:
	return state.occupants_grid()


func _test_row_shift_wrap() -> void:
	var s := BoardState.create(4, 1)
	s.fill_occupants_row_major(["A", "B", "C", "D"])
	s.shift_row(0, 1, 1)
	_assert_true(_grid_ids(s) == [["D", "A", "B", "C"]], "row_shift_right_wrap", str(_grid_ids(s)))
	s.shift_row(0, -1, 1)
	_assert_true(_grid_ids(s) == [["A", "B", "C", "D"]], "row_shift_left_restore", str(_grid_ids(s)))


func _test_col_shift_wrap() -> void:
	var s := BoardState.create(1, 4)
	s.fill_occupants_row_major(["A", "B", "C", "D"])
	s.shift_column(0, 1, 1)
	_assert_true(_grid_ids(s) == [["D"], ["A"], ["B"], ["C"]], "col_shift_down_wrap", str(_grid_ids(s)))


func _test_shift_invertible() -> void:
	var session := BoardSession.new()
	var cfg := BoardConfig.new()
	cfg.width = 5
	cfg.height = 4
	session.setup_from_config(cfg)
	var ids: Array = []
	for i in 20:
		ids.append("T%d" % i)
	session.get_state().fill_occupants_row_major(ids)
	var before := session.get_state().duplicate_state()
	session.shift_row(2, 1, 3)
	session.shift_column(1, -1, 2)
	session.undo()
	session.undo()
	_assert_true(session.get_state().content_equals(before), "shift_pair_undo", "state mismatch after undos")


func _test_rotate_square() -> void:
	var s := BoardState.create(2, 2)
	s.fill_occupants_row_major(["A", "B", "C", "D"])
	# A B / C D  --CW-->  C A / D B
	s.rotate_cw(1)
	_assert_true(_grid_ids(s) == [["C", "A"], ["D", "B"]], "rotate_cw_2x2", str(_grid_ids(s)))
	s.rotate_cw(3)
	_assert_true(_grid_ids(s) == [["A", "B"], ["C", "D"]], "rotate_inverse", str(_grid_ids(s)))


func _test_rotate_nonsquare() -> void:
	var s := BoardState.create(3, 2)
	s.fill_occupants_row_major(["A", "B", "C", "D", "E", "F"])
	# A B C / D E F  --CW--> D A / E B / F C  (2x3 → 3x2... wait 3w2h → 2w3h)
	s.rotate_cw(1)
	_assert_true(s.width == 2 and s.height == 3, "rotate_dims", "%dx%d" % [s.width, s.height])
	_assert_true(_grid_ids(s) == [["D", "A"], ["E", "B"], ["F", "C"]], "rotate_3x2", str(_grid_ids(s)))


func _test_undo_redo() -> void:
	var session := BoardSession.new()
	var cfg := BoardConfig.new()
	cfg.width = 3
	cfg.height = 3
	session.setup_from_config(cfg)
	session.get_state().fill_occupants_row_major(["1", "2", "3", "4", "5", "6", "7", "8", "9"])
	var start := session.get_state().duplicate_state()
	session.shift_row(0, 1, 1)
	var mid := session.get_state().duplicate_state()
	session.shift_column(0, 1, 1)
	_assert_true(session.can_undo(), "can_undo", "expected undo")
	session.undo()
	_assert_true(session.get_state().content_equals(mid), "undo_one", "mid mismatch")
	_assert_true(session.can_redo(), "can_redo", "expected redo")
	session.redo()
	session.undo()
	session.undo()
	_assert_true(session.get_state().content_equals(start), "undo_all", "start mismatch")


func _test_serialize_roundtrip() -> void:
	var session := BoardSession.new()
	var cfg := BoardConfig.new()
	cfg.width = 4
	cfg.height = 3
	session.setup_from_config(cfg)
	session.get_state().fill_occupants_row_major([
		"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"
	])
	session.meta["level_id"] = "test_01"
	session.shift_row(1, -1, 2)
	session.rotate_board(1)
	var json := session.save_json()
	var other := BoardSession.new()
	var err := other.load_json(json)
	_assert_true(err == OK, "load_json_ok", "err=%s" % err)
	_assert_true(other.get_state().content_equals(session.get_state()), "serialize_state", "state differ")
	_assert_true(other.meta.get("level_id", "") == "test_01", "serialize_meta", "meta lost")


func _test_tile_fields_preserved() -> void:
	var session := BoardSession.new()
	var cfg := BoardConfig.new()
	cfg.width = 2
	cfg.height = 2
	session.setup_from_config(cfg)
	var tile := session.get_state().get_tile(0, 1)
	tile.occupant_id = &"gem"
	tile.state = BoardEnums.TileStateFlags.CORRECT
	tile.add_modifier(&"mirror")
	var conn := TileConnection.new()
	conn.kind = &"bond"
	conn.to_x = 1
	conn.to_y = 1
	conn.meta["strength"] = 2
	tile.add_connection(conn)
	tile.payload["skin"] = "neon"
	var json := session.save_json()
	var other := BoardSession.new()
	other.load_json(json)
	var t2 := other.get_state().get_tile(0, 1)
	_assert_true(t2.occupant_id == &"gem", "occ", String(t2.occupant_id))
	_assert_true(t2.has_flag(BoardEnums.TileStateFlags.CORRECT), "state", "flag missing")
	_assert_true(t2.has_modifier(&"mirror"), "mod", "modifier missing")
	_assert_true(t2.connections.size() == 1 and t2.connections[0].kind == &"bond", "conn", "connection lost")
	_assert_true(t2.payload.get("skin", "") == "neon", "payload", "payload lost")


func _test_history_capacity_no_full_snapshots() -> void:
	var session := BoardSession.new()
	var cfg := BoardConfig.new()
	cfg.width = 6
	cfg.height = 6
	cfg.history_capacity = 128
	cfg.checkpoint_interval = 32
	session.setup_from_config(cfg)
	for i in 200:
		session.shift_row(i % 6, 1 if (i % 2 == 0) else -1, 1)
	# Ring holds at most capacity entries — not 200 full boards.
	_assert_true(session.history.length() <= cfg.history_capacity, "hist_cap", "len=%d" % session.history.length())
	var est := session.history.estimate_memory_bytes()
	# Sanity: should be well under megabytes for 6x6 × 128
	_assert_true(est < 2_000_000, "hist_mem", "est=%d" % est)
	_assert_true(session.can_undo(), "hist_undo", "should undo")


func _test_locked_blocks_row() -> void:
	var session := BoardSession.new()
	var cfg := BoardConfig.new()
	cfg.width = 3
	cfg.height = 1
	session.setup_from_config(cfg)
	session.get_state().fill_occupants_row_major(["A", "B", "C"])
	session.get_state().get_tile(1, 0).set_flag(BoardEnums.TileStateFlags.LOCKED, true)
	var r := session.shift_row(0, 1, 1)
	_assert_true(not r.success, "locked_reject", "expected reject")
	_assert_true(_grid_ids(session.get_state()) == [["A", "B", "C"]], "locked_unchanged", str(_grid_ids(session.get_state())))


func _test_any_size() -> void:
	for wh in [[3, 8], [8, 3], [1, 1], [7, 7]]:
		var w: int = wh[0]
		var h: int = wh[1]
		var session := BoardSession.new()
		var cfg := BoardConfig.new()
		cfg.width = w
		cfg.height = h
		session.setup_from_config(cfg)
		var n := w * h
		var ids: Array = []
		for i in n:
			ids.append(str(i))
		session.get_state().fill_occupants_row_major(ids)
		if w > 1:
			var r := session.shift_row(0, 1, 1)
			_assert_true(r.success, "size_%dx%d_row" % [w, h], "row shift failed")
		if h > 1:
			var r2 := session.shift_column(0, -1, 1)
			_assert_true(r2.success, "size_%dx%d_col" % [w, h], "col shift failed")
		_assert_true(session.get_width() == w and session.get_height() == h, "size_%dx%d_dims" % [w, h], "dims changed")


func _test_seeded_rng_deterministic() -> void:
	var a := SeededRNG.new(42)
	var b := SeededRNG.new(42)
	var same := true
	for i in 50:
		if a.next_u32() != b.next_u32():
			same = false
			break
	_assert_true(same, "rng_det", "streams diverged")


func _test_connections_follow_row_shift() -> void:
	var s := BoardState.create(3, 2)
	s.fill_occupants_row_major(["A", "B", "C", "D", "E", "F"])
	# Tile at (0,1) links to (0,0). After shifting row 0 right by 1, target becomes (1,0).
	var linker := s.get_tile(0, 1)
	var conn := TileConnection.new()
	conn.kind = &"bond"
	conn.to_x = 0
	conn.to_y = 0
	linker.add_connection(conn)
	s.shift_row(0, 1, 1)
	var c2 := s.get_tile(0, 1).connections[0]
	_assert_true(c2.to_x == 1 and c2.to_y == 0, "conn_row_shift", "got (%d,%d)" % [c2.to_x, c2.to_y])
