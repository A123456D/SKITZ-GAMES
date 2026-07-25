extends UiScreen
## Reduce motion, shake, bloom, text scale, colorblind, haptics.

var _scaffold: UiScreenScaffold


func _build() -> void:
	screen_id = UiRouter.SCREEN_ACCESSIBILITY
	title = "Accessibility"
	subtitle = "Comfort · clarity · control"
	shows_back = true
	_scaffold = UiScreenScaffold.new()
	add_child(_scaffold)
	_scaffold.build(self, true, false)
	_populate()


func _populate() -> void:
	for c in _scaffold.content.get_children():
		c.queue_free()
	var scale := settings.text_scale if settings else 1.0

	_toggle("Reduce motion", settings.reduce_motion, func(on: bool) -> void:
		settings.reduce_motion = on
		_apply()
	, scale)
	_toggle("Disable screen shake", settings.disable_shake, func(on: bool) -> void:
		settings.disable_shake = on
		_apply()
	, scale)
	_toggle("Bloom", settings.bloom_enabled, func(on: bool) -> void:
		settings.bloom_enabled = on
		_apply()
	, scale)
	_toggle("Battery saver", settings.battery_saver, func(on: bool) -> void:
		settings.battery_saver = on
		_apply()
	, scale)
	_toggle("Haptics", settings.haptics_enabled, func(on: bool) -> void:
		settings.haptics_enabled = on
		_apply()
	, scale)
	_toggle("Colorblind-safe indicators", settings.colorblind_indicators, func(on: bool) -> void:
		settings.colorblind_indicators = on
		settings.notify()
	, scale)

	var scale_idx := 0
	if is_equal_approx(settings.text_scale, 1.15):
		scale_idx = 1
	elif settings.text_scale >= 1.25:
		scale_idx = 2
	var choice := SettingsRow.new()
	choice.configure_choice(tokens, "Text size", PackedStringArray(["100%", "115%", "130%"]), scale_idx, scale)
	choice.tooltip_text = "Text size"
	choice.value_changed.connect(func(idx: Variant) -> void:
		feel_press(choice)
		match int(idx):
			1:
				settings.text_scale = 1.15
			2:
				settings.text_scale = 1.3
			_:
				settings.text_scale = 1.0
		_apply()
		_populate()
	)
	_scaffold.content.add_child(choice)

	var note := Label.new()
	note.text = "Reduce motion shortens transitions, cuts bloom/parallax/shimmer, and disables shake & idle icon breathe. Battery saver lowers particles/bloom and stops idle menu CPU spin (never during play). Puzzle tiles stay dual-coded (shape + colour) when colorblind indicators are on. Text scale multiplies UI font sizes (100/115/130%). Screen-reader names use control tooltips; full AT-SPI wiring lands with Godot 4.4+ accessibility."
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.add_theme_color_override("font_color", tokens.ink_muted)
	note.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	_scaffold.content.add_child(note)

	var focusables := ControllerNav.collect_buttons(_scaffold.content)
	ControllerNav.link_vertical(focusables)


func _toggle(label: String, on: bool, cb: Callable, scale: float) -> void:
	var row := SettingsRow.new()
	row.configure_toggle(tokens, label, on, scale)
	row.value_changed.connect(func(v: Variant) -> void:
		feel_press(row)
		cb.call(v)
	)
	_scaffold.content.add_child(row)


func _apply() -> void:
	var audio := get_tree().root.get_node_or_null("Audio") as AudioDirector
	settings.apply_audio(audio)
	if router and router.aesthetic:
		settings.apply_visual(router.aesthetic.director, router.feel, router.transition)
		router.aesthetic.apply_aesthetic()
	settings.notify()
	var gs := get_node_or_null("/root/GameServices")
	if gs:
		gs.persist_settings(settings)
