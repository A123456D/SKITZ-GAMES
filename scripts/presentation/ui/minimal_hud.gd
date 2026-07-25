class_name MinimalHud
extends Control
## Concept play HUD: LEVEL centered, glass action pads, circular moves dial.

signal undo_pressed
signal restart_pressed
signal hint_pressed
signal levels_pressed
signal help_pressed
signal menu_pressed
## Kept for aesthetic_showcase / older callers.
signal pause_pressed

@export var tokens: DesignTokens

var title_label: Label
var budget_label: Label
var subtitle_label: Label
var _dial: MovesDial
var _undo: IconButtonFx
var _restart: IconButtonFx
var _hint: IconButtonFx
var _levels: IconButtonFx
var _help: IconButtonFx
var _menu: IconButtonFx
var _top: MarginContainer
var _bottom: MarginContainer


func _ready() -> void:
	if tokens == null:
		tokens = _load_tokens()
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_if_needed()
	_style_labels()
	_wire_actions()
	_apply_safe_margins()
	var win := get_window()
	if win and not win.size_changed.is_connected(_apply_safe_margins):
		win.size_changed.connect(_apply_safe_margins)


func configure(p_tokens: DesignTokens, reduce_motion: bool = false) -> void:
	tokens = p_tokens
	_build_if_needed()
	_style_labels()
	_apply_safe_margins()
	if _dial:
		_dial.configure(tokens)
	for b in [_undo, _restart, _hint, _levels, _help, _menu]:
		if b:
			b.configure(tokens, reduce_motion)


func set_title(text: String) -> void:
	if title_label:
		title_label.text = text


func set_subtitle(text: String) -> void:
	if subtitle_label:
		subtitle_label.text = text


func set_budget(moves: int, par: int = -1) -> void:
	if _dial:
		_dial.set_moves(moves, par)
	if budget_label:
		if par >= 0:
			budget_label.text = "%d  ·  best %d" % [moves, par]
		else:
			budget_label.text = "%d" % moves


func set_level(level_index: int) -> void:
	set_title("LEVEL %d" % level_index)


func _build_if_needed() -> void:
	if get_node_or_null("TopBar") != null and title_label != null:
		return
	# Prefer scene nodes when present; otherwise build code UI (concept layout).
	title_label = get_node_or_null("%TitleLabel") as Label
	subtitle_label = get_node_or_null("%SubtitleLabel") as Label
	budget_label = get_node_or_null("%BudgetLabel") as Label
	if title_label:
		_wire_scene_buttons()
		return
	_build_concept_layout()


func _wire_scene_buttons() -> void:
	_undo = get_node_or_null("%UndoButton") as IconButtonFx
	_hint = get_node_or_null("%HintButton") as IconButtonFx
	_menu = get_node_or_null("%PauseButton") as IconButtonFx
	_top = get_node_or_null("TopBar") as MarginContainer
	_bottom = get_node_or_null("BottomBar") as MarginContainer


func _build_concept_layout() -> void:
	for c in get_children():
		c.queue_free()

	_top = MarginContainer.new()
	_top.name = "TopBar"
	_top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	_top.offset_bottom = 112.0
	add_child(_top)

	var top_row := HBoxContainer.new()
	top_row.add_theme_constant_override("separation", 12)
	_top.add_child(top_row)

	var titles := VBoxContainer.new()
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	titles.add_theme_constant_override("separation", 2)
	top_row.add_child(titles)

	title_label = Label.new()
	title_label.name = "TitleLabel"
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.text = "LEVEL 1"
	titles.add_child(title_label)

	subtitle_label = Label.new()
	subtitle_label.name = "SubtitleLabel"
	subtitle_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle_label.text = ""
	titles.add_child(subtitle_label)

	_help = _make_icon("?", "HelpButton")
	_menu = _make_icon("≡", "MenuButton")
	top_row.add_child(_help)
	top_row.add_child(_menu)

	_bottom = MarginContainer.new()
	_bottom.name = "BottomBar"
	_bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	_bottom.offset_top = -140.0
	add_child(_bottom)

	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 16)
	_bottom.add_child(actions)

	_undo = _make_labeled_action("↶", "UNDO")
	_restart = _make_labeled_action("↺", "RESTART")
	actions.add_child(_undo)
	actions.add_child(_restart)

	_dial = MovesDial.new()
	_dial.tokens = tokens
	_dial.custom_minimum_size = Vector2(112, 112)
	actions.add_child(_dial)

	_hint = _make_labeled_action("?", "HINT")
	_levels = _make_labeled_action("▦", "LEVELS")
	actions.add_child(_hint)
	actions.add_child(_levels)

	budget_label = Label.new()
	budget_label.visible = false
	add_child(budget_label)


func _make_icon(glyph: String, node_name: String) -> IconButtonFx:
	var b := IconButtonFx.new()
	b.name = node_name
	b.tokens = tokens
	b.icon_text = glyph
	b.custom_minimum_size = Vector2(48, 48)
	return b


func _make_labeled_action(glyph: String, caption: String) -> IconButtonFx:
	var b := IconButtonFx.new()
	b.tokens = tokens
	b.icon_text = glyph
	b.custom_minimum_size = Vector2(64, 64)
	b.tooltip_text = caption
	return b


func _apply_safe_margins() -> void:
	var inset := SafeAreaHelper.insets(self)
	var side := 20 + int(ceil(maxi(inset.x, inset.z) * 0.5))
	if _top:
		_top.add_theme_constant_override("margin_left", side)
		_top.add_theme_constant_override("margin_right", side)
		_top.add_theme_constant_override("margin_top", 14 + int(ceil(inset.y)))
	if _bottom:
		_bottom.add_theme_constant_override("margin_left", side)
		_bottom.add_theme_constant_override("margin_right", side)
		_bottom.add_theme_constant_override("margin_bottom", 18 + int(ceil(inset.w)))


func _style_labels() -> void:
	if tokens == null:
		return
	if title_label:
		title_label.add_theme_color_override("font_color", tokens.ink_primary)
		title_label.add_theme_font_size_override("font_size", tokens.font_title + 4)
	if subtitle_label:
		subtitle_label.add_theme_color_override("font_color", tokens.ink_muted)
		subtitle_label.add_theme_font_size_override("font_size", tokens.font_caption)
	if budget_label:
		budget_label.add_theme_color_override("font_color", tokens.ink_secondary)
		budget_label.add_theme_font_size_override("font_size", tokens.font_title)
	if _dial:
		_dial.configure(tokens)


func _wire_actions() -> void:
	if _undo and not _undo.pressed.is_connected(_emit_undo):
		_undo.pressed.connect(_emit_undo)
		_undo.set_icon_text("↶")
	if _restart and not _restart.pressed.is_connected(_emit_restart):
		_restart.pressed.connect(_emit_restart)
		_restart.set_icon_text("↺")
	if _hint and not _hint.pressed.is_connected(_emit_hint):
		_hint.pressed.connect(_emit_hint)
		_hint.set_icon_text("?")
	if _levels and not _levels.pressed.is_connected(_emit_levels):
		_levels.pressed.connect(_emit_levels)
		_levels.set_icon_text("▦")
	if _help and not _help.pressed.is_connected(_emit_help):
		_help.pressed.connect(_emit_help)
	if _menu and not _menu.pressed.is_connected(_emit_menu):
		_menu.pressed.connect(_emit_menu)
		if _menu.icon_text == "Ⅱ" or _menu.icon_text.is_empty():
			_menu.set_icon_text("≡")


func _emit_undo() -> void:
	undo_pressed.emit()


func _emit_restart() -> void:
	restart_pressed.emit()


func _emit_hint() -> void:
	hint_pressed.emit()


func _emit_levels() -> void:
	levels_pressed.emit()


func _emit_help() -> void:
	help_pressed.emit()


func _emit_menu() -> void:
	menu_pressed.emit()
	pause_pressed.emit()


func _load_tokens() -> DesignTokens:
	var path := "res://resources/configs/visual/default_design_tokens.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is DesignTokens:
			return res as DesignTokens
	return DesignTokens.new()
