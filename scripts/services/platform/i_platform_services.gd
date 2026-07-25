class_name IPlatformServices
extends RefCounted
## App-facing platform contract. Concrete adapters implement these methods.
## Never call Steamworks / Play Games / Game Center APIs from gameplay code —
## always go through PlatformGateway → adapter.

signal signed_in_changed(signed_in: bool)
signal cloud_conflict(local_meta: Dictionary, remote_meta: Dictionary)
signal achievement_unlocked(achievement_id: StringName)
signal leaderboard_updated(board_id: StringName)


func platform_id() -> StringName:
	return &"null"


func is_signed_in() -> bool:
	return false


func sign_in() -> Error:
	return ERR_UNAVAILABLE


func sign_out() -> void:
	pass


func unlock_achievement(achievement_id: StringName, percent: float = 100.0) -> Error:
	return OK


func set_achievement_progress(achievement_id: StringName, current: int, target: int) -> Error:
	return OK


func submit_score(board_id: StringName, score: int, meta: Dictionary = {}) -> Error:
	return OK


func fetch_scores(board_id: StringName, friends_only: bool = false, limit: int = 20) -> Array:
	## Returns Array of Dictionaries: { rank, player_name, score, time_sec, is_self, is_friend }
	return []


func upload_cloud_save(slot: String, payload: PackedByteArray, meta: Dictionary) -> Error:
	return OK


func download_cloud_save(slot: String) -> Dictionary:
	## { ok: bool, payload: PackedByteArray, meta: Dictionary, error: String }
	return {"ok": false, "payload": PackedByteArray(), "meta": {}, "error": "unavailable"}


func log_analytics(event_name: String, props: Dictionary = {}) -> void:
	pass


func report_crash(message: String, stack: String = "", fatal: bool = false) -> void:
	pass


func add_breadcrumb(category: String, message: String, data: Dictionary = {}) -> void:
	pass


func flush() -> void:
	pass
