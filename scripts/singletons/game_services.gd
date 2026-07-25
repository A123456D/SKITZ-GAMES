extends Node
## Autoload: wires platform + save + meta services for the whole app.
## Access as `GameServices` from anywhere.

var gateway: PlatformGateway
var save: SaveService
var achievements: AchievementService
var leaderboards: LeaderboardService
var locale: LocaleService
var analytics: AnalyticsService
var crash: CrashService
var privacy: PrivacyConsent
var remap: InputRemapProfile

var _booted: bool = false
## When true, next concept play slice restores SaveService resume payload.
var launch_resume: bool = false
## Consumed by ConceptPlaySlice: {mode, seed, difficulty, date, ranked, wave, puzzle?, chapter_id?, level_id?}.
## mode: "concept" | "campaign" | "daily" | "endless"
var launch_play: Dictionary = {}


func set_launch_play(payload: Dictionary) -> void:
	launch_play = payload.duplicate(true) if not payload.is_empty() else {}
	launch_resume = false


func consume_launch_play() -> Dictionary:
	var out := launch_play.duplicate(true)
	launch_play = {}
	return out


func _ready() -> void:
	bootstrap()


func bootstrap() -> void:
	if _booted:
		return
	gateway = PlatformGateway.new()
	gateway.name = "PlatformGateway"
	add_child(gateway)
	gateway.bootstrap()

	save = SaveService.new()
	save.configure(gateway)
	save.load_or_create()

	privacy = PrivacyConsent.new()
	privacy.configure(save)

	cloud_pref_from_save()

	achievements = AchievementService.new()
	achievements.configure(gateway, save)
	achievements.load_builtin_gdd_set()

	leaderboards = LeaderboardService.new()
	leaderboards.configure(gateway, save)

	locale = LocaleService.new()
	locale.configure(save)
	locale.bootstrap()

	analytics = AnalyticsService.new()
	analytics.configure(gateway, privacy)

	crash = CrashService.new()
	crash.configure(gateway, privacy)
	crash.bootstrap()

	remap = InputRemapProfile.make_default()
	# Do not erase project.godot bindings on boot — remap UI can call apply later.

	_booted = true
	if not privacy.needs_gate():
		analytics.session_start()
	crash.breadcrumb("boot", "GameServices ready", {"adapter": String(gateway.platform_id())})


func cloud_pref_from_save() -> void:
	if save and save.profile.has("cloud"):
		save.cloud_sync_enabled = bool(save.profile["cloud"].get("sync_enabled", true))


func set_cloud_sync(enabled: bool) -> void:
	save.cloud_sync_enabled = enabled
	if not save.profile.has("cloud"):
		save.profile["cloud"] = {}
	save.profile["cloud"]["sync_enabled"] = enabled
	save.save_local()


func persist_settings(settings: UiSettingsState) -> void:
	save.write_settings_to_profile(settings)
	save.save_local()


func hydrate_settings(settings: UiSettingsState) -> void:
	save.apply_settings_from_profile(settings)
