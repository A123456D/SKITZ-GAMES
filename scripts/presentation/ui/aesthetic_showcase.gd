class_name AestheticShowcase
extends Control
## Visual identity lab — tokens, glass, glow, transitions, quality tiers.

@onready var aesthetic: AestheticRoot = $AestheticRoot
@onready var hud_host: Control = %HudHost
@onready var demo_panel: Panel = %DemoPanel
@onready var status: Label = %StatusLabel
@onready var cta_row: HBoxContainer = %CtaRow
@onready var tier_row: HBoxContainer = %TierRow
@onready var icon_row: HBoxContainer = %IconRow

var _tokens: DesignTokens
var _hud: MinimalHud
var _glass_btn: GlassButton


func _ready() -> void:
	_tokens = load("res://resources/configs/visual/default_design_tokens.tres") as DesignTokens
	if _tokens == null:
		_tokens = DesignTokens.new()
	aesthetic.tokens = _tokens
	aesthetic.quality = (load("res://resources/configs/visual/quality_high.tres") as VisualQualityConfig).duplicate(true) as VisualQualityConfig
	aesthetic.apply_aesthetic()
	theme = aesthetic.director.get_theme()
	_build_hud()
	_build_kit()
	_style_panel()
	status.text = "High · luminous precision"
	var audio := get_tree().root.get_node_or_null("Audio") as AudioDirector
	if audio:
		audio.music_set_state(AdaptiveMusicPlayer.MusicState.THINK)
	# Soft intro uncover.
	if aesthetic.transition:
		aesthetic.transition.tokens = _tokens
		aesthetic.transition.prepare_covered()
		await aesthetic.transition.uncover(ScreenTransition.Mode.SHIFT)


func _build_hud() -> void:
	var packed := load("res://scenes/ui/hud/minimal_hud.tscn") as PackedScene
	if packed == null:
		return
	_hud = packed.instantiate() as MinimalHud
	hud_host.add_child(_hud)
	_hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_hud.configure(_tokens, false)
	_hud.set_title("SHIFTR")
	_hud.set_subtitle("aesthetic showcase")
	_hud.set_budget(0, 0)
	_hud.undo_pressed.connect(_on_confirm.bind("Undo"))
	_hud.hint_pressed.connect(_on_confirm.bind("Hint"))
	_hud.pause_pressed.connect(_on_confirm.bind("Pause"))


func _build_kit() -> void:
	_glass_btn = GlassButton.new()
	_glass_btn.text = "Confirm"
	_glass_btn.tokens = _tokens
	_glass_btn.pressed.connect(_on_confirm.bind("Confirm"))
	cta_row.add_child(_glass_btn)

	var secondary := GlassButton.new()
	secondary.text = "Transition"
	secondary.tokens = _tokens
	secondary.pressed.connect(_play_transition)
	cta_row.add_child(secondary)

	for label_tier in ["High", "Med", "Low"]:
		var b := GlassButton.new()
		b.text = label_tier
		b.tokens = _tokens
		b.custom_minimum_size = Vector2(96, 48)
		var tier_name := label_tier
		b.pressed.connect(func() -> void: _set_tier(tier_name))
		tier_row.add_child(b)

	var reduce := GlassButton.new()
	reduce.text = "Reduce motion"
	reduce.tokens = _tokens
	reduce.pressed.connect(_toggle_reduce)
	tier_row.add_child(reduce)

	for glyph in ["↺", "✦", "☰"]:
		var ib := IconButtonFx.new()
		ib.tokens = _tokens
		ib.icon_text = glyph
		ib.enable_shimmer = glyph == "✦"
		ib.pressed.connect(_on_confirm.bind("Icon " + glyph))
		icon_row.add_child(ib)


func _style_panel() -> void:
	if demo_panel is GlassPanel:
		(demo_panel as GlassPanel).configure(_tokens, aesthetic.quality)
	elif demo_panel and _tokens:
		demo_panel.add_theme_stylebox_override("panel", _tokens.make_panel_style())


func _set_tier(name: String) -> void:
	var tier := VisualQualityConfig.Tier.HIGH
	match name:
		"Med":
			tier = VisualQualityConfig.Tier.MEDIUM
		"Low":
			tier = VisualQualityConfig.Tier.LOW
		_:
			tier = VisualQualityConfig.Tier.HIGH
	aesthetic.set_tier(tier)
	theme = aesthetic.director.get_theme()
	_style_panel()
	status.text = "%s · luminous precision" % name


func _toggle_reduce() -> void:
	var on := not aesthetic.quality.reduce_motion
	aesthetic.director.set_reduce_motion(on)
	if _hud:
		_hud.configure(_tokens, on)
	status.text = "Reduce motion %s" % ("ON" if on else "OFF")


func _play_transition() -> void:
	await aesthetic.transition.cover(ScreenTransition.Mode.WIPE)
	await get_tree().create_timer(0.12).timeout
	await aesthetic.transition.uncover(ScreenTransition.Mode.SHIFT)
	status.text = "Transition complete"


func _on_confirm(what: String) -> void:
	status.text = what
	var center := get_viewport().get_visible_rect().size * 0.5
	if _glass_btn:
		center = _glass_btn.get_global_rect().get_center()
		_play_ui_feel(_glass_btn)
	aesthetic.director.spawn_ui_confirm(center)


func _play_ui_feel(control: Control) -> void:
	var ui := get_node_or_null("UiFeel") as UiFeel
	if ui == null:
		ui = UiFeel.new()
		ui.name = "UiFeel"
		add_child(ui)
		var sat := SatisfactionDirector.new()
		sat.name = "Satisfaction"
		add_child(sat)
		sat.setup(ShiftFeelConfig.new(), SatisfactionCatalog.load_or_builtin(), aesthetic.quality if aesthetic else null)
		sat.visual_director = aesthetic.director if aesthetic else null
		ui.setup(sat)
	ui.button_press(control)
