class_name GameCenterPlatformAdapter
extends IPlatformServices
## Apple Game Center extension points (iOS / macOS).
## Plugin: GodotGameCenter or custom StoreKit / GameKit bridge.
## Local backends remain authoritative until the plugin is linked.

var _cloud: LocalFileCloudBackend = LocalFileCloudBackend.new()
var _signed_in: bool = false


func platform_id() -> StringName:
	return &"game_center"


func is_signed_in() -> bool:
	return _signed_in and _gc_available()


func sign_in() -> Error:
	if not _gc_available():
		return ERR_UNAVAILABLE
	_signed_in = true
	signed_in_changed.emit(true)
	return OK


func sign_out() -> void:
	_signed_in = false
	signed_in_changed.emit(false)


func unlock_achievement(achievement_id: StringName, percent: float = 100.0) -> Error:
	if not _gc_available():
		return ERR_UNAVAILABLE
	return _gc_unlock(achievement_id, percent)


func set_achievement_progress(achievement_id: StringName, current: int, target: int) -> Error:
	if not _gc_available():
		return ERR_UNAVAILABLE
	return _gc_progress(achievement_id, current, target)


func submit_score(board_id: StringName, score: int, meta: Dictionary = {}) -> Error:
	if not _gc_available():
		return ERR_UNAVAILABLE
	return _gc_submit(board_id, score, meta)


func fetch_scores(board_id: StringName, friends_only: bool = false, limit: int = 20) -> Array:
	if not _gc_available():
		return []
	return _gc_fetch(board_id, friends_only, limit)


func upload_cloud_save(slot: String, payload: PackedByteArray, meta: Dictionary) -> Error:
	if _gc_available():
		var err := _gc_icloud_write(slot, payload, meta)
		if err == OK:
			return OK
	return _cloud.upload(slot, payload, meta)


func download_cloud_save(slot: String) -> Dictionary:
	if _gc_available():
		var remote := _gc_icloud_read(slot)
		if remote.get("ok", false):
			return remote
	return _cloud.download(slot)


func log_analytics(event_name: String, props: Dictionary = {}) -> void:
	if OS.is_debug_build():
		print("[gc-analytics] ", event_name, " ", props)


func report_crash(message: String, stack: String = "", fatal: bool = false) -> void:
	push_error("[GameCenterAdapter] %s\n%s" % [message, stack])


func add_breadcrumb(category: String, message: String, data: Dictionary = {}) -> void:
	if OS.is_debug_build():
		print("[gc-bc:%s] %s %s" % [category, message, data])


func _gc_available() -> bool:
	return false


func _gc_unlock(_id: StringName, _percent: float) -> Error:
	return ERR_UNAVAILABLE


func _gc_progress(_id: StringName, _current: int, _target: int) -> Error:
	return ERR_UNAVAILABLE


func _gc_submit(_board_id: StringName, _score: int, _meta: Dictionary) -> Error:
	return ERR_UNAVAILABLE


func _gc_fetch(_board_id: StringName, _friends: bool, _limit: int) -> Array:
	return []


func _gc_icloud_write(_slot: String, _payload: PackedByteArray, _meta: Dictionary) -> Error:
	return ERR_UNAVAILABLE


func _gc_icloud_read(_slot: String) -> Dictionary:
	return {"ok": false, "payload": PackedByteArray(), "meta": {}, "error": "gc_sdk_missing"}
