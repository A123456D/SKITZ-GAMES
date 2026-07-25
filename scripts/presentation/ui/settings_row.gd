class_name SettingsRow
extends HBoxContainer
## Label + control row for settings / accessibility. Full-width, ≥48px tall.

enum ControlKind { SLIDER, TOGGLE, CHOICE }

signal value_changed(value: Variant)

var tokens: DesignTokens
var _label: Label
var _slider: HSlider
var _check: CheckButton
var _choice_box: HBoxContainer
var _kind: ControlKind
var _choices: PackedStringArray = []
var _choice_index: int = 0


func configure_slider(
	p_tokens: DesignTokens,
	text: String,
	value: float,
	text_scale: float = 1.0
) -> void:
	tokens = p_tokens
	_kind = ControlKind.SLIDER
	_ensure_base(text, text_scale)
	_slider = HSlider.new()
	_slider.min_value = 0.0
	_slider.max_value = 1.0
	_slider.step = 0.01
	_slider.value = value
	_slider.focus_mode = Control.FOCUS_ALL
	_slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_slider.custom_minimum_size = Vector2(120, tokens.touch_min if tokens else 48)
	_slider.value_changed.connect(func(v: float) -> void: value_changed.emit(v))
	add_child(_slider)
	_tint_slider()
	# Prefer focusing the slider for controller neighbors.
	focus_mode = Control.FOCUS_NONE


func configure_toggle(
	p_tokens: DesignTokens,
	text: String,
	on: bool,
	text_scale: float = 1.0
) -> void:
	tokens = p_tokens
	_kind = ControlKind.TOGGLE
	_ensure_base(text, text_scale)
	_check = CheckButton.new()
	_check.button_pressed = on
	_check.focus_mode = Control.FOCUS_ALL
	_check.toggled.connect(func(v: bool) -> void: value_changed.emit(v))
	if tokens:
		_check.add_theme_color_override("font_color", tokens.ink_secondary)
		_check.add_theme_color_override("font_pressed_color", tokens.accent_signal)
	add_child(_check)
	focus_mode = Control.FOCUS_NONE


func configure_choice(
	p_tokens: DesignTokens,
	text: String,
	choices: PackedStringArray,
	index: int,
	text_scale: float = 1.0
) -> void:
	tokens = p_tokens
	_kind = ControlKind.CHOICE
	_choices = choices
	_choice_index = clampi(index, 0, maxi(0, choices.size() - 1))
	_ensure_base(text, text_scale)
	_choice_box = HBoxContainer.new()
	_choice_box.add_theme_constant_override("separation", tokens.space_xs if tokens else 4)
	add_child(_choice_box)
	focus_mode = Control.FOCUS_NONE
	_rebuild_choices()


func _ensure_base(text: String, text_scale: float) -> void:
	custom_minimum_size = Vector2(0, tokens.touch_min + 8 if tokens else 56)
	add_theme_constant_override("separation", tokens.space_md if tokens else 16)
	alignment = BoxContainer.ALIGNMENT_CENTER
	focus_mode = Control.FOCUS_ALL
	mouse_filter = Control.MOUSE_FILTER_STOP
	_label = Label.new()
	_label.text = text
	_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if tokens:
		_label.add_theme_color_override("font_color", tokens.ink_primary)
		_label.add_theme_font_size_override("font_size", int(round(tokens.font_body * text_scale)))
	add_child(_label)


func _rebuild_choices() -> void:
	for c in _choice_box.get_children():
		c.queue_free()
	for i in range(_choices.size()):
		var b := Button.new()
		b.text = _choices[i]
		b.focus_mode = Control.FOCUS_ALL
		b.custom_minimum_size = Vector2(0, tokens.touch_min if tokens else 48)
		var selected := i == _choice_index
		if tokens:
			b.add_theme_stylebox_override("normal", tokens.make_glass_style(selected, selected))
			b.add_theme_stylebox_override("pressed", tokens.make_glass_style(true, false))
			b.add_theme_stylebox_override("focus", tokens.make_glass_style(false, true))
			b.add_theme_color_override("font_color", tokens.accent_signal if selected else tokens.ink_secondary)
			b.add_theme_font_size_override("font_size", tokens.font_caption)
		var idx := i
		b.pressed.connect(func() -> void:
			_choice_index = idx
			_rebuild_choices()
			value_changed.emit(idx)
		)
		_choice_box.add_child(b)


func _tint_slider() -> void:
	if tokens == null or _slider == null:
		return
	_slider.modulate = Color(tokens.accent_signal.r, tokens.accent_signal.g, tokens.accent_signal.b, 1.0)
