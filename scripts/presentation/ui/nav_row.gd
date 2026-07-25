class_name NavRow
extends Button
## Full-width interactive row for lists (achievements, cosmetics, leaderboards).

var tokens: DesignTokens
var _title: Label
var _meta: Label
var _accent: ColorRect


func _ready() -> void:
	focus_mode = Control.FOCUS_ALL
	alignment = HORIZONTAL_ALIGNMENT_LEFT
	clip_text = true


func configure(
	p_tokens: DesignTokens,
	title: String,
	meta: String = "",
	accent: Color = Color(0, 0, 0, 0),
	text_scale: float = 1.0,
	muted: bool = false
) -> void:
	tokens = p_tokens
	text = ""
	custom_minimum_size = Vector2(0, (tokens.touch_min if tokens else 48) + 12)
	flat = false
	if tokens:
		add_theme_stylebox_override("normal", tokens.make_glass_style(false, false))
		add_theme_stylebox_override("pressed", tokens.make_glass_style(true, false))
		add_theme_stylebox_override("hover", tokens.make_glass_style(false, true))
		add_theme_stylebox_override("focus", tokens.make_glass_style(false, true))
	_clear_children()
	var row := HBoxContainer.new()
	row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 12
	row.offset_right = -12
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 12)
	add_child(row)

	if accent.a > 0.01:
		_accent = ColorRect.new()
		_accent.custom_minimum_size = Vector2(4, 0)
		_accent.color = accent
		_accent.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_accent.size_flags_vertical = Control.SIZE_EXPAND_FILL
		row.add_child(_accent)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(col)

	_title = Label.new()
	_title.text = title
	_title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if tokens:
		var ink := tokens.ink_muted if muted else tokens.ink_primary
		_title.add_theme_color_override("font_color", ink)
		_title.add_theme_font_size_override("font_size", int(round(tokens.font_body * text_scale)))
	col.add_child(_title)

	if not meta.is_empty():
		_meta = Label.new()
		_meta.text = meta
		_meta.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_meta.mouse_filter = Control.MOUSE_FILTER_IGNORE
		if tokens:
			_meta.add_theme_color_override("font_color", tokens.ink_secondary if not muted else tokens.ink_muted)
			_meta.add_theme_font_size_override("font_size", int(round(tokens.font_caption * text_scale)))
		col.add_child(_meta)


func _clear_children() -> void:
	for c in get_children():
		c.queue_free()
