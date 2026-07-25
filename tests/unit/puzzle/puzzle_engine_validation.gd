class_name PuzzleEngineValidation
extends RefCounted
## Headless checks for the compositional puzzle engine.
## Run: godot --headless -s res://tests/unit/puzzle/run_puzzle_validation.gd

var _passed: int = 0
var _failed: int = 0
var _errors: PackedStringArray = PackedStringArray()


func run_all() -> int:
	_passed = 0
	_failed = 0
	_errors.clear()
	PuzzleRegistry.bootstrap()
	_test_door_switch()
	_test_pressure_plate()
	_test_laser_mirror_path()
	_test_teleporter()
	_test_ice_slide()
	_test_enemy_tick()
	_test_heavy_door_is_data_variant()
	_test_determinism()
	_test_axis_lock_column_cycle()
	_test_axis_lock_cycle_connections_and_lasers()
	print("PuzzleEngineValidation: %d passed, %d failed" % [_passed, _failed])
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


func _assert_true(cond: bool, name: String, msg: String = "") -> void:
	if cond:
		_ok(name)
	else:
		_fail(name, msg if not msg.is_empty() else "assertion failed")


func _make_engine(w: int = 6, h: int = 6) -> PuzzleEngine:
	var session := BoardSession.new()
	var cfg := BoardConfig.new()
	cfg.width = w
	cfg.height = h
	session.setup_from_config(cfg)
	var engine := PuzzleEngine.new()
	engine.bind_session(session)
	engine.setup_catalog(PuzzleCatalog.build_all())
	return engine


func _door_blocking(engine: PuzzleEngine, cell: Vector2i) -> bool:
	engine.world.rebuild_from_board(engine.session.get_state())
	var ctx := engine._make_context()
	return ctx.is_blocking(cell)


func _test_door_switch() -> void:
	var engine := _make_engine(4, 3)
	engine.place(Vector2i(2, 1), &"door")
	engine.place(Vector2i(0, 1), &"switch")
	engine.bootstrap_from_board()
	_assert_true(_door_blocking(engine, Vector2i(2, 1)), "door_starts_closed")
	engine.interact_at(Vector2i(0, 1))
	_assert_true(engine.get_channels().is_active(&"door"), "switch_arms_channel")
	_assert_true(not _door_blocking(engine, Vector2i(2, 1)), "door_opens_on_switch")
	_assert_true(engine.is_door_open(Vector2i(2, 1)), "door_open_query")


func _test_pressure_plate() -> void:
	var engine := _make_engine(4, 3)
	engine.place(Vector2i(1, 1), &"pressure_plate", true)
	engine.place(Vector2i(3, 1), &"door")
	engine.bootstrap_from_board()
	_assert_true(_door_blocking(engine, Vector2i(3, 1)), "plate_door_closed_empty")
	engine.place(Vector2i(1, 1), &"crate")
	engine.recompute()
	_assert_true(engine.get_channels().is_active(&"door"), "plate_pressed_by_crate")
	_assert_true(not _door_blocking(engine, Vector2i(3, 1)), "plate_opens_door")


func _test_laser_mirror_path() -> void:
	## Emitter (0,2) EAST → mirror / at (2,2) reflects NORTH → receiver (2,0).
	var engine := _make_engine(5, 4)
	engine.place(Vector2i(0, 2), &"laser_emitter")
	engine.place(Vector2i(2, 2), &"mirror")
	engine.place(Vector2i(2, 0), &"laser_receiver")
	engine.place(Vector2i(4, 0), &"door")
	engine.bootstrap_from_board()
	var hit := false
	var beam_path: Array = []
	## Recompute emits laser events — gather from last recompute.
	var events := engine.recompute()
	for e in events:
		if e.kind == PuzzleEvent.Kind.LASER_BEAM:
			beam_path = e.payload.get("path", [])
		if e.kind == PuzzleEvent.Kind.LASER_RECEIVER_HIT:
			hit = true
	_assert_true(hit or engine.get_channels().is_active(&"door"), "laser_receiver_armed")
	_assert_true(not _door_blocking(engine, Vector2i(4, 0)), "laser_opens_door")
	## Path should include mirror cell and travel north.
	var path_has_mirror := false
	var path_has_receiver := false
	for p in beam_path:
		if p is Array and p.size() >= 2:
			if int(p[0]) == 2 and int(p[1]) == 2:
				path_has_mirror = true
			if int(p[0]) == 2 and int(p[1]) == 0:
				path_has_receiver = true
	_assert_true(path_has_mirror and path_has_receiver, "laser_path_via_mirror", str(beam_path))


func _test_teleporter() -> void:
	var engine := _make_engine(5, 3)
	engine.place(Vector2i(0, 1), &"teleporter", true)
	engine.place(Vector2i(4, 1), &"teleporter", true)
	engine.place(Vector2i(0, 1), &"crate")
	engine.bootstrap_from_board()
	engine.recompute()
	var crate_b := engine.world.get_at(Vector2i(4, 1))
	var crate_a := engine.world.get_at(Vector2i(0, 1))
	_assert_true(crate_b != null and crate_b.def_id == &"crate", "teleport_crate_to_pad_b",
		"at_a=%s at_b=%s" % [crate_a != null, crate_b != null])


func _test_ice_slide() -> void:
	var engine := _make_engine(6, 3)
	engine.place(Vector2i(1, 1), &"ice", true)
	engine.place(Vector2i(2, 1), &"ice", true)
	engine.place(Vector2i(3, 1), &"ice", true)
	engine.place(Vector2i(1, 1), &"crate")
	engine.bootstrap_from_board()
	var crate := engine.world.get_at(Vector2i(1, 1))
	_assert_true(crate != null, "ice_crate_placed")
	var mov: MovableComponent = crate.get_component(&"movable") as MovableComponent
	mov.set_slide_dir(PuzzleEnums.Dir.EAST)
	crate.sync_state_from_components()
	crate.write_to_tile(engine.session.get_state().get_tile(1, 1))
	engine.recompute()
	## Slides across ice until off ice or blocked — cell 4 has no ice, so stops at 3 or 4.
	var at3 := engine.world.get_at(Vector2i(3, 1))
	var at4 := engine.world.get_at(Vector2i(4, 1))
	var ok := (at3 != null and at3.def_id == &"crate") or (at4 != null and at4.def_id == &"crate")
	_assert_true(ok, "ice_slide_moves_east", "at3=%s at4=%s" % [at3 != null, at4 != null])
	## Ensure left start cell.
	_assert_true(engine.world.get_at(Vector2i(1, 1)) == null, "ice_left_start")


func _test_enemy_tick() -> void:
	var engine := _make_engine(5, 3)
	engine.place(Vector2i(1, 1), &"enemy_patrol")
	engine.bootstrap_from_board()
	engine.tick(100)
	var enemy := engine.world.get_at(Vector2i(2, 1))
	_assert_true(enemy != null and enemy.def_id == &"enemy_patrol", "enemy_stepped_east")
	engine.tick(100)
	enemy = engine.world.get_at(Vector2i(3, 1))
	_assert_true(enemy != null and enemy.def_id == &"enemy_patrol", "enemy_second_step_east")


func _test_heavy_door_is_data_variant() -> void:
	var defs := PuzzleCatalog.build_all()
	var door: PuzzleObjectDef = null
	var heavy: PuzzleObjectDef = null
	for d in defs:
		if d.id == &"door":
			door = d
		elif d.id == &"heavy_door":
			heavy = d
	_assert_true(door != null and heavy != null, "heavy_door_defs_exist")
	_assert_true(door.has_component(&"door") and heavy.has_component(&"door"), "same_door_component")
	var ch_door := str(door.get_component_spec(&"door").params.get("channel", ""))
	var ch_heavy := str(heavy.get_component_spec(&"door").params.get("channel", ""))
	_assert_true(ch_door != ch_heavy, "heavy_door_different_channel_only")


func _test_determinism() -> void:
	var a := _run_laser_scenario_hash()
	var b := _run_laser_scenario_hash()
	_assert_true(a == b and not a.is_empty(), "laser_scenario_deterministic", "%s vs %s" % [a, b])


func _test_axis_lock_column_cycle() -> void:
	## Red is horizontal-locked: column shift cycles other cells around it.
	var engine := _make_engine(4, 4)
	engine.place(Vector2i(1, 1), &"block_red")
	engine.place(Vector2i(1, 0), &"crate")
	engine.place(Vector2i(1, 2), &"magnet")
	engine.bootstrap_from_board()
	var turn := engine.shift_column(1, 1, 1)
	_assert_true(turn.success, "axis_cycle_accepted")
	var red := engine.world.get_at(Vector2i(1, 1))
	_assert_true(red != null and red.def_id == &"block_red", "red_stays_fixed")
	var crate := engine.world.get_at(Vector2i(1, 2))
	var magnet := engine.world.get_at(Vector2i(1, 3))
	## Movable ring [0,2,3] rotated +1 → crate 0→2, magnet 2→3, empty 3→0.
	_assert_true(crate != null and crate.def_id == &"crate", "crate_cycled_to_y2")
	_assert_true(magnet != null and magnet.def_id == &"magnet", "magnet_cycled_to_y3")
	_assert_true(engine.world.get_at(Vector2i(1, 0)) == null, "y0_emptied_after_cycle")
	## Row shift still carries red.
	var turn_row := engine.shift_row(1, 1, 1)
	_assert_true(turn_row.success, "row_shift_carries_red")
	red = engine.world.get_at(Vector2i(2, 1))
	_assert_true(red != null and red.def_id == &"block_red", "red_rides_row")


func _test_axis_lock_cycle_connections_and_lasers() -> void:
	## Column cycle remaps TileConnections and forces laser/channel recompute.
	var engine := _make_engine(5, 4)
	engine.place(Vector2i(0, 2), &"laser_emitter")
	engine.place(Vector2i(2, 2), &"block_red")
	engine.place(Vector2i(2, 1), &"crate")
	engine.place(Vector2i(3, 2), &"mirror")
	engine.place(Vector2i(3, 0), &"laser_receiver")
	engine.bootstrap_from_board()
	var linker := engine.session.get_state().get_tile(0, 0)
	var conn := TileConnection.new()
	conn.kind = &"signal"
	conn.to_x = 2
	conn.to_y = 1 ## points at crate on red's column
	linker.add_connection(conn)
	engine.recompute()
	## Cycle column 2: movable ring [0,1,3], k=1 → crate 1→3; connection remaps 1→3.
	var turn := engine.shift_column(2, 1, 1)
	_assert_true(turn.success, "laser_cycle_accepted")
	var red := engine.world.get_at(Vector2i(2, 2))
	_assert_true(red != null and red.def_id == &"block_red", "laser_red_fixed")
	var remapped := false
	for c in engine.session.get_state().get_tile(0, 0).connections:
		if c.kind == &"signal" and c.to_x == 2 and c.to_y == 3:
			remapped = true
	_assert_true(remapped, "connection_remapped_after_cycle")
	var after_events := engine.recompute()
	var beam_seen := false
	for e in after_events:
		if e is PuzzleEvent and (e as PuzzleEvent).kind == PuzzleEvent.Kind.LASER_BEAM:
			beam_seen = true
	_assert_true(beam_seen, "laser_beam_after_cycle")


func _run_laser_scenario_hash() -> String:
	var engine := _make_engine(5, 4)
	engine.place(Vector2i(0, 2), &"laser_emitter")
	engine.place(Vector2i(2, 2), &"mirror")
	engine.place(Vector2i(2, 0), &"laser_receiver")
	engine.bootstrap_from_board()
	engine.recompute()
	return JSON.stringify(engine.session.get_state().to_dict())
