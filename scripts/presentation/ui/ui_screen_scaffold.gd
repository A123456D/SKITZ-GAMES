class_name UiScreenScaffold
extends VBoxContainer
## Standard screen body: chrome + scroll content. Compose inside UiScreen.

var chrome: ScreenChrome
var scroll: ScrollContainer
var content: VBoxContainer


func build(
	screen: UiScreen,
	show_back: bool = true,
	show_currency: bool = false
) -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_theme_constant_override("separation", 0)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	chrome = ScreenChrome.new()
	chrome.name = "Chrome"
	# Build chrome tree before configure (no packed scene dependency).
	_build_chrome_tree(chrome)
	add_child(chrome)
	chrome.configure(
		screen.tokens,
		screen.title,
		screen.subtitle,
		show_back,
		show_currency,
		screen.settings
	)
	if show_back:
		chrome.back_pressed.connect(func() -> void:
			screen.feel_press(chrome.back_btn)
			screen.pop()
		)

	scroll = ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)

	var pad := MarginContainer.new()
	pad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pad.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var m := screen.tokens.space_md if screen.tokens else 16
	# Horizontal + bottom already covered by ScreenChrome top/sides; add home-indicator inset.
	var inset := SafeAreaHelper.insets(pad)
	pad.add_theme_constant_override("margin_left", m)
	pad.add_theme_constant_override("margin_right", m)
	pad.add_theme_constant_override("margin_bottom", m + 16 + int(ceil(inset.w)))
	scroll.add_child(pad)

	content = VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", screen.tokens.space_md if screen.tokens else 16)
	pad.add_child(content)


func stagger_children(reduce_motion: bool, panel_dur: float = 0.22) -> void:
	if reduce_motion:
		return
	var delay := 0.0
	for child in content.get_children():
		if child is CanvasItem:
			var ci := child as CanvasItem
			ci.modulate.a = 0.0
			var tw := content.create_tween()
			tw.tween_interval(delay)
			tw.tween_property(ci, "modulate:a", 1.0, panel_dur * 0.7).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
			delay += 0.035


func _build_chrome_tree(host: ScreenChrome) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	host.add_child(row)

	var back := IconButtonFx.new()
	back.name = "BackButton"
	back.unique_name_in_owner = true
	row.add_child(back)

	var titles := VBoxContainer.new()
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	titles.add_theme_constant_override("separation", 2)
	row.add_child(titles)

	var title := Label.new()
	title.name = "TitleLabel"
	title.unique_name_in_owner = true
	titles.add_child(title)

	var sub := Label.new()
	sub.name = "SubtitleLabel"
	sub.unique_name_in_owner = true
	titles.add_child(sub)

	var currency := HBoxContainer.new()
	currency.name = "CurrencyHost"
	currency.unique_name_in_owner = true
	currency.alignment = BoxContainer.ALIGNMENT_END
	row.add_child(currency)

	# % unique names resolve on owner; rebind after tree insert.
	host.back_btn = back
	host.title_label = title
	host.subtitle_label = sub
	host.currency_host = currency
