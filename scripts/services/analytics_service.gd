class_name AnalyticsService
extends RefCounted
## Buffered, privacy-gated analytics. Flushes to PlatformGateway when opted in.

signal flushed(count: int)

const MAX_BUFFER := 64

var gateway: PlatformGateway = null
var privacy: PrivacyConsent = null
var _buffer: Array[Dictionary] = []
var session_id: String = ""


func configure(p_gateway: PlatformGateway, p_privacy: PrivacyConsent) -> void:
	gateway = p_gateway
	privacy = p_privacy
	session_id = _new_session_id()


func track(event_name: String, props: Dictionary = {}) -> void:
	if privacy and not privacy.analytics_allowed():
		return
	if gateway and gateway.flags and not gateway.flags.analytics:
		return
	var row := {
		"e": event_name,
		"t": int(Time.get_unix_time_from_system()),
		"s": session_id,
		"p": props.duplicate(true),
	}
	_buffer.append(row)
	if _buffer.size() >= MAX_BUFFER:
		flush()


func flush() -> void:
	if _buffer.is_empty():
		return
	if privacy and not privacy.analytics_allowed():
		_buffer.clear()
		return
	var n := _buffer.size()
	for row in _buffer:
		if gateway:
			gateway.log_analytics(str(row.get("e", "")), {
				"t": row.get("t", 0),
				"s": row.get("s", ""),
				"props": row.get("p", {}),
			})
	_buffer.clear()
	flushed.emit(n)
	if gateway:
		gateway.flush()


func session_start() -> void:
	track(AnalyticsEvents.SESSION_START, {"platform": OS.get_name()})


func level_start(level_id: String, mode: String) -> void:
	track(AnalyticsEvents.LEVEL_START, {"level_id": level_id, "mode": mode})


func level_clear(level_id: String, moves: int, stars: int) -> void:
	track(AnalyticsEvents.LEVEL_CLEAR, {"level_id": level_id, "moves": moves, "stars": stars})


func level_fail(level_id: String, moves: int) -> void:
	track(AnalyticsEvents.LEVEL_FAIL, {"level_id": level_id, "moves": moves})


func _new_session_id() -> String:
	return "%d_%d" % [Time.get_unix_time_from_system(), randi() % 100000]
