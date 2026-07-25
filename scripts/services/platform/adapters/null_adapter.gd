class_name NullPlatformAdapter
extends IPlatformServices
## Dev / CI default. Achievements & leaderboards are local-only via services;
## cloud uses LocalFileCloudBackend when wired by PlatformGateway.


func platform_id() -> StringName:
	return &"null"


func unlock_achievement(_achievement_id: StringName, _percent: float = 100.0) -> Error:
	return OK


func set_achievement_progress(_achievement_id: StringName, _current: int, _target: int) -> Error:
	return OK


func submit_score(_board_id: StringName, _score: int, _meta: Dictionary = {}) -> Error:
	return OK


func fetch_scores(_board_id: StringName, _friends_only: bool = false, _limit: int = 20) -> Array:
	return []


func upload_cloud_save(_slot: String, _payload: PackedByteArray, _meta: Dictionary) -> Error:
	return ERR_UNAVAILABLE


func download_cloud_save(_slot: String) -> Dictionary:
	return {"ok": false, "payload": PackedByteArray(), "meta": {}, "error": "null_adapter"}


func log_analytics(_event_name: String, _props: Dictionary = {}) -> void:
	pass


func report_crash(message: String, stack: String = "", fatal: bool = false) -> void:
	if OS.is_debug_build():
		push_warning("[NullCrash] %s fatal=%s\n%s" % [message, fatal, stack])


func add_breadcrumb(category: String, message: String, _data: Dictionary = {}) -> void:
	if OS.is_debug_build():
		print("[breadcrumb:%s] %s" % [category, message])
