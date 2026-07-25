class_name SteamPlatformAdapter
extends IPlatformServices
## Steamworks extension points. Does NOT call Steam APIs until a GDExtension /
## GodotSteam (or similar) plugin is present and FeatureFlags / steam feature tag
## enable it. Until then, achievements/scores fall through to local services;
## cloud uses LocalFileCloudBackend.

## Wire after installing GodotSteam (or your Steamworks GDExtension):
##   1. Enable plugin; set steam_app_id via env STEAM_APP_ID or export user override.
##   2. Replace _steam_available() body to return true when Steam.isSteamRunning().
##  3. Implement _steam_unlock / _steam_set_stat / _steam_leaderboard_* below.

var _cloud: LocalFileCloudBackend = LocalFileCloudBackend.new()
var _signed_in: bool = false


func platform_id() -> StringName:
	return &"steam"


func is_signed_in() -> bool:
	return _signed_in and _steam_available()


func sign_in() -> Error:
	if not _steam_available():
		return ERR_UNAVAILABLE
	# Extension point: Steam.steamInit / request user stats
	_signed_in = true
	signed_in_changed.emit(true)
	return OK


func sign_out() -> void:
	_signed_in = false
	signed_in_changed.emit(false)


func unlock_achievement(achievement_id: StringName, percent: float = 100.0) -> Error:
	if not _steam_available():
		return ERR_UNAVAILABLE
	return _steam_unlock(achievement_id, percent)


func set_achievement_progress(achievement_id: StringName, current: int, target: int) -> Error:
	if not _steam_available():
		return ERR_UNAVAILABLE
	return _steam_set_stat(achievement_id, current, target)


func submit_score(board_id: StringName, score: int, meta: Dictionary = {}) -> Error:
	if not _steam_available():
		return ERR_UNAVAILABLE
	return _steam_submit_score(board_id, score, meta)


func fetch_scores(board_id: StringName, friends_only: bool = false, limit: int = 20) -> Array:
	if not _steam_available():
		return []
	return _steam_fetch_scores(board_id, friends_only, limit)


func upload_cloud_save(slot: String, payload: PackedByteArray, meta: Dictionary) -> Error:
	if _steam_available():
		var err := _steam_cloud_write(slot, payload, meta)
		if err == OK:
			return OK
	# Always keep a local mirror so saves work without Steam Cloud quota / offline.
	return _cloud.upload(slot, payload, meta)


func download_cloud_save(slot: String) -> Dictionary:
	if _steam_available():
		var remote := _steam_cloud_read(slot)
		if remote.get("ok", false):
			return remote
	return _cloud.download(slot)


func log_analytics(event_name: String, props: Dictionary = {}) -> void:
	# Optional: Steam timeline / partner analytics — leave empty unless approved.
	if OS.is_debug_build():
		print("[steam-analytics] ", event_name, " ", props)


func report_crash(message: String, stack: String = "", fatal: bool = false) -> void:
	# Prefer Sentry/Crashlytics via CrashService; Steam has no general crash API.
	push_error("[SteamAdapter crash hook] %s\n%s" % [message, stack])
	if fatal:
		pass


func add_breadcrumb(category: String, message: String, data: Dictionary = {}) -> void:
	if OS.is_debug_build():
		print("[steam-bc:%s] %s %s" % [category, message, data])


# --- Extension points (implement when SDK is linked) ---

func _steam_available() -> bool:
	# return ClassDB.class_exists("Steam") and Steam.isSteamRunning()
	return false


func _steam_unlock(_id: StringName, _percent: float) -> Error:
	# Steam.setAchievement(String(id)); Steam.storeStats()
	return ERR_UNAVAILABLE


func _steam_set_stat(_id: StringName, _current: int, _target: int) -> Error:
	# Steam.setStatInt / indicateAchievementProgress
	return ERR_UNAVAILABLE


func _steam_submit_score(_board_id: StringName, _score: int, _meta: Dictionary) -> Error:
	# Steam.findLeaderboard → uploadLeaderboardScore
	return ERR_UNAVAILABLE


func _steam_fetch_scores(_board_id: StringName, _friends: bool, _limit: int) -> Array:
	return []


func _steam_cloud_write(_slot: String, _payload: PackedByteArray, _meta: Dictionary) -> Error:
	# Steam.fileWrite(slot, payload)
	return ERR_UNAVAILABLE


func _steam_cloud_read(_slot: String) -> Dictionary:
	# Steam.fileRead → { ok, payload, meta }
	return {"ok": false, "payload": PackedByteArray(), "meta": {}, "error": "steam_sdk_missing"}
