class_name NeonGlassCard
extends PanelContainer
## Concept neon glass card — frosted panel + thin border + optional accent bar.

signal pressed

var tokens: DesignTokens
var _button: Button
var _title: Label
var _body: Label
var _accent: ColorRect
var _selected: bool = false


func configure(
	p_tokens: DesignTokens,
	title: String,
	body: String = "",
	accent: Color = Color(0.66, 0.33, 0.97),
	selected: bool = false
) -> void:
	tokens = p_tokens
	_selected = selected
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = Vector2(0, 96)
	size_flags_horizontal = Control.SIZE_EXPAND_FILL

	for c in get_children():
		c.queue_free()

	var style := StyleBoxFlat.new()
	if tokens:
		style.bg_color = Color(tokens.surface_glass.r, tokens.surface_glass.g, tokens.surface_glass.b, 0.55)
		style.border_color = accent if selected else tokens.surface_glass_border
		style.set_corner_radius_all(tokens.radius_lg)
		style.set_border_width_all(2 if selected else 1)
		style.content_margin_left = 14
		style.content_margin_right = 14
		style.content_margin_top = 12
		style.content_margin_bottom = 12
		if selected:
			style.shadow_color = Color(accent.r, accent.g, accent.b, 0.35)
			style.shadow_size = 8
	add_theme_stylebox_override("panel", style)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	add_child(row)

	_accent = ColorRect.new()
	_accent.custom_minimum_size = Vector2(4, 0)
	_accent.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_accent.color = accent
	row.add_child(_accent)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 4)
	row.add_child(col)

	_title = Label.new()
	_title.text = title
	_title.add_theme_color_override("font_color", tokens.ink_primary if tokens else Color.WHITE)
	_title.add_theme_font_size_override("font_size", tokens.font_title if tokens else 20)
	col.add_child(_title)

	_body = Label.new()
	_body.text = body
	_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body.add_theme_color_override("font_color", tokens.ink_secondary if tokens else Color(0.8, 0.8, 0.9))
	_body.add_theme_font_size_override("font_size", tokens.font_caption if tokens else 13)
	col.add_child(_body)

	_button = Button.new()
	_button.flat = true
	_button.focus_mode = Control.FOCUS_ALL
	_button.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_button.pressed.connect(func() -> void: pressed.emit())
	add_child(_button)


func set_selected(on: bool, accent: Color = Color(0.66, 0.33, 0.97)) -> void:
	_selected = on
	if tokens == null:
		return
	var style := get_theme_stylebox("panel") as StyleBoxFlat
	if style == null:
		return
	style = style.duplicate() as StyleBoxFlat
	style.border_color = accent if on else tokens.surface_glass_border
	style.set_border_width_all(2 if on else 1)
	style.shadow_color = Color(accent.r, accent.g, accent.b, 0.35 if on else 0.0)
	style.shadow_size = 8 if on else 0
	add_theme_stylebox_override("panel", style)
	if _accent:
		_accent.color = accent
