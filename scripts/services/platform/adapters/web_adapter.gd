class_name WebPlatformAdapter
extends IPlatformServices
## HTML5 / PWA adapter. Cloud = LocalFileCloudBackend (IDBFS / user://).
## Optional future: PlayFab / custom REST behind same IPlatformServices methods.

var _cloud: LocalFileCloudBackend = LocalFileCloudBackend.new()


func platform_id() -> StringName:
	return &"web"


func is_signed_in() -> bool:
	return false


func unlock_achievement(_achievement_id: StringName, _percent: float = 100.0) -> Error:
	return OK # Local AchievementService persists; no web achievement host by default.


func set_achievement_progress(_achievement_id: StringName, _current: int, _target: int) -> Error:
	return OK


func submit_score(_board_id: StringName, _score: int, _meta: Dictionary = {}) -> Error:
	return OK


func fetch_scores(_board_id: StringName, _friends_only: bool = false, _limit: int = 20) -> Array:
	return []


func upload_cloud_save(slot: String, payload: PackedByteArray, meta: Dictionary) -> Error:
	return _cloud.upload(slot, payload, meta)


func download_cloud_save(slot: String) -> Dictionary:
	return _cloud.download(slot)


func log_analytics(event_name: String, props: Dictionary = {}) -> void:
	# Optional: JavaScriptBridge → plausible / custom endpoint when privacy allows.
	if OS.is_debug_build():
		print("[web-analytics] ", event_name, " ", props)


func report_crash(message: String, stack: String = "", fatal: bool = false) -> void:
	push_error("[WebAdapter] %s\n%s" % [message, stack])


func add_breadcrumb(category: String, message: String, data: Dictionary = {}) -> void:
	if OS.is_debug_build():
		print("[web-bc:%s] %s %s" % [category, message, data])
