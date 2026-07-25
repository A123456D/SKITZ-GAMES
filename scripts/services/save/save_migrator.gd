class_name SaveMigrator
extends RefCounted
## Migrates profile dictionaries from schema v1 → CURRENT_VERSION.
## Each step is pure: input dict → output dict. Fail closed on unknown versions.

const MIN_SUPPORTED := 1


static func migrate(data: Dictionary) -> Dictionary:
	## Returns { ok: bool, data: Dictionary, error: String, from: int, to: int }
	var result := {"ok": false, "data": {}, "error": "", "from": -1, "to": -1}
	if data.get("format", "") != SaveSchema.FORMAT_ID:
		result["error"] = "bad_format"
		return result
	var ver := int(data.get("schema_version", -1))
	result["from"] = ver
	if ver < MIN_SUPPORTED:
		result["error"] = "version_too_old"
		return result
	if ver > SaveSchema.CURRENT_VERSION:
		result["error"] = "version_too_new"
		return result

	var cur := data.duplicate(true)
	while int(cur.get("schema_version", -1)) < SaveSchema.CURRENT_VERSION:
		var v := int(cur["schema_version"])
		match v:
			1:
				cur = _v1_to_v2(cur)
			2:
				cur = _v2_to_v3(cur)
			3:
				cur = _v3_to_v4(cur)
			4:
				cur = _v4_to_v5(cur)
			_:
				result["error"] = "missing_migrator_for_v%d" % v
				return result
	result["ok"] = true
	result["data"] = cur
	result["to"] = int(cur.get("schema_version", -1))
	return result


static func _v1_to_v2(d: Dictionary) -> Dictionary:
	var out := d.duplicate(true)
	out["schema_version"] = 2
	if not out.has("achievements"):
		out["achievements"] = {} # id -> { progress, unlocked, unlocked_unix }
	if not out.has("daily"):
		out["daily"] = {"streak": 0, "last_clear_utc": "", "attempts_today": 0}
	if not out.has("stats"):
		out["stats"] = {"shifts": 0, "three_star_clears": 0, "mastery_medals": 0}
	return out


static func _v2_to_v3(d: Dictionary) -> Dictionary:
	var out := d.duplicate(true)
	out["schema_version"] = 3
	if not out.has("privacy"):
		out["privacy"] = {
			"analytics_opt_in": false,
			"crash_opt_in": true,
			"consent_version": 0,
			"age_gate_passed": false,
		}
	if not out.has("cloud"):
		out["cloud"] = {"sync_enabled": true, "last_sync_unix": 0}
	if not out.has("leaderboard_cache"):
		out["leaderboard_cache"] = {}
	if not out.has("locale"):
		out["locale"] = ""
	return out


static func _v3_to_v4(d: Dictionary) -> Dictionary:
	var out := d.duplicate(true)
	out["schema_version"] = 4
	if not out.has("campaign") or not (out["campaign"] is Dictionary):
		out["campaign"] = {"chapters": {}}
	var camp: Dictionary = out["campaign"]
	if not camp.has("chapters"):
		camp["chapters"] = {}
	if not camp.has("last_level_id"):
		camp["last_level_id"] = ""
	if not camp.has("resume"):
		camp["resume"] = {}
	if not camp.has("world_skin"):
		camp["world_skin"] = "neon_grid"
	out["campaign"] = camp
	return out


static func _v4_to_v5(d: Dictionary) -> Dictionary:
	var out := d.duplicate(true)
	out["schema_version"] = 5
	if not out.has("daily") or not (out["daily"] is Dictionary):
		out["daily"] = {}
	var daily: Dictionary = out["daily"]
	if not daily.has("streak"):
		daily["streak"] = 0
	if not daily.has("last_clear_utc"):
		daily["last_clear_utc"] = ""
	if not daily.has("attempts_today"):
		daily["attempts_today"] = 0
	if not daily.has("completed_utc_date"):
		daily["completed_utc_date"] = ""
	if not daily.has("best_moves"):
		daily["best_moves"] = -1
	out["daily"] = daily
	if not out.has("endless") or not (out["endless"] is Dictionary):
		out["endless"] = {"wave_best": 0, "last_seed": 0}
	else:
		var end: Dictionary = out["endless"]
		if not end.has("wave_best"):
			end["wave_best"] = 0
		if not end.has("last_seed"):
			end["last_seed"] = 0
		out["endless"] = end
	return out


static func make_empty_v1() -> Dictionary:
	## Oldest fixture shape for tests / first install before migrate.
	return {
		"format": SaveSchema.FORMAT_ID,
		"schema_version": 1,
		"slot": "0",
		"updated_unix": int(Time.get_unix_time_from_system()),
		"settings": {
			"master_volume": 1.0,
			"music_volume": 0.72,
			"sfx_volume": 0.9,
			"ui_volume": 0.85,
			"quality_tier": 0,
			"reduce_motion": false,
			"text_scale": 1.0,
			"colorblind_indicators": true,
			"haptics_enabled": true,
		},
		"economy": {"sparks": 0, "prisms": 0},
		"campaign": {"chapters": {}},
	}


static func make_current_default() -> Dictionary:
	var migrated := migrate(make_empty_v1())
	if migrated["ok"]:
		return migrated["data"]
	# Fallback if migrator broken — still return current shape.
	var d := make_empty_v1()
	d = _v1_to_v2(d)
	d = _v2_to_v3(d)
	d = _v3_to_v4(d)
	d = _v4_to_v5(d)
	return d
