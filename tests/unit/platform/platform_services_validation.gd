class_name PlatformServicesValidation
extends RefCounted
## Headless checks: save migration roundtrip + local achievement unlock path.

var _passed: int = 0
var _failed: int = 0
var _errors: PackedStringArray = PackedStringArray()


func run_all() -> int:
	_passed = 0
	_failed = 0
	_errors.clear()
	_test_migrate_v1_to_current()
	_test_migrate_idempotent()
	_test_cloud_merge_identical()
	_test_cloud_merge_newer_remote()
	_test_cloud_merge_conflict()
	_test_achievement_unlock_local()
	_test_leaderboard_daily_encode()
	_test_feature_flags_shape()
	print("PlatformServicesValidation: %d passed, %d failed" % [_passed, _failed])
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


func _test_migrate_v1_to_current() -> void:
	var v1 := SaveMigrator.make_empty_v1()
	v1["economy"] = {"sparks": 42, "prisms": 3}
	var result := SaveMigrator.migrate(v1)
	_assert_true(result["ok"], "migrate_ok", str(result.get("error", "")))
	var data: Dictionary = result["data"]
	_assert_true(int(data["schema_version"]) == SaveSchema.CURRENT_VERSION, "migrate_version")
	_assert_true(data.has("achievements"), "migrate_has_achievements")
	_assert_true(data.has("privacy"), "migrate_has_privacy")
	_assert_true(data.has("cloud"), "migrate_has_cloud")
	_assert_true(data.has("campaign"), "migrate_has_campaign")
	var camp: Dictionary = data.get("campaign", {})
	_assert_true(camp.has("resume"), "migrate_has_resume")
	_assert_true(camp.has("world_skin"), "migrate_has_world_skin")
	var daily: Dictionary = data.get("daily", {})
	_assert_true(daily.has("completed_utc_date"), "migrate_has_daily_completed")
	_assert_true(data.has("endless"), "migrate_has_endless")
	_assert_true(int(data["economy"]["sparks"]) == 42, "migrate_preserves_economy")


func _test_migrate_idempotent() -> void:
	var cur := SaveMigrator.make_current_default()
	var again := SaveMigrator.migrate(cur)
	_assert_true(again["ok"], "idempotent_ok", str(again.get("error", "")))
	_assert_true(int(again["from"]) == SaveSchema.CURRENT_VERSION, "idempotent_from")
	_assert_true(int(again["to"]) == SaveSchema.CURRENT_VERSION, "idempotent_to")


func _test_cloud_merge_identical() -> void:
	var meta := {"checksum": "abc", "updated_unix": 100}
	var d := CloudMergePolicy.decide(meta, meta.duplicate())
	_assert_true(d["decision"] == CloudMergePolicy.Decision.USE_LOCAL, "merge_identical")


func _test_cloud_merge_newer_remote() -> void:
	var local := {"checksum": "a", "updated_unix": 10}
	var remote := {"checksum": "b", "updated_unix": 20}
	var d := CloudMergePolicy.decide(local, remote)
	_assert_true(d["decision"] == CloudMergePolicy.Decision.USE_REMOTE, "merge_remote_newer")


func _test_cloud_merge_conflict() -> void:
	var local := {"checksum": "a", "updated_unix": 50}
	var remote := {"checksum": "b", "updated_unix": 50}
	var d := CloudMergePolicy.decide(local, remote)
	_assert_true(d["decision"] == CloudMergePolicy.Decision.CONFLICT, "merge_conflict")


func _test_achievement_unlock_local() -> void:
	var save := SaveService.new()
	save.profile = SaveMigrator.make_current_default()
	var svc := AchievementService.new()
	svc.configure(null, save)
	svc.load_builtin_gdd_set()
	var def := svc.get_def(&"cascade_10")
	_assert_true(def != null, "ach_def_exists")
	if def == null:
		return
	_assert_true(not def.unlocked, "ach_starts_locked")
	var saw := {"id": &""}
	svc.unlocked.connect(func(id: StringName) -> void: saw["id"] = id)
	svc.unlock(&"cascade_10")
	_assert_true(def.unlocked, "ach_unlocked_flag")
	_assert_true(saw["id"] == &"cascade_10", "ach_signal")
	var stored: Dictionary = save.profile.get("achievements", {})
	_assert_true(stored.has("cascade_10"), "ach_persisted_key")
	_assert_true(bool(stored["cascade_10"].get("unlocked", false)), "ach_persisted_unlocked")


func _test_leaderboard_daily_encode() -> void:
	var save := SaveService.new()
	save.profile = SaveMigrator.make_current_default()
	var lb := LeaderboardService.new()
	lb.configure(null, save)
	var err := lb.submit_daily(8, 22.05, "2026-07-24")
	_assert_true(err == OK, "lb_submit_ok")
	var cached := lb.cached(LeaderboardService.BOARD_DAILY)
	_assert_true(cached.size() >= 1, "lb_cache_size")
	var self_row: Dictionary = cached[0]
	_assert_true(bool(self_row.get("is_self", false)), "lb_self")
	_assert_true(int(self_row.get("moves", 0)) == 8, "lb_moves")
	_assert_true(lb.self_rank(LeaderboardService.BOARD_DAILY) == 1, "lb_self_rank")
	var err2 := lb.submit_endless(2_000_000, 2, 12)
	_assert_true(err2 == OK, "lb_endless_ok")
	_assert_true(lb.self_rank(LeaderboardService.BOARD_ENDLESS) == 1, "lb_endless_rank")


func _test_feature_flags_shape() -> void:
	var f := FeatureFlags.for_current_platform()
	var d := f.to_dict()
	_assert_true(d.has("achievements") and d.has("cloud_save"), "flags_keys")
	var gw := PlatformGateway.new()
	gw.bootstrap(&"null")
	_assert_true(gw.platform_id() == &"null", "gateway_null")
	_assert_true(gw.adapter is NullPlatformAdapter, "gateway_adapter_type")
