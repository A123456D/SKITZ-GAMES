class_name CrashService
extends RefCounted
## Bootstrap crash/breadcrumb hook. Real Sentry / Firebase Crashlytics plugs in
## via PlatformGateway.adapter.report_crash once the plugin is added.

const MAX_BREADCRUMBS := 40

var gateway: PlatformGateway = null
var privacy: PrivacyConsent = null
var _breadcrumbs: Array[Dictionary] = []


func configure(p_gateway: PlatformGateway, p_privacy: PrivacyConsent) -> void:
	gateway = p_gateway
	privacy = p_privacy


func bootstrap() -> void:
	## Install debug print handler breadcrumbs; production plugins override report().
	breadcrumb("boot", "CrashService ready", {"os": OS.get_name()})


func breadcrumb(category: String, message: String, data: Dictionary = {}) -> void:
	var row := {
		"c": category,
		"m": message,
		"t": int(Time.get_unix_time_from_system()),
		"d": data.duplicate(true),
	}
	_breadcrumbs.append(row)
	while _breadcrumbs.size() > MAX_BREADCRUMBS:
		_breadcrumbs.remove_at(0)
	if gateway:
		gateway.add_breadcrumb(category, message, data)


func report(message: String, fatal: bool = false) -> void:
	if privacy and not privacy.crash_allowed():
		return
	var stack := _format_breadcrumbs()
	if gateway:
		gateway.report_crash(message, stack, fatal)
	else:
		push_error("[CrashService] %s\n%s" % [message, stack])


func _format_breadcrumbs() -> String:
	var lines: PackedStringArray = PackedStringArray()
	for b in _breadcrumbs:
		lines.append("%s [%s] %s" % [str(b.get("t", 0)), str(b.get("c", "")), str(b.get("m", ""))])
	return "\n".join(lines)
