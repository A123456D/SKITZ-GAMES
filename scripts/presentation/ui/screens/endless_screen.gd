extends UiScreen
## Endless mode — PuzzleGenerator ramp; wave advances on each clear.

var _scaffold: UiScreenScaffold


func _build() -> void:
	screen_id = UiRouter.SCREEN_ENDLESS
	title = "Endless"
	subtitle = "No par. Pure shift."
	shows_back = true
	_scaffold = UiScreenScaffold.new()
	add_child(_scaffold)
	_scaffold.build(self, true, true)

	var wave_best := 0
	var gs := get_node_or_null("/root/GameServices")
	if gs and gs.save:
		wave_best = gs.save.get_endless_wave_best()

	var intro := Label.new()
	intro.text = "Survive cascading Align boards. Difficulty rises every two waves. Best wave: %d." % wave_best
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro.add_theme_color_override("font_color", tokens.ink_secondary if tokens else Color(0.8, 0.8, 0.9))
	intro.add_theme_font_size_override("font_size", scaled(tokens.font_caption if tokens else 13))
	_scaffold.content.add_child(intro)

	var classic := NeonGlassCard.new()
	classic.configure(
		tokens,
		"Classic Run",
		"Seeded Align · rising difficulty on clear",
		tokens.accent_signal if tokens else Color(0.66, 0.33, 0.97)
	)
	classic.pressed.connect(func() -> void:
		feel_press(classic)
		_launch_endless(1)
	)
	_scaffold.content.add_child(classic)

	var zen := NeonGlassCard.new()
	zen.configure(
		tokens,
		"Zen Flow",
		"Same ramp · start at difficulty 2",
		tokens.accent_beam if tokens else Color(0.13, 0.83, 0.93)
	)
	zen.pressed.connect(func() -> void:
		feel_press(zen)
		_launch_endless(2)
	)
	_scaffold.content.add_child(zen)

	var lb := NeonGlassCard.new()
	lb.configure(
		tokens,
		"Leaderboards",
		"Local endless wave rank · weekly seed later",
		tokens.accent_secondary if tokens else Color(0.45, 0.55, 1.0)
	)
	lb.pressed.connect(func() -> void:
		feel_press(lb)
		push(UiRouter.SCREEN_LEADERBOARDS, {"tab": "endless"})
	)
	_scaffold.content.add_child(lb)

	_scaffold.stagger_children(settings.reduce_motion if settings else false)


func _launch_endless(start_difficulty: int) -> void:
	var seed_value := int(Time.get_unix_time_from_system()) ^ 0x5F3759DF
	if seed_value == 0:
		seed_value = 424242
	var puzzle := PuzzleGenerator.new().generate(seed_value, clampi(start_difficulty, 1, 10))
	var gs := get_node_or_null("/root/GameServices")
	if gs:
		gs.set_launch_play({
			"mode": "endless",
			"wave": 1,
			"seed": puzzle.seed_value,
			"difficulty": puzzle.difficulty,
			"puzzle": puzzle.to_dict(),
		})
	if router and router.transition:
		await router.transition.cover(ScreenTransition.Mode.SHIFT)
	get_tree().change_scene_to_file("res://scenes/puzzles/concept_play_slice.tscn")
