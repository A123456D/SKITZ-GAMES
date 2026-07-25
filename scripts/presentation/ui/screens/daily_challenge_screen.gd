extends UiScreen
## UTC daily — streak, attempts, leaderboard link. Real seeded PuzzleGenerator play.

var _scaffold: UiScreenScaffold
var _utc_date: String = ""


func _build() -> void:
	screen_id = UiRouter.SCREEN_DAILY
	title = "Daily Challenge"
	subtitle = "One seed. Worldwide."
	shows_back = true
	_utc_date = _utc_today()
	_scaffold = UiScreenScaffold.new()
	add_child(_scaffold)
	_scaffold.build(self, true, true)
	_populate()


func _utc_today() -> String:
	var dt := Time.get_datetime_dict_from_system(true)
	return "%04d-%02d-%02d" % [int(dt.year), int(dt.month), int(dt.day)]


func _populate() -> void:
	for c in _scaffold.content.get_children():
		c.queue_free()
	var d: DailyChallengeDef = router.catalog.daily
	var gs := get_node_or_null("/root/GameServices")
	var completed := false
	var best_moves := -1
	var streak := d.streak if d else 0
	if gs and gs.save:
		completed = gs.save.is_daily_completed(_utc_date)
		best_moves = gs.save.get_daily_best_moves()
		streak = int(gs.save.get_daily_blob().get("streak", streak))

	## Live generator metadata — soft/hard par + difficulty from today's seed.
	var preview := PuzzleGenerator.new().generate_daily(_utc_date, "SHIFTR", 5)
	var soft_par := preview.par_soft if preview.par_soft > 0 else (d.soft_par if d else 11)
	var hard_par := preview.par_hard if preview.par_hard > 0 else (d.hard_par if d else 7)
	var target_moves := preview.optimal_moves if preview.optimal_moves > 0 else hard_par
	var seed_preview := preview.seed_value
	var title_line := d.title if d else "Signal Drift"
	var blurb := d.blurb if d else "Fewest moves. Time breaks ties."

	var hero := NeonGlassCard.new()
	hero.configure(
		tokens,
		title_line,
		"Seed %s · gen %d · d%d\n%s" % [_utc_date, seed_preview, preview.difficulty, blurb],
		tokens.accent_signal if tokens else Color(0.66, 0.33, 0.97),
		true
	)
	_scaffold.content.add_child(hero)

	var status := "Clear today's lattice for streak credit."
	if completed:
		status = "Completed today · best %s moves" % (str(best_moves) if best_moves >= 0 else "—")
	var meta := NeonGlassCard.new()
	meta.configure(
		tokens,
		"Streak %d" % streak,
		"%s · Soft %d / Hard %d · target %d" % [
			status,
			soft_par,
			hard_par,
			target_moves,
		],
		tokens.accent_beam if tokens else Color(0.13, 0.83, 0.93)
	)
	_scaffold.content.add_child(meta)

	var play := NeonGlassCard.new()
	play.configure(
		tokens,
		"Play Ranked" if not completed else "Play Again",
		"Date-seeded Align · writes daily clear",
		tokens.accent_signal if tokens else Color(0.66, 0.33, 0.97)
	)
	play.pressed.connect(func() -> void:
		feel_press(play)
		_launch_daily(true)
	)
	_scaffold.content.add_child(play)

	var practice := NeonGlassCard.new()
	practice.configure(
		tokens,
		"Practice (unranked)",
		"Same seed · no streak / leaderboard write",
		tokens.accent_secondary if tokens else Color(0.45, 0.55, 1.0)
	)
	practice.pressed.connect(func() -> void:
		feel_press(practice)
		_launch_daily(false)
	)
	_scaffold.content.add_child(practice)

	var lb := NeonGlassCard.new()
	lb.configure(
		tokens,
		"Leaderboards",
		"Local daily ranks (device cache)",
		tokens.accent_beam if tokens else Color(0.13, 0.83, 0.93)
	)
	lb.pressed.connect(func() -> void:
		feel_press(lb)
		push(UiRouter.SCREEN_LEADERBOARDS, {"tab": "daily"})
	)
	_scaffold.content.add_child(lb)

	_scaffold.stagger_children(settings.reduce_motion if settings else false)


func _launch_daily(ranked: bool) -> void:
	var gs := get_node_or_null("/root/GameServices")
	if gs:
		if ranked and gs.save:
			gs.save.bump_daily_attempt(true)
		var puzzle := PuzzleGenerator.new().generate_daily(_utc_date, "SHIFTR", 5)
		gs.set_launch_play({
			"mode": "daily",
			"date": _utc_date,
			"ranked": ranked,
			"seed": puzzle.seed_value,
			"difficulty": puzzle.difficulty,
			"puzzle": puzzle.to_dict(),
		})
	if router and router.transition:
		await router.transition.cover(ScreenTransition.Mode.SHIFT)
	get_tree().change_scene_to_file("res://scenes/puzzles/concept_play_slice.tscn")
