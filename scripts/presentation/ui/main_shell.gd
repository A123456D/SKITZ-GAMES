class_name MainShell
extends Control
## Production UI host — AestheticRoot + UiFeel + UiRouter stack.

@onready var aesthetic: AestheticRoot = $AestheticRoot
@onready var stack_host: Control = %StackHost

var _tokens: DesignTokens
var _feel: ShiftFeelConfig
var _settings: UiSettingsState
var _router: UiRouter
var _ui_feel: UiFeel
var _satisfaction: SatisfactionDirector


func _ready() -> void:
	_tokens = load("res://resources/configs/visual/default_design_tokens.tres") as DesignTokens
	if _tokens == null:
		_tokens = DesignTokens.new()
	_feel = (load("res://resources/configs/feel/default_shift_feel.tres") as ShiftFeelConfig)
	if _feel:
		_feel = _feel.duplicate(true) as ShiftFeelConfig
	else:
		_feel = ShiftFeelConfig.new()

	_settings = UiSettingsState.new()
	var gs := get_node_or_null("/root/GameServices")
	if gs:
		gs.hydrate_settings(_settings)
	aesthetic.tokens = _tokens
	aesthetic.feel_config = _feel
	aesthetic.quality = (load("res://resources/configs/visual/quality_high.tres") as VisualQualityConfig).duplicate(true) as VisualQualityConfig
	aesthetic.apply_aesthetic()
	theme = aesthetic.director.get_theme()

	_bootstrap_feel()
	_bootstrap_router()
	if gs and gs.achievements and _router.catalog:
		gs.achievements.load_defs_from_catalog(_router.catalog.achievements)

	var audio := get_tree().root.get_node_or_null("Audio") as AudioDirector
	_settings.apply_audio(audio)
	_settings.apply_visual(aesthetic.director, _feel, aesthetic.transition)
	if audio:
		audio.configure_feel(_feel)
		audio.music_set_state(AdaptiveMusicPlayer.MusicState.EXPLORE)

	await _router.start(UiRouter.SCREEN_MAIN)
	if gs and gs.privacy and gs.privacy.needs_gate():
		_show_privacy_gate()
	# Dev overlay (F3). Safe no-op when tools flag / editor feature absent.
	if PerfOverlay.should_allow():
		var overlay := PerfOverlay.new()
		overlay.name = "PerfOverlay"
		add_child(overlay)


func _show_privacy_gate() -> void:
	var packed := load("res://scenes/ui/screens/privacy_consent_screen.tscn") as PackedScene
	if packed == null:
		return
	var gate := packed.instantiate()
	gate.z_index = 100
	add_child(gate)


func _bootstrap_feel() -> void:
	_satisfaction = SatisfactionDirector.new()
	_satisfaction.name = "Satisfaction"
	add_child(_satisfaction)
	_satisfaction.setup(_feel, SatisfactionCatalog.load_or_builtin(), aesthetic.quality)
	_satisfaction.visual_director = aesthetic.director

	_ui_feel = UiFeel.new()
	_ui_feel.name = "UiFeel"
	add_child(_ui_feel)
	_ui_feel.setup(_satisfaction, _feel)


func _bootstrap_router() -> void:
	_router = UiRouter.new()
	_router.name = "UiRouter"
	_router.tokens = _tokens
	add_child(_router)
	_router.configure(aesthetic, _ui_feel, _feel, _settings, stack_host)
