class_name PlatformGateway
extends Node
## Facade over IPlatformServices. Pick adapter from OS / feature tags.
## Gameplay code only talks to this node (via GameServices autoload).

signal signed_in_changed(signed_in: bool)
signal cloud_conflict(local_meta: Dictionary, remote_meta: Dictionary)

var flags: FeatureFlags = FeatureFlags.new()
var adapter: IPlatformServices = null
var local_cloud: LocalFileCloudBackend = LocalFileCloudBackend.new()

var _forced_adapter_id: StringName = &""


func bootstrap(force_adapter: StringName = &"") -> void:
	flags = FeatureFlags.for_current_platform()
	_forced_adapter_id = force_adapter
	adapter = _create_adapter()
	if adapter and not adapter.signed_in_changed.is_connected(_on_signed_in):
		adapter.signed_in_changed.connect(_on_signed_in)
	if adapter and not adapter.cloud_conflict.is_connected(_on_cloud_conflict):
		adapter.cloud_conflict.connect(_on_cloud_conflict)


func platform_id() -> StringName:
	return adapter.platform_id() if adapter else &"null"


func is_signed_in() -> bool:
	return adapter != null and adapter.is_signed_in()


func sign_in() -> Error:
	if adapter == null or not flags.auth:
		return ERR_UNAVAILABLE
	return adapter.sign_in()


func sign_out() -> void:
	if adapter:
		adapter.sign_out()


func unlock_achievement(achievement_id: StringName, percent: float = 100.0) -> Error:
	if not flags.achievements or adapter == null:
		return ERR_UNAVAILABLE
	return adapter.unlock_achievement(achievement_id, percent)


func set_achievement_progress(achievement_id: StringName, current: int, target: int) -> Error:
	if not flags.achievements or adapter == null:
		return ERR_UNAVAILABLE
	return adapter.set_achievement_progress(achievement_id, current, target)


func submit_score(board_id: StringName, score: int, meta: Dictionary = {}) -> Error:
	if not flags.leaderboards or adapter == null:
		return ERR_UNAVAILABLE
	return adapter.submit_score(board_id, score, meta)


func fetch_scores(board_id: StringName, friends_only: bool = false, limit: int = 20) -> Array:
	if not flags.leaderboards or adapter == null:
		return []
	return adapter.fetch_scores(board_id, friends_only, limit)


func upload_cloud_save(slot: String, payload: PackedByteArray, meta: Dictionary) -> Error:
	if not flags.cloud_save:
		return ERR_UNAVAILABLE
	if adapter:
		var err := adapter.upload_cloud_save(slot, payload, meta)
		if err == OK:
			return OK
	return local_cloud.upload(slot, payload, meta)


func download_cloud_save(slot: String) -> Dictionary:
	if not flags.cloud_save:
		return {"ok": false, "payload": PackedByteArray(), "meta": {}, "error": "flag_off"}
	if adapter:
		var remote := adapter.download_cloud_save(slot)
		if remote.get("ok", false):
			return remote
	return local_cloud.download(slot)


func log_analytics(event_name: String, props: Dictionary = {}) -> void:
	if not flags.analytics or adapter == null:
		return
	adapter.log_analytics(event_name, props)


func report_crash(message: String, stack: String = "", fatal: bool = false) -> void:
	if not flags.crash_reporting or adapter == null:
		return
	adapter.report_crash(message, stack, fatal)


func add_breadcrumb(category: String, message: String, data: Dictionary = {}) -> void:
	if adapter:
		adapter.add_breadcrumb(category, message, data)


func flush() -> void:
	if adapter:
		adapter.flush()


func _create_adapter() -> IPlatformServices:
	var id := _forced_adapter_id
	if id == &"":
		id = _detect_adapter_id()
	match id:
		&"steam":
			return SteamPlatformAdapter.new()
		&"google_play":
			return GooglePlayPlatformAdapter.new()
		&"game_center":
			return GameCenterPlatformAdapter.new()
		&"web":
			return WebPlatformAdapter.new()
		_:
			return NullPlatformAdapter.new()


func _detect_adapter_id() -> StringName:
	if OS.has_feature("steam"):
		return &"steam"
	if OS.has_feature("web"):
		return &"web"
	match OS.get_name():
		"Android":
			return &"google_play"
		"iOS":
			return &"game_center"
		"Windows", "Linux", "macOS":
			# Prefer Steam when feature tag set; otherwise null (local backends).
			return &"null"
		_:
			return &"null"


func _on_signed_in(v: bool) -> void:
	signed_in_changed.emit(v)


func _on_cloud_conflict(local_meta: Dictionary, remote_meta: Dictionary) -> void:
	cloud_conflict.emit(local_meta, remote_meta)
