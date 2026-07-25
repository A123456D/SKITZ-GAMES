extends UiScreen
## Brand-first home — sparse CTAs, no stat chrome.

var _actions: VBoxContainer
var _footer: VBoxContainer
var _focus_targets: Array = []
var _safe: MarginContainer
var _brand: Label
var _tag: Label
var _hint: Label


func _build() -> void:
	screen_id = UiRouter.SCREEN_MAIN
	title = ""
	shows_back = false
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_focus_targets.clear()

	_safe = MarginContainer.new()
	_safe.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_apply_safe_margins()
	var win := get_window()
	if win and not win.size_changed.is_connected(_apply_safe_margins):
		win.size_changed.connect(_apply_safe_margins)
	add_child(_safe)

	var scroll := ScrollContainer.new()
	scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_safe.add_child(scroll)

	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", tokens.space_lg if tokens else 24)
	scroll.add_child(col)

	_brand = Label.new()
	_brand.text = _t("UI_BRAND", "SHIFTR")
	_brand.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_brand.add_theme_color_override("font_color", tokens.ink_primary)
	_brand.add_theme_font_size_override("font_size", scaled(tokens.font_display + 16))
	var display_font := _load_display_font()
	if display_font:
		_brand.add_theme_font_override("font", display_font)
	# Soft brand glow via modulate pulse on accent shadow.
	_brand.add_theme_color_override("font_shadow_color", Color(tokens.accent_signal.r, tokens.accent_signal.g, tokens.accent_signal.b, 0.55))
	_brand.add_theme_constant_override("shadow_offset_x", 0)
	_brand.add_theme_constant_override("shadow_offset_y", 0)
	_brand.add_theme_constant_override("shadow_outline_size", 8)
	col.add_child(_brand)

	_tag = Label.new()
	_tag.text = _t("UI_TAGLINE", "EVERY MOVE CHANGES EVERYTHING")
	_tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_tag.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_tag.add_theme_color_override("font_color", tokens.accent_beam)
	_tag.add_theme_font_size_override("font_size", scaled(tokens.font_body))
	col.add_child(_tag)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 36)
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(spacer)

	_actions = VBoxContainer.new()
	_actions.add_theme_constant_override("separation", 12)
	_actions.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_child(_actions)

	_add_cta(_t("UI_PLAY", "Play"), func() -> void: _goto_play_slice(false))
	_add_cta(_t("UI_CONTINUE", "Continue"), func() -> void: _goto_play_slice(true))
	_add_cta(_t("UI_DAILY", "Daily Challenge"), func() -> void: push(UiRouter.SCREEN_DAILY))
	_add_cta(_t("UI_ENDLESS", "Endless"), func() -> void: push(UiRouter.SCREEN_ENDLESS))
	_add_cta(_t("UI_WORLDS", "Worlds"), func() -> void: push(UiRouter.SCREEN_WORLDS))
	_add_cta(_t("UI_WORLD_MAP", "World Map"), func() -> void: push(UiRouter.SCREEN_WORLD_MAP))
	_add_cta(_t("UI_CREATE", "Create"), func() -> void: push(UiRouter.SCREEN_LEVEL_EDITOR))

	_footer = VBoxContainer.new()
	_footer.add_theme_constant_override("separation", 8)
	_footer.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_child(_footer)

	_add_ghost(_t("UI_INVENTORY", "Inventory"), func() -> void: push(UiRouter.SCREEN_INVENTORY))
	_add_ghost(_t("UI_ACHIEVEMENTS", "Achievements"), func() -> void: push(UiRouter.SCREEN_ACHIEVEMENTS))
	_add_ghost(_t("UI_LEADERBOARDS", "Leaderboards"), func() -> void: push(UiRouter.SCREEN_LEADERBOARDS))
	_add_ghost(_t("UI_SETTINGS", "Settings"), func() -> void: push(UiRouter.SCREEN_SETTINGS))
	_add_ghost(_t("UI_ACCESSIBILITY", "Accessibility"), func() -> void: push(UiRouter.SCREEN_ACCESSIBILITY))
	_add_ghost("Feel Lab", func() -> void: _goto_feel())
	_add_ghost("Aesthetic Lab", func() -> void: _goto_showcase())

	_hint = Label.new()
	_hint.text = _t("UI_CONTROLLER_HINT", ControllerNav.hint_text())
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hint.add_theme_color_override("font_color", tokens.ink_muted)
	_hint.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	col.add_child(_hint)

	ControllerNav.link_vertical(_focus_targets)
	call_deferred("_focus_menu")


func _apply_safe_margins() -> void:
	if _safe == null:
		return
	var xl := tokens.space_xl if tokens else 40
	SafeAreaHelper.apply_to_margin_container(_safe, xl, xl + 80, xl, xl)


func _focus_menu() -> void:
	ControllerNav.focus_first(_focus_targets)


func _t(key: String, fallback: String) -> String:
	var gs := get_node_or_null("/root/GameServices")
	if gs and gs.locale:
		return gs.locale.tr_key(StringName(key), fallback)
	var translated := tr(key)
	return fallback if translated == key else translated


func _add_cta(label: String, cb: Callable) -> void:
	var b := GlassButton.new()
	b.text = label
	b.tokens = tokens
	var touch := tokens.touch_min if tokens else 48
	b.custom_minimum_size = Vector2(mini(320, maxi(200, touch * 5)), maxi(52, touch))
	b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	b.tooltip_text = label
	b.pressed.connect(func() -> void:
		feel_press(b)
		cb.call()
	)
	_actions.add_child(b)
	_focus_targets.append(b)


func _add_ghost(label: String, cb: Callable) -> void:
	var b := Button.new()
	b.text = label
	b.flat = true
	b.focus_mode = Control.FOCUS_ALL
	b.tooltip_text = label
	b.custom_minimum_size = Vector2(0, tokens.touch_min if tokens else 48)
	if tokens:
		b.add_theme_stylebox_override("normal", tokens.make_ghost_style())
		b.add_theme_stylebox_override("pressed", tokens.make_glass_style(true, false))
		b.add_theme_stylebox_override("focus", tokens.make_glass_style(false, true))
		b.add_theme_color_override("font_color", tokens.ink_secondary)
		b.add_theme_color_override("font_focus_color", tokens.accent_beam)
		b.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	b.pressed.connect(func() -> void:
		feel_press(b)
		cb.call()
	)
	_footer.add_child(b)
	_focus_targets.append(b)


func _goto_play_slice(resume: bool = false) -> void:
	var gs := get_node_or_null("/root/GameServices")
	if gs:
		## Continue uses saved resume when present; Play always starts a fresh slice.
		gs.launch_resume = resume and gs.save != null and gs.save.has_resume()
		if resume and not gs.launch_resume:
			## No save yet — still enter the slice (first-run Continue).
			gs.launch_resume = false
	if router and router.transition:
		await router.transition.cover(ScreenTransition.Mode.SHIFT)
	get_tree().change_scene_to_file("res://scenes/puzzles/concept_play_slice.tscn")


func _goto_feel() -> void:
	if router and router.transition:
		await router.transition.cover(ScreenTransition.Mode.SHIFT)
	get_tree().change_scene_to_file("res://scenes/puzzles/shift_feel_demo.tscn")


func _goto_showcase() -> void:
	if router and router.transition:
		await router.transition.cover(ScreenTransition.Mode.WIPE)
	get_tree().change_scene_to_file("res://scenes/ui/aesthetic_showcase.tscn")


func _load_display_font() -> FontFile:
	for path in [
		"res://assets/fonts/Orbitron-SemiBold.ttf",
		"res://assets/fonts/Orbitron-Bold.ttf",
		"res://assets/fonts/Orbitron-Medium.ttf",
		"res://assets/fonts/Orbitron-Regular.ttf",
	]:
		if ResourceLoader.exists(path):
			var res := load(path)
			if res is FontFile:
				return res as FontFile
	return null


func _apply_text_scale() -> void:
	if tokens == null:
		return
	if _brand:
		_brand.add_theme_font_size_override("font_size", scaled(tokens.font_display + 12))
	if _tag:
		_tag.add_theme_font_size_override("font_size", scaled(tokens.font_body))
	if _hint:
		_hint.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	for b in _focus_targets:
		if b is GlassButton:
			(b as GlassButton).add_theme_font_size_override("font_size", scaled(tokens.font_body))
		elif b is Button:
			(b as Button).add_theme_font_size_override("font_size", scaled(tokens.font_caption))
