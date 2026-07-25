extends UiScreen
## Achievement list with progress — neon glass cards + skill affirmations.

var _scaffold: UiScreenScaffold


func _build() -> void:
	screen_id = UiRouter.SCREEN_ACHIEVEMENTS
	title = "Achievements"
	subtitle = "Skill · exploration"
	shows_back = true
	_scaffold = UiScreenScaffold.new()
	add_child(_scaffold)
	_scaffold.build(self, true, false)
	_populate()


func _populate() -> void:
	for c in _scaffold.content.get_children():
		c.queue_free()

	var list: Array = router.catalog.achievements if router and router.catalog else []
	var gs := get_node_or_null("/root/GameServices")
	if gs and gs.achievements:
		var live: Array = gs.achievements.list_defs()
		if not live.is_empty():
			list = live
	for a in list:
		if a == null:
			continue
		var ach: AchievementDef = a
		var meta := "%s  ·  %d / %d" % [ach.tier_name(), ach.progress, ach.target]
		if ach.unlocked and not ach.unlocked_label.is_empty():
			meta += "  ·  %s" % ach.unlocked_label
		var accent := tokens.accent_signal if ach.unlocked else tokens.accent_steel
		var card := NeonGlassCard.new()
		card.configure(
			tokens,
			ach.title,
			ach.description + "\n" + meta,
			accent,
			ach.unlocked
		)
		var unlocked := ach.unlocked
		card.pressed.connect(func() -> void:
			feel_press(card)
			if unlocked and router.ui_feel:
				router.ui_feel.achievement(card.get_global_rect().get_center())
		)
		_scaffold.content.add_child(card)

		var bar := ProgressBar.new()
		bar.min_value = 0
		bar.max_value = 1
		bar.value = ach.progress_ratio()
		bar.show_percentage = false
		bar.custom_minimum_size = Vector2(0, 6)
		bar.modulate = tokens.accent_signal if ach.unlocked else tokens.ink_muted
		_scaffold.content.add_child(bar)

	_scaffold.stagger_children(settings.reduce_motion if settings else false)
