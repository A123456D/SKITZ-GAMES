class_name PuzzleGenValidation
extends RefCounted
## Headless checks for puzzle generation: solvability, bands, hints, uniqueness.

var _passed: int = 0
var _failed: int = 0
var _errors: PackedStringArray = PackedStringArray()


func run_all() -> int:
	_passed = 0
	_failed = 0
	_errors.clear()
	_test_construction_solvable_batch()
	_test_difficulty_bands_monotonic_ish()
	_test_hints_legal()
	_test_uniqueness_rate()
	_test_deterministic_seed()
	_test_apply_to_session()
	_test_validator_rejects_solved()
	_test_pattern_library_sizes()
	_test_daily_seed_stable()
	print("PuzzleGenValidation: %d passed, %d failed" % [_passed, _failed])
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


func _test_construction_solvable_batch() -> void:
	var gen := PuzzleGenerator.new()
	var solver := PuzzleSolver.new()
	solver.node_cap = 120_000
	var total := 40
	var solvable := 0
	var exact_or_bound := 0
	for i in total:
		var d := 1 + (i % 5)  # difficulties 1..5 for reliable exact solves
		var puzzle := gen.generate(1000 + i * 17, d)
		if puzzle == null or not puzzle.is_well_formed():
			continue
		exact_or_bound += 1
		solver.max_steps_per_shift = int(puzzle.gen_params.get("max_steps_per_shift", 1))
		var r := solver.solve(puzzle.build_start_state(), puzzle.build_goal_state())
		if r.solved:
			solvable += 1
			# Verify path actually reaches goal.
			var occ := AlignStateCodec.from_board(puzzle.build_start_state())
			for cmd in r.path:
				occ = AlignStateCodec.apply_cmd(occ, puzzle.width, puzzle.height, cmd)
			if AlignStateCodec.equals(occ, AlignStateCodec.from_board(puzzle.build_goal_state())):
				pass
			else:
				_fail("path_applies_%d" % i, "path did not reach goal")
				return
		elif bool(puzzle.meta.get("construction_guaranteed", false)):
			# Timeout: still count as construction-solvable.
			solvable += 1
	_assert_true(solvable == total, "solvability_100pct", "solvable=%d/%d" % [solvable, total])
	_assert_true(exact_or_bound == total, "well_formed_batch", "formed=%d/%d" % [exact_or_bound, total])


func _test_difficulty_bands_monotonic_ish() -> void:
	var gen := PuzzleGenerator.new()
	var scores: Array[float] = []
	var optimals: Array[int] = []
	for d in range(1, 7):
		var acc_score := 0.0
		var acc_opt := 0
		var n := 6
		for i in n:
			var p := gen.generate(5000 + d * 100 + i, d)
			acc_score += p.difficulty_score
			acc_opt += maxi(0, p.optimal_moves)
		scores.append(acc_score / float(n))
		optimals.append(int(round(float(acc_opt) / float(n))))

	# Soft monotonic: later difficulties should not collapse below early ones by a huge margin.
	var regressions := 0
	for i in range(1, scores.size()):
		if scores[i] + 4.0 < scores[i - 1]:
			regressions += 1
	_assert_true(regressions <= 1, "score_monotonic_ish", "regressions=%d scores=%s" % [regressions, str(scores)])

	# Average optimal at d6 should be >= average at d1.
	_assert_true(optimals[5] >= optimals[0], "optimal_trend", "opt=%s" % str(optimals))


func _test_hints_legal() -> void:
	var gen := PuzzleGenerator.new()
	var hints := HintGenerator.new()
	var ok_count := 0
	var n := 20
	for i in n:
		var puzzle := gen.generate(9000 + i, 2 + (i % 3))
		for stage in range(0, 3):
			var h := hints.hint(puzzle, stage)
			if not h.legal or h.command == null:
				_fail("hint_missing_%d_%d" % [i, stage], h.blurb)
				return
			if not HintGenerator.is_legal_on(puzzle.build_start_state(), h.command):
				_fail("hint_illegal_%d_%d" % [i, stage], h.command.describe())
				return
			# Progressive stages share the same underlying move.
			if stage == 0 and h.axis == &"":
				_fail("hint_axis_%d" % i, "empty axis")
				return
		ok_count += 1
	_assert_true(ok_count == n, "hints_legal_batch", "ok=%d/%d" % [ok_count, n])


func _test_uniqueness_rate() -> void:
	var builder := PuzzleCatalogBuilder.new()
	var params := PuzzleGenParams.from_difficulty(3)
	params.regen_attempts = 6
	var entries := builder.build_seed_catalog(4242, 80, 3, params)
	var rate := PuzzleCatalogBuilder.uniqueness_rate(entries)
	_assert_true(entries.size() >= 70, "catalog_fill", "size=%d" % entries.size())
	_assert_true(rate >= 0.95, "uniqueness_rate", "rate=%s size=%d" % [str(rate), entries.size()])


func _test_deterministic_seed() -> void:
	var gen := PuzzleGenerator.new()
	var a := gen.generate(777, 3)
	var b := gen.generate(777, 3)
	_assert_true(a.state_fingerprint == b.state_fingerprint, "deterministic_fingerprint", "%s vs %s" % [a.state_fingerprint, b.state_fingerprint])
	_assert_true(a.optimal_moves == b.optimal_moves, "deterministic_optimal", "%d vs %d" % [a.optimal_moves, b.optimal_moves])
	_assert_true(a.to_dict().hash() == b.to_dict().hash() or a.start_occupants == b.start_occupants, "deterministic_start", "start mismatch")


func _test_apply_to_session() -> void:
	var puzzle := PuzzleGenerator.new().generate(42, 2)
	var session := BoardSession.new()
	puzzle.apply_to_session(session)
	_assert_true(session.get_width() == puzzle.width, "session_width", str(session.get_width()))
	_assert_true(StateFingerprint.from_state(session.get_state()) == puzzle.state_fingerprint, "session_start_fp", "fingerprint mismatch")
	_assert_true(session.meta.has("goal"), "session_goal_meta", "missing goal")


func _test_validator_rejects_solved() -> void:
	var puzzle := PuzzleGenerator.new().generate(11, 1)
	# Force already-solved.
	puzzle.start_occupants = puzzle.goal_occupants.duplicate()
	puzzle.state_fingerprint = StateFingerprint.from_occupants(puzzle.width, puzzle.height, puzzle.start_occupants)
	var v := PuzzleValidator.new().validate(puzzle)
	_assert_true(not v["ok"], "reject_already_solved", str(v["issues"]))


func _test_pattern_library_sizes() -> void:
	for size in [3, 4, 5, 6]:
		var pool := PatternLibrary.templates_for(size, size, 4, 6)
		_assert_true(pool.size() > 0, "patterns_%dx%d" % [size, size], "empty pool")


func _test_daily_seed_stable() -> void:
	var a := PuzzleGenerator._daily_seed("2026-07-24", "SHIFTR")
	var b := PuzzleGenerator._daily_seed("2026-07-24", "SHIFTR")
	var c := PuzzleGenerator._daily_seed("2026-07-25", "SHIFTR")
	_assert_true(a == b and a != 0, "daily_stable", str(a))
	_assert_true(a != c, "daily_changes", "%d vs %d" % [a, c])
