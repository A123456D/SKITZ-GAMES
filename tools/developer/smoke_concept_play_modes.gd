extends SceneTree
## Smoke: boot concept_play_slice in concept / campaign / daily / endless launch payloads.
## Usage: godot --headless --path . -s res://tools/developer/smoke_concept_play_modes.gd

func _init() -> void:
	call_deferred("_run")


func _run() -> void:
	var failed := 0
	var gs = root.get_node_or_null("/root/GameServices")
	## Locale must register without Failed loading CSV as Translation.
	if gs and gs.locale:
		var sample: String = str(gs.locale.tr_key(&"UI_CONTINUE", "Continue"))
		print("SMOKE_LOCALE UI_CONTINUE=", sample, " locale=", gs.locale.current)
		if sample.is_empty():
			push_error("locale empty")
			failed += 1
	for mode_payload in [
		{},
		{"mode": "campaign", "chapter_id": "ch_signal", "level_id": "ch_signal_01"},
		{"mode": "campaign", "chapter_id": "ch_signal", "level_id": "ch_signal_02"},
		{"mode": "daily", "date": "2026-07-24", "ranked": false, "difficulty": 5},
		{"mode": "endless", "wave": 1, "seed": 4242, "difficulty": 1},
	]:
		var payload: Dictionary = mode_payload.duplicate(true)
		if gs and gs.has_method("set_launch_play") and not payload.is_empty():
			if str(payload.get("mode", "")) == "daily":
				var p = PuzzleGenerator.new().generate_daily(str(payload["date"]), "SHIFTR", 5)
				payload["puzzle"] = p.to_dict()
				payload["seed"] = p.seed_value
			elif str(payload.get("mode", "")) == "endless":
				var p2 = PuzzleGenerator.new().generate(int(payload["seed"]), int(payload["difficulty"]))
				payload["puzzle"] = p2.to_dict()
			gs.set_launch_play(payload)
		elif gs and gs.has_method("set_launch_play"):
			gs.set_launch_play({})
		var err = change_scene_to_file("res://scenes/puzzles/concept_play_slice.tscn")
		if err != OK:
			push_error("change_scene failed %s %s" % [err, payload])
			failed += 1
			continue
		await process_frame
		await process_frame
		await process_frame
		await create_timer(0.1).timeout
		if current_scene == null:
			push_error("no current_scene for %s" % payload)
			failed += 1
		else:
			print("SMOKE_OK mode=", payload.get("mode", "concept"), " level=", payload.get("level_id", ""), " scene=", current_scene.name)
	## Campaign unlock API smoke
	if gs and gs.save:
		gs.save.record_level_clear(&"ch_signal", &"ch_signal_01", 3, 1, false)
		var ids: Array = [
			&"ch_signal_01", &"ch_signal_02", &"ch_signal_03", &"ch_signal_04",
			&"ch_signal_05", &"ch_signal_06", &"ch_signal_07",
		]
		var unlocked2: bool = bool(gs.save.is_level_unlocked(&"ch_signal", ids, 1))
		print("SMOKE_UNLOCK level2=", unlocked2)
		if not unlocked2:
			push_error("expected ch_signal_02 unlocked after clearing 01")
			failed += 1
	quit(1 if failed else 0)
