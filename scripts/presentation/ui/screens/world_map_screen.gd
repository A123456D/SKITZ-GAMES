extends UiScreen
## Chapter path — progress nodes into Level Select.

var _scaffold: UiScreenScaffold


func _build() -> void:
	screen_id = UiRouter.SCREEN_WORLD_MAP
	title = "World Map"
	subtitle = "Signal Restoration"
	shows_back = true
	_scaffold = UiScreenScaffold.new()
	add_child(_scaffold)
	_scaffold.build(self, true, true)
	_populate()


func _populate() -> void:
	for c in _scaffold.content.get_children():
		c.queue_free()

	if router and router.catalog:
		var gs := get_node_or_null("/root/GameServices")
		if gs and gs.save:
			router.catalog.hydrate_campaign_progress(gs.save)

	var blurb := Label.new()
	blurb.text = "Restore each lattice chapter. Stars open the next signal."
	blurb.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	blurb.add_theme_color_override("font_color", tokens.ink_secondary)
	blurb.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	_scaffold.content.add_child(blurb)

	for chapter in router.catalog.chapters:
		if chapter == null:
			continue
		_add_chapter_node(chapter)

	_scaffold.stagger_children(settings.reduce_motion if settings else false)


func _add_chapter_node(chapter: ChapterDef) -> void:
	var panel := PanelContainer.new()
	if tokens:
		panel.add_theme_stylebox_override("panel", tokens.make_panel_style())
	_scaffold.content.add_child(panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_bottom", 14)
	panel.add_child(margin)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	margin.add_child(col)

	var head := HBoxContainer.new()
	col.add_child(head)

	var title_l := Label.new()
	title_l.text = chapter.title
	title_l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var ink := tokens.ink_primary if chapter.unlocked else tokens.ink_muted
	title_l.add_theme_color_override("font_color", ink)
	title_l.add_theme_font_size_override("font_size", scaled(tokens.font_title))
	head.add_child(title_l)

	var stars := Label.new()
	stars.text = "%d / %d ★" % [chapter.stars_earned, chapter.stars_total]
	stars.add_theme_color_override("font_color", tokens.accent_signal if chapter.unlocked else tokens.ink_muted)
	stars.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	head.add_child(stars)

	var sub := Label.new()
	sub.text = chapter.subtitle if chapter.unlocked else "Locked — earn more stars"
	sub.add_theme_color_override("font_color", tokens.ink_secondary)
	sub.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	col.add_child(sub)

	var bar := ProgressBar.new()
	bar.min_value = 0
	bar.max_value = 1
	bar.value = chapter.progress if chapter.unlocked else 0
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(0, 8)
	bar.modulate = tokens.accent_signal if chapter.unlocked else tokens.ink_muted
	col.add_child(bar)

	var cta := GlassButton.new()
	cta.text = "Enter" if chapter.unlocked else "Locked"
	cta.tokens = tokens
	cta.disabled = not chapter.unlocked
	cta.custom_minimum_size = Vector2(0, 48)
	var chapter_id := chapter.id
	var chapter_unlocked := chapter.unlocked
	cta.pressed.connect(func() -> void:
		if not chapter_unlocked:
			if router.ui_feel:
				router.ui_feel.invalid()
			return
		feel_press(cta)
		push(UiRouter.SCREEN_LEVEL_SELECT, {"chapter_id": chapter_id})
	)
	col.add_child(cta)
