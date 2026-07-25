class_name SaveService
extends RefCounted
## Versioned player profile I/O with migration + optional cloud sync via PlatformGateway.

signal profile_loaded(profile: Dictionary)
signal profile_saved(slot: String)
signal cloud_sync_finished(ok: bool, decision: String)
signal cloud_conflict_needed(local_meta: Dictionary, remote_meta: Dictionary)

const SAVE_DIR := "user://saves/"
const DEFAULT_SLOT := "0"

var gateway: PlatformGateway = null
var profile: Dictionary = {}
var active_slot: String = DEFAULT_SLOT
var cloud_sync_enabled: bool = true


func configure(p_gateway: PlatformGateway) -> void:
	gateway = p_gateway


func load_or_create(slot: String = DEFAULT_SLOT) -> Dictionary:
	active_slot = slot
	var path := _path(slot)
	if not FileAccess.file_exists(path):
		profile = SaveMigrator.make_current_default()
		profile["slot"] = slot
		save_local()
		profile_loaded.emit(profile)
		return profile
	var raw := _read_json(path)
	if raw.is_empty():
		profile = SaveMigrator.make_current_default()
		profile["slot"] = slot
		profile_loaded.emit(profile)
		return profile
	var migrated := SaveMigrator.migrate(raw)
	if not migrated["ok"]:
		push_error("SaveService migrate failed: %s" % migrated["error"])
		profile = SaveMigrator.make_current_default()
		profile["slot"] = slot
		profile_loaded.emit(profile)
		return profile
	profile = migrated["data"]
	profile["slot"] = slot
	if int(raw.get("schema_version", -1)) < SaveSchema.CURRENT_VERSION:
		save_local() # persist upgraded schema
	profile_loaded.emit(profile)
	return profile


func save_local() -> Error:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(SAVE_DIR))
	profile["updated_unix"] = int(Time.get_unix_time_from_system())
	profile["schema_version"] = SaveSchema.CURRENT_VERSION
	profile["format"] = SaveSchema.FORMAT_ID
	var path := _path(active_slot)
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return FileAccess.get_open_error()
	f.store_string(JSON.stringify(profile))
	profile_saved.emit(active_slot)
	return OK


func sync_cloud(prefer_remote_on_conflict: bool = false) -> Dictionary:
	## Returns { ok, decision, error }
	if gateway == null or not cloud_sync_enabled:
		return {"ok": false, "decision": "skipped", "error": "disabled"}
	var cloud_flag := gateway.flags.cloud_save if gateway.flags else false
	if not cloud_flag:
		return {"ok": false, "decision": "skipped", "error": "flag_off"}

	var local_bytes := JSON.stringify(profile).to_utf8_buffer()
	var local_meta := CloudMergePolicy.meta_from_profile(profile)
	var remote := gateway.download_cloud_save(active_slot)
	if not remote.get("ok", false):
		var up := gateway.upload_cloud_save(active_slot, local_bytes, local_meta)
		var ok := up == OK
		cloud_sync_finished.emit(ok, "uploaded_initial" if ok else "upload_failed")
		return {"ok": ok, "decision": "uploaded_initial", "error": "" if ok else "upload_failed"}

	var remote_meta: Dictionary = remote.get("meta", {})
	var decision := CloudMergePolicy.decide(local_meta, remote_meta)
	var d: int = decision["decision"]
	match d:
		CloudMergePolicy.Decision.USE_LOCAL:
			var err := gateway.upload_cloud_save(active_slot, local_bytes, local_meta)
			cloud_sync_finished.emit(err == OK, "use_local")
			return {"ok": err == OK, "decision": "use_local", "error": ""}
		CloudMergePolicy.Decision.USE_REMOTE:
			var applied := _apply_remote_payload(remote.get("payload", PackedByteArray()))
			cloud_sync_finished.emit(applied, "use_remote")
			return {"ok": applied, "decision": "use_remote", "error": "" if applied else "bad_remote"}
		_:
			if prefer_remote_on_conflict:
				var applied2 := _apply_remote_payload(remote.get("payload", PackedByteArray()))
				cloud_sync_finished.emit(applied2, "conflict_prefer_remote")
				return {"ok": applied2, "decision": "conflict_prefer_remote", "error": ""}
			cloud_conflict_needed.emit(local_meta, remote_meta)
			if gateway:
				gateway.cloud_conflict.emit(local_meta, remote_meta)
			cloud_sync_finished.emit(false, "conflict")
			return {"ok": false, "decision": "conflict", "error": "conflict"}


func resolve_conflict_keep_local() -> Error:
	var local_bytes := JSON.stringify(profile).to_utf8_buffer()
	var local_meta := CloudMergePolicy.meta_from_profile(profile)
	return gateway.upload_cloud_save(active_slot, local_bytes, local_meta) if gateway else ERR_UNAVAILABLE


func resolve_conflict_keep_remote(remote_payload: PackedByteArray) -> bool:
	return _apply_remote_payload(remote_payload)


func apply_settings_from_profile(settings: UiSettingsState) -> void:
	if settings == null:
		return
	var s: Dictionary = profile.get("settings", {})
	settings.master_volume = float(s.get("master_volume", settings.master_volume))
	settings.music_volume = float(s.get("music_volume", settings.music_volume))
	settings.sfx_volume = float(s.get("sfx_volume", settings.sfx_volume))
	settings.ui_volume = float(s.get("ui_volume", settings.ui_volume))
	settings.reduce_motion = bool(s.get("reduce_motion", settings.reduce_motion))
	settings.text_scale = float(s.get("text_scale", settings.text_scale))
	settings.colorblind_indicators = bool(s.get("colorblind_indicators", settings.colorblind_indicators))
	settings.haptics_enabled = bool(s.get("haptics_enabled", settings.haptics_enabled))
	settings.battery_saver = bool(s.get("battery_saver", settings.battery_saver))
	settings.disable_shake = bool(s.get("disable_shake", settings.disable_shake))
	settings.bloom_enabled = bool(s.get("bloom_enabled", settings.bloom_enabled))
	settings.quality_tier = int(s.get("quality_tier", int(settings.quality_tier))) as VisualQualityConfig.Tier
	var econ: Dictionary = profile.get("economy", {})
	settings.sparks = int(econ.get("sparks", settings.sparks))
	settings.prisms = int(econ.get("prisms", settings.prisms))
	var daily: Dictionary = profile.get("daily", {})
	settings.daily_streak = int(daily.get("streak", settings.daily_streak))


func write_settings_to_profile(settings: UiSettingsState) -> void:
	if settings == null:
		return
	profile["settings"] = {
		"master_volume": settings.master_volume,
		"music_volume": settings.music_volume,
		"sfx_volume": settings.sfx_volume,
		"ui_volume": settings.ui_volume,
		"quality_tier": int(settings.quality_tier),
		"reduce_motion": settings.reduce_motion,
		"text_scale": settings.text_scale,
		"colorblind_indicators": settings.colorblind_indicators,
		"haptics_enabled": settings.haptics_enabled,
		"battery_saver": settings.battery_saver,
		"disable_shake": settings.disable_shake,
		"bloom_enabled": settings.bloom_enabled,
	}
	profile["economy"] = {"sparks": settings.sparks, "prisms": settings.prisms}
	if not profile.has("daily"):
		profile["daily"] = {}
	profile["daily"]["streak"] = settings.daily_streak


## --- Campaign resume (Continue CTA) ---

func has_resume() -> bool:
	var camp: Dictionary = profile.get("campaign", {})
	var resume: Variant = camp.get("resume", {})
	return resume is Dictionary and not (resume as Dictionary).is_empty() and str((resume as Dictionary).get("scene", "")) != ""


func get_resume() -> Dictionary:
	var camp: Dictionary = profile.get("campaign", {})
	var resume: Variant = camp.get("resume", {})
	return resume.duplicate(true) if resume is Dictionary else {}


func get_last_level_id() -> String:
	var camp: Dictionary = profile.get("campaign", {})
	return str(camp.get("last_level_id", ""))


func get_world_skin_key() -> StringName:
	var camp: Dictionary = profile.get("campaign", {})
	return StringName(str(camp.get("world_skin", "neon_grid")))


func set_world_skin_key(key: StringName, persist: bool = true) -> void:
	if not profile.has("campaign") or not (profile["campaign"] is Dictionary):
		profile["campaign"] = {"chapters": {}, "resume": {}, "last_level_id": "", "world_skin": "neon_grid"}
	profile["campaign"]["world_skin"] = String(key)
	if persist:
		save_local()


func write_resume(payload: Dictionary, persist: bool = true) -> void:
	if not profile.has("campaign") or not (profile["campaign"] is Dictionary):
		profile["campaign"] = {"chapters": {}, "resume": {}, "last_level_id": "", "world_skin": "neon_grid"}
	var camp: Dictionary = profile["campaign"]
	camp["resume"] = payload.duplicate(true)
	camp["last_level_id"] = str(payload.get("level_id", camp.get("last_level_id", "")))
	if payload.has("world_skin"):
		camp["world_skin"] = str(payload["world_skin"])
	profile["campaign"] = camp
	if persist:
		save_local()


func clear_resume(persist: bool = true) -> void:
	if not profile.has("campaign") or not (profile["campaign"] is Dictionary):
		return
	profile["campaign"]["resume"] = {}
	if persist:
		save_local()


## --- Campaign chapter progress ---
## chapters[chapter_id] = { "levels": { level_id: { "stars": int, "best_moves": int } } }

func _ensure_campaign() -> Dictionary:
	if not profile.has("campaign") or not (profile["campaign"] is Dictionary):
		profile["campaign"] = {"chapters": {}, "resume": {}, "last_level_id": "", "world_skin": "neon_grid"}
	var camp: Dictionary = profile["campaign"]
	if not camp.has("chapters") or not (camp["chapters"] is Dictionary):
		camp["chapters"] = {}
	profile["campaign"] = camp
	return camp


func get_chapter_blob(chapter_id: StringName) -> Dictionary:
	var camp := _ensure_campaign()
	var chapters: Dictionary = camp["chapters"]
	var key := String(chapter_id)
	var blob: Variant = chapters.get(key, {})
	return blob.duplicate(true) if blob is Dictionary else {}


func get_level_stars(chapter_id: StringName, level_id: StringName) -> int:
	var ch := get_chapter_blob(chapter_id)
	var levels: Variant = ch.get("levels", {})
	if not (levels is Dictionary):
		return 0
	var entry: Variant = (levels as Dictionary).get(String(level_id), {})
	if not (entry is Dictionary):
		return 0
	return clampi(int((entry as Dictionary).get("stars", 0)), 0, 3)


func get_level_best_moves(chapter_id: StringName, level_id: StringName) -> int:
	var ch := get_chapter_blob(chapter_id)
	var levels: Variant = ch.get("levels", {})
	if not (levels is Dictionary):
		return -1
	var entry: Variant = (levels as Dictionary).get(String(level_id), {})
	if not (entry is Dictionary):
		return -1
	return int((entry as Dictionary).get("best_moves", -1))


func is_level_cleared(chapter_id: StringName, level_id: StringName) -> bool:
	return get_level_stars(chapter_id, level_id) > 0


func is_level_unlocked(chapter_id: StringName, level_ids: Array, index: int) -> bool:
	## First level unlocked; later levels unlock when the previous is cleared.
	if index <= 0:
		return true
	if index >= level_ids.size():
		return false
	var prev: StringName = level_ids[index - 1] as StringName if level_ids[index - 1] is StringName else StringName(str(level_ids[index - 1]))
	return is_level_cleared(chapter_id, prev)


func record_level_clear(
	chapter_id: StringName, level_id: StringName, stars: int, moves: int, persist: bool = true
) -> void:
	var camp := _ensure_campaign()
	var chapters: Dictionary = camp["chapters"]
	var ck := String(chapter_id)
	if not chapters.has(ck) or not (chapters[ck] is Dictionary):
		chapters[ck] = {"levels": {}}
	var ch: Dictionary = chapters[ck]
	if not ch.has("levels") or not (ch["levels"] is Dictionary):
		ch["levels"] = {}
	var levels: Dictionary = ch["levels"]
	var lk := String(level_id)
	var prev: Dictionary = levels.get(lk, {}) if levels.get(lk, {}) is Dictionary else {}
	var prev_stars := int(prev.get("stars", 0))
	var prev_best := int(prev.get("best_moves", -1))
	var next_stars := maxi(prev_stars, clampi(stars, 0, 3))
	var next_best := moves if prev_best < 0 else mini(prev_best, moves)
	levels[lk] = {"stars": next_stars, "best_moves": next_best}
	ch["levels"] = levels
	chapters[ck] = ch
	camp["chapters"] = chapters
	camp["last_level_id"] = lk
	profile["campaign"] = camp
	if persist:
		save_local()


func chapter_stars_earned(chapter_id: StringName, level_ids: Array) -> int:
	var total := 0
	for lid in level_ids:
		var id: StringName = lid as StringName if lid is StringName else StringName(str(lid))
		total += get_level_stars(chapter_id, id)
	return total


func is_chapter_complete(chapter_id: StringName, level_ids: Array) -> bool:
	if level_ids.is_empty():
		return false
	for lid in level_ids:
		var id: StringName = lid as StringName if lid is StringName else StringName(str(lid))
		if not is_level_cleared(chapter_id, id):
			return false
	return true


## --- Daily / Endless meta ---

func get_daily_blob() -> Dictionary:
	var d: Variant = profile.get("daily", {})
	return d.duplicate(true) if d is Dictionary else {}


func is_daily_completed(utc_date: String) -> bool:
	var d := get_daily_blob()
	return str(d.get("completed_utc_date", "")) == utc_date and not utc_date.is_empty()


func get_daily_best_moves() -> int:
	return int(get_daily_blob().get("best_moves", -1))


func record_daily_clear(utc_date: String, moves: int, persist: bool = true) -> void:
	if not profile.has("daily") or not (profile["daily"] is Dictionary):
		profile["daily"] = {
			"streak": 0, "last_clear_utc": "", "attempts_today": 0,
			"completed_utc_date": "", "best_moves": -1,
		}
	var daily: Dictionary = profile["daily"]
	var prev_date := str(daily.get("completed_utc_date", ""))
	var prev_best := int(daily.get("best_moves", -1))
	daily["completed_utc_date"] = utc_date
	daily["last_clear_utc"] = utc_date
	if prev_best < 0 or moves < prev_best or prev_date != utc_date:
		daily["best_moves"] = moves
	## Streak: consecutive UTC dates (simple +1 when new day after prior clear).
	if prev_date != utc_date:
		daily["streak"] = int(daily.get("streak", 0)) + 1
	profile["daily"] = daily
	if persist:
		save_local()


func bump_daily_attempt(persist: bool = true) -> void:
	if not profile.has("daily") or not (profile["daily"] is Dictionary):
		profile["daily"] = {"streak": 0, "last_clear_utc": "", "attempts_today": 0, "completed_utc_date": "", "best_moves": -1}
	profile["daily"]["attempts_today"] = int(profile["daily"].get("attempts_today", 0)) + 1
	if persist:
		save_local()


func get_endless_wave_best() -> int:
	var e: Variant = profile.get("endless", {})
	return int(e.get("wave_best", 0)) if e is Dictionary else 0


func record_endless_wave(wave: int, seed_value: int, persist: bool = true) -> void:
	if not profile.has("endless") or not (profile["endless"] is Dictionary):
		profile["endless"] = {"wave_best": 0, "last_seed": 0}
	var end: Dictionary = profile["endless"]
	end["last_seed"] = seed_value
	if wave > int(end.get("wave_best", 0)):
		end["wave_best"] = wave
	profile["endless"] = end
	if persist:
		save_local()


func _apply_remote_payload(payload: PackedByteArray) -> bool:
	if payload.is_empty():
		return false
	var text := payload.get_string_from_utf8()
	var parsed: Variant = JSON.parse_string(text)
	if not (parsed is Dictionary):
		return false
	var migrated := SaveMigrator.migrate(parsed)
	if not migrated["ok"]:
		return false
	profile = migrated["data"]
	save_local()
	profile_loaded.emit(profile)
	return true


func _path(slot: String) -> String:
	return SAVE_DIR + "profile_%s.json" % slot.replace("/", "_")


func _read_json(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {}
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	return parsed if parsed is Dictionary else {}
