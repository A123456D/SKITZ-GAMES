class_name FeatureFlags
extends RefCounted
## Per-export capability gates. Adapters honor these; NullAdapter ignores missing SDKs.

var achievements: bool = true
var leaderboards: bool = true
var cloud_save: bool = true
var analytics: bool = true
var crash_reporting: bool = true
var auth: bool = false
var controller_glyphs: bool = true
var privacy_gate: bool = true


static func for_current_platform() -> FeatureFlags:
	var f := FeatureFlags.new()
	var os := OS.get_name()
	match os:
		"Windows", "Linux", "macOS", "FreeBSD", "NetBSD", "OpenBSD", "BSD":
			# Desktop Steam path when Steamworks plugin is present; local otherwise.
			f.auth = false
			f.cloud_save = true
			f.controller_glyphs = true
		"Android":
			f.auth = true
			f.cloud_save = true
			f.controller_glyphs = true
		"iOS":
			f.auth = true
			f.cloud_save = true
			f.controller_glyphs = true
		"Web":
			f.auth = false
			f.cloud_save = true # IndexedDB / local file backend until PlayFab etc.
			f.crash_reporting = false # browser-native; see CrashService docs
			f.controller_glyphs = true
		_:
			pass
	if OS.has_feature("steam"):
		f.auth = true
		f.cloud_save = true
	if OS.has_feature("demo"):
		f.analytics = false
	return f


func to_dict() -> Dictionary:
	return {
		"achievements": achievements,
		"leaderboards": leaderboards,
		"cloud_save": cloud_save,
		"analytics": analytics,
		"crash_reporting": crash_reporting,
		"auth": auth,
		"controller_glyphs": controller_glyphs,
		"privacy_gate": privacy_gate,
	}
