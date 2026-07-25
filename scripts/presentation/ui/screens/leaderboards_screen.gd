extends UiScreen
## Local leaderboard cache only — no fake global/friends ranks until a store plugin is wired.

var _scaffold: UiScreenScaffold
var _tab: String = "daily"


func _build() -> void:
	screen_id = UiRouter.SCREEN_LEADERBOARDS
	title = "Leaderboards"
	subtitle = "Local scores · Steam / Play plugin later"
	shows_back = true
	_tab = str(params.get("tab", "daily"))
	_scaffold = UiScreenScaffold.new()
	add_child(_scaffold)
	_scaffold.build(self, true, false)
	_populate()


func _populate() -> void:
	for c in _scaffold.content.get_children():
		c.queue_free()
	var scale := settings.text_scale if settings else 1.0
	var idx := 0 if _tab == "daily" else 1
	var tabs := SettingsRow.new()
	tabs.configure_choice(tokens, "Board", PackedStringArray(["Daily (local)", "Endless (local)"]), idx, scale)
	tabs.value_changed.connect(func(i: Variant) -> void:
		feel_press(tabs)
		_tab = "daily" if int(i) == 0 else "endless"
		_populate()
	)
	_scaffold.content.add_child(tabs)

	var note := Label.new()
	note.text = "Ranks are device-local. Global / friends boards need GodotSteam or Play Games — see PLATFORM_SERVICES.md (Leaderboards plugin hook)."
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if tokens:
		note.add_theme_color_override("font_color", tokens.ink_muted)
		note.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	_scaffold.content.add_child(note)

	var board_id: StringName = LeaderboardService.BOARD_DAILY if _tab == "daily" else LeaderboardService.BOARD_ENDLESS
	var entries: Array = _local_entries(board_id)
	if entries.is_empty():
		var empty := Label.new()
		empty.text = "No local scores yet. Clear a Daily or Endless run to appear here."
		if tokens:
			empty.add_theme_color_override("font_color", tokens.ink_secondary)
			empty.add_theme_font_size_override("font_size", scaled(tokens.font_body))
		_scaffold.content.add_child(empty)
	else:
		for e in entries:
			if not (e is Dictionary):
				continue
			var entry: Dictionary = e
			var is_self := bool(entry.get("is_self", false))
			var accent := tokens.accent_signal if is_self and tokens else Color(0, 0, 0, 0)
			var name := str(entry.get("player_name", "You"))
			if is_self:
				name = "You"
			var moves := int(entry.get("moves", 0))
			var time_sec := float(entry.get("time_sec", 0.0))
			var rank := int(entry.get("rank", 0))
			var meta := "#%d  ·  %d moves" % [rank, moves]
			if _tab == "daily" and time_sec > 0.0:
				meta += "  ·  %.1fs" % time_sec
			elif _tab == "endless":
				meta += "  ·  score %d" % int(entry.get("score", 0))
			var row := NavRow.new()
			row.configure(tokens, name, meta, accent, scale, false)
			row.disabled = true
			row.focus_mode = Control.FOCUS_NONE
			_scaffold.content.add_child(row)

	_scaffold.stagger_children(settings.reduce_motion if settings else false)


func _local_entries(board_id: StringName) -> Array:
	var gs := get_node_or_null("/root/GameServices")
	if gs == null or gs.leaderboards == null:
		return []
	## Prefer cached local submits; never invent remote names.
	var cached: Array = gs.leaderboards.cached(board_id)
	if not cached.is_empty():
		return cached
	return gs.leaderboards.fetch(board_id, false, 20)
