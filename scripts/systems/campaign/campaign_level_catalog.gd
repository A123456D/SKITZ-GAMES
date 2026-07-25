class_name CampaignLevelCatalog
extends RefCounted
## Authored Signal Awakening chapter: swipe → laser → mirror → switch/door → color block.
## Layouts are data for ConceptPlaySlice (mode=campaign); no BoardSim changes.

const CHAPTER_SIGNAL := &"ch_signal"
const CHAPTER_LATTICE := &"ch_lattice"
const CHAPTER_ANCHOR := &"ch_anchor"


static func signal_level_ids() -> Array[StringName]:
	return [
		&"ch_signal_01",
		&"ch_signal_02",
		&"ch_signal_03",
		&"ch_signal_04",
		&"ch_signal_05",
		&"ch_signal_06",
		&"ch_signal_07",
	]


static func get_level(level_id: StringName) -> Dictionary:
	match String(level_id):
		"ch_signal_01":
			return _lv_01_swipe()
		"ch_signal_02":
			return _lv_02_laser()
		"ch_signal_03":
			return _lv_03_mirror()
		"ch_signal_04":
			return _lv_04_switch_door()
		"ch_signal_05":
			return _lv_05_laser_door()
		"ch_signal_06":
			return _lv_06_color_block()
		"ch_signal_07":
			return _lv_07_capstone()
		_:
			return {}


static func make_signal_chapter() -> ChapterDef:
	var c := ChapterDef.new()
	c.id = CHAPTER_SIGNAL
	c.title = "Signal Awakening"
	c.subtitle = "Swipe → beam → mirror → gate → color"
	c.unlocked = true
	var levels: Array[LevelEntryDef] = []
	var metas := [
		[&"ch_signal_01", "Swipe", "One shift. Clarity snaps.", 3, 1],
		[&"ch_signal_02", "Beam", "Clear the line of sight.", 5, 2],
		[&"ch_signal_03", "Mirror", "Bend the signal.", 6, 3],
		[&"ch_signal_04", "Switch", "Tap to open the gate.", 4, 1],
		[&"ch_signal_05", "Latch", "Receiver arms the door.", 7, 3],
		[&"ch_signal_06", "Red Line", "Red rides rows; columns cycle around.", 8, 4],
		[&"ch_signal_07", "Capstone", "Compose every lesson.", 10, 5],
	]
	for i in range(metas.size()):
		var m: Array = metas[i]
		var lv := LevelEntryDef.new()
		lv.id = m[0] as StringName
		lv.index = i + 1
		lv.display_name = str(m[1])
		lv.teach_tag = str(m[1])
		lv.blurb = str(m[2])
		lv.par_soft = int(m[3])
		lv.par_hard = int(m[4])
		lv.gen_seed = -1
		lv.difficulty = clampi(1 + i / 2, 1, 6)
		lv.stars = 0
		lv.locked = i > 0
		levels.append(lv)
	c.levels = levels
	c.stars_total = levels.size() * 3
	c.stars_earned = 0
	c.progress = 0.0
	return c


static func make_stub_chapter(
	id: StringName, title: String, sub: String, unlocked: bool
) -> ChapterDef:
	var c := ChapterDef.new()
	c.id = id
	c.title = title
	c.subtitle = sub
	c.unlocked = unlocked
	c.levels = []
	c.stars_total = 0
	c.stars_earned = 0
	c.progress = 0.0
	return c


static func apply_layout(engine: PuzzleEngine, session: BoardSession, layout: Dictionary) -> void:
	assert(engine != null and session != null)
	var width := int(layout.get("width", 6))
	var height := int(layout.get("height", 6))
	var cfg := BoardConfig.new()
	cfg.width = width
	cfg.height = height
	session.setup_from_config(cfg)
	var placements: Array = layout.get("placements", [])
	for p in placements:
		if not (p is Dictionary):
			continue
		var d: Dictionary = p
		var cell_v: Variant = d.get("cell", [0, 0])
		var cell := Vector2i(0, 0)
		if cell_v is Array and (cell_v as Array).size() >= 2:
			cell = Vector2i(int((cell_v as Array)[0]), int((cell_v as Array)[1]))
		elif cell_v is Vector2i:
			cell = cell_v as Vector2i
		var def_id := StringName(str(d.get("id", "")))
		if String(def_id).is_empty():
			continue
		var as_floor := bool(d.get("floor", false))
		engine.place(cell, def_id, as_floor)
	engine.bootstrap_from_board()


## --- Authored layouts ---

static func _base_laser(
	id: String, title: String, hint: String, w: int, h: int, soft: int, hard: int, placements: Array
) -> Dictionary:
	return {
		"id": id,
		"title": title,
		"hint": hint,
		"mode": "laser",
		"width": w,
		"height": h,
		"par_soft": soft,
		"par_hard": hard,
		"win": "door_channel",
		"placements": placements,
	}


static func _lv_01_swipe() -> Dictionary:
	## Teach circular swipe with a 3×3 Align half-shift (one optimal move).
	return {
		"id": "ch_signal_01",
		"title": "First Shift",
		"hint": "Swipe a row or column — one move settles the lattice.",
		"mode": "align",
		"par_soft": 3,
		"par_hard": 1,
		"puzzle": {
			"id": "ch_signal_01",
			"mode": "align",
			"seed_value": 101,
			"difficulty": 1,
			"width": 3,
			"height": 3,
			"pattern_id": "solid_half_3",
			"goal_occupants": ["A", "A", "A", "A", "A", "A", "B", "B", "B"],
			"start_occupants": ["A", "A", "A", "B", "A", "A", "B", "B", "A"],
			"scramble_depth": 1,
			"optimal_moves": 1,
			"optimal_is_exact": true,
			"move_budget": 4,
			"par_soft": 3,
			"par_hard": 1,
			"hint_first_move": {
				"type": 1, "row": 1, "column": 0, "dir": -1, "steps": 1, "turns": 1,
			},
			"meta": {"teach": "swipe", "campaign": true},
		},
	}


static func _lv_02_laser() -> Dictionary:
	## Emitter → crate → empty → receiver. Shift crate off the beam.
	return _base_laser(
		"ch_signal_02", "Clear Signal", "Shift the crate off the beam path.",
		5, 4, 5, 2,
		[
			{"cell": [0, 1], "id": "laser_emitter"},
			{"cell": [1, 1], "id": "crate"},
			{"cell": [3, 1], "id": "laser_receiver"},
			{"cell": [4, 3], "id": "door"},
		]
	)


static func _lv_03_mirror() -> Dictionary:
	## Emitter shoots east; mirror one row down — shift mirror up to bend north to receiver.
	return _base_laser(
		"ch_signal_03", "Prism Bend", "Slide the mirror into the beam.",
		5, 5, 6, 3,
		[
			{"cell": [0, 2], "id": "laser_emitter"},
			{"cell": [2, 3], "id": "mirror"},
			{"cell": [2, 0], "id": "laser_receiver"},
			{"cell": [4, 4], "id": "door"},
		]
	)


static func _lv_04_switch_door() -> Dictionary:
	## Tap switch to latch door channel (no laser required).
	return _base_laser(
		"ch_signal_04", "Open Gate", "Tap the switch to open the door channel.",
		4, 4, 4, 1,
		[
			{"cell": [0, 1], "id": "switch"},
			{"cell": [3, 1], "id": "door"},
		]
	)


static func _lv_05_laser_door() -> Dictionary:
	## Classic: clear crate so beam hits receiver → door channel.
	return _base_laser(
		"ch_signal_05", "Receiver Latch", "Beam the receiver to arm the door.",
		6, 4, 7, 3,
		[
			{"cell": [0, 1], "id": "laser_emitter"},
			{"cell": [2, 1], "id": "crate"},
			{"cell": [4, 1], "id": "laser_receiver"},
			{"cell": [5, 3], "id": "door"},
		]
	)


static func _lv_06_color_block() -> Dictionary:
	## Red blocks beam on column; column-cycle around red, or row-carry red aside.
	return _base_laser(
		"ch_signal_06", "Axis Lock", "Red rides rows; columns cycle around it.",
		6, 5, 8, 4,
		[
			{"cell": [0, 2], "id": "laser_emitter"},
			{"cell": [2, 2], "id": "block_red"},
			{"cell": [4, 2], "id": "laser_receiver"},
			{"cell": [5, 4], "id": "door"},
			{"cell": [2, 0], "id": "crate"},
			{"cell": [2, 4], "id": "crate"},
		]
	)


static func _lv_07_capstone() -> Dictionary:
	## Mirror + crate + red teaching combine; receiver arms door.
	return _base_laser(
		"ch_signal_07", "Full Spectrum", "Compose swipe, beam, mirror, and red.",
		7, 6, 10, 5,
		[
			{"cell": [0, 3], "id": "laser_emitter"},
			{"cell": [1, 3], "id": "crate"},
			{"cell": [3, 4], "id": "mirror"},
			{"cell": [3, 1], "id": "block_red"},
			{"cell": [3, 0], "id": "laser_receiver"},
			{"cell": [5, 3], "id": "door"},
			{"cell": [6, 5], "id": "switch"},
		]
	)
