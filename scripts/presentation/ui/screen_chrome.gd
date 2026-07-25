class_name ScreenChrome
extends MarginContainer
## Shared top chrome: safe margins, back, title, optional currency.

signal back_pressed

var back_btn: IconButtonFx
var title_label: Label
var subtitle_label: Label
var currency_host: HBoxContainer

var tokens: DesignTokens
var settings: UiSettingsState
var _currency: CurrencyStrip
var _wired: bool = false
var _safe_wired: bool = false


func configure(
	p_tokens: DesignTokens,
	p_title: String,
	p_subtitle: String = "",
	show_back: bool = true,
	show_currency: bool = false,
	p_settings: UiSettingsState = null
) -> void:
	tokens = p_tokens
	settings = p_settings
	_wire_safe_area()
	_apply_safe_margins()
	_wire_back()
	if title_label:
		title_label.text = p_title
	if subtitle_label:
		subtitle_label.text = p_subtitle
		subtitle_label.visible = not p_subtitle.is_empty()
	if back_btn:
		back_btn.visible = show_back
		back_btn.configure(tokens, settings != null and settings.reduce_motion)
		back_btn.set_icon_text("◀")
	_style()
	if show_currency:
		_ensure_currency()
	elif _currency:
		_currency.visible = false


func _wire_back() -> void:
	if _wired or back_btn == null:
		return
	_wired = true
	back_btn.pressed.connect(func() -> void: back_pressed.emit())


func _wire_safe_area() -> void:
	if _safe_wired:
		return
	_safe_wired = true
	var win := get_window()
	if win and not win.size_changed.is_connected(_apply_safe_margins):
		win.size_changed.connect(_apply_safe_margins)


func _apply_safe_margins() -> void:
	var left := tokens.space_md if tokens else 16
	var right := tokens.space_md if tokens else 16
	var top := (tokens.space_xl if tokens else 40) + 12
	var bottom := tokens.space_sm if tokens else 8
	SafeAreaHelper.apply_to_margin_container(self, left, top, right, bottom)


func _style() -> void:
	if tokens == null:
		return
	var scale := settings.text_scale if settings else 1.0
	if title_label:
		title_label.add_theme_color_override("font_color", tokens.ink_primary)
		title_label.add_theme_font_size_override("font_size", int(round(tokens.font_title * scale)))
	if subtitle_label:
		subtitle_label.add_theme_color_override("font_color", tokens.ink_secondary)
		subtitle_label.add_theme_font_size_override("font_size", int(round(tokens.font_caption * scale)))


func _ensure_currency() -> void:
	if currency_host == null or settings == null:
		return
	if _currency == null:
		_currency = CurrencyStrip.new()
		currency_host.add_child(_currency)
	_currency.visible = true
	_currency.configure(tokens, settings)
