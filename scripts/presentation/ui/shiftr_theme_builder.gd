class_name ShiftrThemeBuilder
extends RefCounted
## Builds a Godot Theme from DesignTokens — no duplicated magic numbers.
## Baked fallback: `res://resources/themes/shiftr_theme.tres` (keep in sync when tokens change).

const BAKED_THEME := "res://resources/themes/shiftr_theme.tres"
const FONT_BODY := "res://assets/fonts/Rajdhani-SemiBold.ttf"
const FONT_CAPTION := "res://assets/fonts/Rajdhani-Regular.ttf"


static func build(tokens: DesignTokens) -> Theme:
	var theme := Theme.new()
	_apply_fonts(theme, tokens)
	_apply_colors(theme, tokens)
	_apply_constants(theme, tokens)
	_apply_button(theme, tokens)
	_apply_panel(theme, tokens)
	_apply_label(theme, tokens)
	_apply_checkbox(theme, tokens)
	return theme


static func load_baked_or_build(tokens: DesignTokens) -> Theme:
	if tokens == null and ResourceLoader.exists(BAKED_THEME):
		var baked := load(BAKED_THEME)
		if baked is Theme:
			return baked as Theme
	return build(tokens if tokens else DesignTokens.new())


static func _apply_fonts(theme: Theme, tokens: DesignTokens) -> void:
	theme.set_font_size("font_size", "Label", tokens.font_body)
	theme.set_font_size("font_size", "Button", tokens.font_body)
	theme.set_font_size("font_size", "CheckBox", tokens.font_caption)
	theme.set_font_size("font_size", "HeaderSmall", tokens.font_title)
	theme.set_font_size("font_size", "HeaderLarge", tokens.font_display)
	var display := _load_font_first(_orbitron_candidates())
	var body := _load_font(FONT_BODY)
	var caption := _load_font(FONT_CAPTION)
	if display:
		theme.set_font("font", "HeaderLarge", display)
		theme.set_font("font", "HeaderSmall", display)
	if body:
		theme.set_font("font", "Button", body)
		theme.set_font("font", "Label", body)
	if caption:
		theme.set_font("font", "CheckBox", caption)


static func _orbitron_candidates() -> PackedStringArray:
	## Prefer SemiBold; fall back through other Orbitron weights if dropped in.
	return PackedStringArray([
		"res://assets/fonts/Orbitron-SemiBold.ttf",
		"res://assets/fonts/Orbitron-Bold.ttf",
		"res://assets/fonts/Orbitron-Medium.ttf",
		"res://assets/fonts/Orbitron-Regular.ttf",
	])


static func _load_font_first(paths: PackedStringArray) -> FontFile:
	for path in paths:
		var f := _load_font(path)
		if f:
			return f
	return null


static func _load_font(path: String) -> FontFile:
	if path.is_empty() or not ResourceLoader.exists(path):
		return null
	var res := load(path)
	if res is FontFile:
		return res as FontFile
	return null


static func _apply_colors(theme: Theme, tokens: DesignTokens) -> void:
	theme.set_color("font_color", "Label", tokens.ink_primary)
	theme.set_color("font_shadow_color", "Label", Color(0, 0, 0, 0.35))
	theme.set_color("font_color", "Button", tokens.ink_primary)
	theme.set_color("font_pressed_color", "Button", tokens.ink_primary)
	theme.set_color("font_hover_color", "Button", tokens.accent_beam)
	theme.set_color("font_focus_color", "Button", tokens.accent_focus)
	theme.set_color("font_disabled_color", "Button", tokens.ink_muted)
	theme.set_color("font_color", "CheckBox", tokens.ink_secondary)
	theme.set_color("font_pressed_color", "CheckBox", tokens.accent_signal)
	theme.set_color("font_hover_color", "CheckBox", tokens.accent_beam)
	theme.set_color("font_focus_color", "CheckBox", tokens.accent_focus)


static func _apply_constants(theme: Theme, tokens: DesignTokens) -> void:
	theme.set_constant("h_separation", "BoxContainer", tokens.space_sm)
	theme.set_constant("v_separation", "BoxContainer", tokens.space_sm)
	theme.set_constant("separation", "VBoxContainer", tokens.space_sm)
	theme.set_constant("separation", "HBoxContainer", tokens.space_sm)
	theme.set_constant("margin_left", "MarginContainer", tokens.space_md)
	theme.set_constant("margin_right", "MarginContainer", tokens.space_md)
	theme.set_constant("margin_top", "MarginContainer", tokens.space_md)
	theme.set_constant("margin_bottom", "MarginContainer", tokens.space_md)


static func _apply_button(theme: Theme, tokens: DesignTokens) -> void:
	theme.set_stylebox("normal", "Button", tokens.make_glass_style(false, false))
	theme.set_stylebox("pressed", "Button", tokens.make_glass_style(true, false))
	theme.set_stylebox("hover", "Button", tokens.make_glass_style(false, true))
	theme.set_stylebox("focus", "Button", tokens.make_glass_style(false, true))
	theme.set_stylebox("disabled", "Button", tokens.make_ghost_style())
	theme.set_constant("outline_size", "Button", 0)


static func _apply_panel(theme: Theme, tokens: DesignTokens) -> void:
	theme.set_stylebox("panel", "Panel", tokens.make_panel_style())
	theme.set_stylebox("panel", "PanelContainer", tokens.make_panel_style())


static func _apply_label(theme: Theme, tokens: DesignTokens) -> void:
	theme.set_constant("line_spacing", "Label", 2)
	theme.set_constant("shadow_offset_x", "Label", 0)
	theme.set_constant("shadow_offset_y", "Label", 1)


static func _apply_checkbox(theme: Theme, tokens: DesignTokens) -> void:
	var empty := tokens.make_ghost_style()
	theme.set_stylebox("normal", "CheckBox", empty)
	theme.set_stylebox("pressed", "CheckBox", empty)
	theme.set_stylebox("hover", "CheckBox", empty)
	theme.set_stylebox("focus", "CheckBox", empty)
