extends UiScreen
## Chapter level grid with stars + hint sheet entry.
## Launches authored campaign levels via GameServices → concept_play_slice.

var _scaffold: UiScreenScaffold
var _chapter: ChapterDef


func _build() -> void:
	screen_id = UiRouter.SCREEN_LEVEL_SELECT
	var chapter_id: StringName = params.get("chapter_id", &"ch_signal")
	if router and router.catalog:
		var gs := get_node_or_null("/root/GameServices")
		if gs and gs.save:
			router.catalog.hydrate_campaign_progress(gs.save)
		_chapter = router.catalog.chapter_by_id(chapter_id)
	title = _chapter.title if _chapter else "Levels"
	subtitle = _chapter.subtitle if _chapter else "Select a lattice"
	shows_back = true
	_scaffold = UiScreenScaffold.new()
	add_child(_scaffold)
	_scaffold.build(self, true, true)

	if _chapter:
		var worlds_btn := GlassButton.new()
		worlds_btn.text = "Worlds"
		worlds_btn.tokens = tokens
		worlds_btn.custom_minimum_size = Vector2(0, 48)
		worlds_btn.pressed.connect(func() -> void:
			feel_press(worlds_btn)
			push(UiRouter.SCREEN_WORLDS)
		)
		_scaffold.content.add_child(worlds_btn)

		var hint_btn := GlassButton.new()
		hint_btn.text = "Hints"
		hint_btn.tokens = tokens
		hint_btn.custom_minimum_size = Vector2(0, 48)
		hint_btn.pressed.connect(func() -> void:
			feel_press(hint_btn)
			open_sheet(&"hints", {"level_id": _chapter.levels[0].id if not _chapter.levels.is_empty() else &""})
		)
		_scaffold.content.add_child(hint_btn)

		var grid := GridContainer.new()
		grid.columns = 4
		grid.add_theme_constant_override("h_separation", 10)
		grid.add_theme_constant_override("v_separation", 10)
		_scaffold.content.add_child(grid)

		for lv in _chapter.levels:
			grid.add_child(_make_cell(lv))

	_scaffold.stagger_children(settings.reduce_motion if settings else false)


func _make_cell(lv: LevelEntryDef) -> Button:
	var b := Button.new()
	b.focus_mode = Control.FOCUS_ALL
	b.custom_minimum_size = Vector2(0, 88)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var stars := ""
	if not lv.locked:
		stars = "\n" + "★".repeat(lv.stars) + "☆".repeat(3 - lv.stars)
	var label := lv.teach_tag if not lv.teach_tag.is_empty() else str(lv.index)
	b.text = ("%s%s" % [label, stars]) if not lv.locked else "·"
	b.tooltip_text = lv.blurb if not lv.blurb.is_empty() else lv.display_name
	if tokens:
		b.add_theme_stylebox_override("normal", tokens.make_glass_style(false, false))
		b.add_theme_stylebox_override("pressed", tokens.make_glass_style(true, false))
		b.add_theme_stylebox_override("focus", tokens.make_glass_style(false, true))
		b.add_theme_stylebox_override("disabled", tokens.make_glass_style(false, false))
		var col := tokens.ink_muted if lv.locked else tokens.ink_primary
		b.add_theme_color_override("font_color", col)
		b.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	b.disabled = lv.locked
	var captured := lv
	var chapter_id := _chapter.id if _chapter else &"ch_signal"
	b.pressed.connect(func() -> void:
		if captured.locked:
			if router.ui_feel:
				router.ui_feel.invalid()
			return
		feel_press(b)
		var gs := get_node_or_null("/root/GameServices")
		if gs and gs.has_method("set_launch_play"):
			gs.set_launch_play({
				"mode": "campaign",
				"chapter_id": String(chapter_id),
				"level_id": String(captured.id),
				"par_soft": captured.par_soft,
				"par_hard": captured.par_hard,
			})
		elif gs:
			gs.launch_resume = false
		if router and router.transition:
			await router.transition.cover(ScreenTransition.Mode.SHIFT)
		get_tree().change_scene_to_file("res://scenes/puzzles/concept_play_slice.tscn")
	)
	return b
