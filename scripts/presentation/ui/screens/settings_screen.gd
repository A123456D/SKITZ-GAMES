extends UiScreen
## Audio buses, graphics tiers, language, privacy, cloud sync, control notes.

var _scaffold: UiScreenScaffold
var _focus_targets: Array = []


func _build() -> void:
	screen_id = UiRouter.SCREEN_SETTINGS
	title = _t("UI_SETTINGS", "Settings")
	subtitle = _t("UI_SETTINGS_SUB", "Audio · graphics · controls")
	shows_back = true
	_scaffold = UiScreenScaffold.new()
	add_child(_scaffold)
	_scaffold.build(self, true, false)
	_populate()


func _populate() -> void:
	for c in _scaffold.content.get_children():
		c.queue_free()
	_focus_targets.clear()
	var scale := settings.text_scale if settings else 1.0
	_section(_t("UI_SECTION_AUDIO", "Audio"))
	_slider(_t("UI_MASTER", "Master"), settings.master_volume, func(v: float) -> void:
		settings.master_volume = v
		_apply_live()
	, scale)
	_slider(_t("UI_MUSIC", "Music"), settings.music_volume, func(v: float) -> void:
		settings.music_volume = v
		_apply_live()
	, scale)
	_slider(_t("UI_SFX", "SFX"), settings.sfx_volume, func(v: float) -> void:
		settings.sfx_volume = v
		_apply_live()
	, scale)
	_slider(_t("UI_UI_VOL", "UI"), settings.ui_volume, func(v: float) -> void:
		settings.ui_volume = v
		_apply_live()
	, scale)

	_section(_t("UI_SECTION_GRAPHICS", "Graphics"))
	var tier_idx := int(settings.quality_tier)
	var choice := SettingsRow.new()
	choice.configure_choice(tokens, _t("UI_QUALITY", "Quality"), PackedStringArray(["High", "Med", "Low"]), tier_idx, scale)
	choice.value_changed.connect(func(idx: Variant) -> void:
		feel_press(choice)
		settings.quality_tier = idx as VisualQualityConfig.Tier
		_apply_live()
	)
	_scaffold.content.add_child(choice)
	_focus_targets.append(choice)

	_section(_t("UI_SECTION_LANGUAGE", "Language"))
	var loc_idx := 0
	var gs := _gs()
	if gs and gs.locale:
		loc_idx = gs.locale.index_of_current()
	var lang := SettingsRow.new()
	lang.configure_choice(tokens, _t("UI_SECTION_LANGUAGE", "Language"), LocaleService.new().supported_labels(), loc_idx, scale)
	lang.value_changed.connect(func(idx: Variant) -> void:
		feel_press(lang)
		if gs and gs.locale:
			var code := LocaleService.SUPPORTED[clampi(int(idx), 0, LocaleService.SUPPORTED.size() - 1)]
			gs.locale.set_locale(code)
			if gs.analytics:
				gs.analytics.track(AnalyticsEvents.LOCALE_CHANGED, {"locale": code})
			title = _t("UI_SETTINGS", "Settings")
			subtitle = _t("UI_SETTINGS_SUB", "Audio · graphics · controls")
			_populate()
	)
	_scaffold.content.add_child(lang)
	_focus_targets.append(lang)

	_section(_t("UI_SECTION_PRIVACY", "Privacy & sync"))
	var cloud_on := true
	if gs:
		cloud_on = gs.save.cloud_sync_enabled
	_toggle(_t("UI_CLOUD_SYNC", "Cloud save sync"), cloud_on, func(on: bool) -> void:
		if gs:
			gs.set_cloud_sync(on)
			if on:
				gs.save.sync_cloud()
	, scale)
	var analytics_on := false
	var crash_on := true
	if gs and gs.privacy:
		analytics_on = gs.privacy.analytics_allowed()
		crash_on = gs.privacy.crash_allowed()
	_toggle(_t("UI_ANALYTICS", "Analytics"), analytics_on, func(on: bool) -> void:
		if gs and gs.privacy:
			gs.privacy.set_analytics_opt_in(on)
	, scale)
	_toggle(_t("UI_CRASH_REPORTS", "Crash reports"), crash_on, func(on: bool) -> void:
		if gs and gs.privacy:
			gs.privacy.set_crash_opt_in(on)
	, scale)
	var policy := GlassButton.new()
	policy.text = _t("UI_PRIVACY_POLICY", "Privacy policy")
	policy.tokens = tokens
	policy.custom_minimum_size = Vector2(0, 48)
	policy.pressed.connect(func() -> void:
		feel_press(policy)
		if gs and gs.privacy:
			gs.privacy.open_privacy_policy()
	)
	_scaffold.content.add_child(policy)
	_focus_targets.append(policy)

	_section(_t("UI_SECTION_CONTROLS", "Controls"))
	var note := Label.new()
	note.text = _t("UI_CONTROLS_NOTE", "Swipe a row or column to shift. Keyboard: Q/E rows, R/F columns, Z undo. Gamepad: D-pad aim, face buttons shift, X undo.")
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.add_theme_color_override("font_color", tokens.ink_secondary)
	note.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	_scaffold.content.add_child(note)

	var hint := Label.new()
	hint.text = _t("UI_CONTROLLER_HINT", ControllerNav.hint_text())
	hint.add_theme_color_override("font_color", tokens.ink_muted)
	hint.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	_scaffold.content.add_child(hint)

	var a11y := GlassButton.new()
	a11y.text = _t("UI_ACCESSIBILITY", "Accessibility")
	a11y.tokens = tokens
	a11y.custom_minimum_size = Vector2(0, 48)
	a11y.pressed.connect(func() -> void:
		feel_press(a11y)
		push(UiRouter.SCREEN_ACCESSIBILITY)
	)
	_scaffold.content.add_child(a11y)
	_focus_targets.append(a11y)

	ControllerNav.link_vertical(_focus_targets)
	_scaffold.stagger_children(settings.reduce_motion if settings else false, tokens.duration_panel if tokens else 0.22)


func _section(text: String) -> void:
	var l := Label.new()
	l.text = text
	l.add_theme_color_override("font_color", tokens.accent_signal)
	l.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	_scaffold.content.add_child(l)


func _slider(label: String, value: float, cb: Callable, scale: float) -> void:
	var row := SettingsRow.new()
	row.configure_slider(tokens, label, value, scale)
	row.value_changed.connect(cb)
	_scaffold.content.add_child(row)
	_focus_targets.append(row)


func _toggle(label: String, on: bool, cb: Callable, scale: float) -> void:
	var row := SettingsRow.new()
	row.configure_toggle(tokens, label, on, scale)
	row.value_changed.connect(func(v: Variant) -> void:
		feel_press(row)
		cb.call(v)
	)
	_scaffold.content.add_child(row)
	_focus_targets.append(row)


func _apply_live() -> void:
	var audio := get_tree().root.get_node_or_null("Audio") as AudioDirector
	settings.apply_audio(audio)
	if router and router.aesthetic:
		settings.apply_visual(router.aesthetic.director, router.feel, router.transition)
	settings.notify()
	var gs := _gs()
	if gs:
		gs.persist_settings(settings)


func _gs() -> Node:
	return get_node_or_null("/root/GameServices")


func _t(key: String, fallback: String) -> String:
	var gs := _gs()
	if gs and gs.locale:
		return gs.locale.tr_key(StringName(key), fallback)
	var translated := tr(key)
	return fallback if translated == key else translated


func _on_settings_updated() -> void:
	# Avoid full rebuild while dragging sliders.
	pass
