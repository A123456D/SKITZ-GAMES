class_name AudioCatalog
extends Resource
## Lookup table of AudioEventDef by id. Prefer shipping .tres events; builtins cover demo.

@export var events: Array[AudioEventDef] = []

var _by_id: Dictionary = {}


func rebuild_index() -> void:
	_by_id.clear()
	for e in events:
		if e == null or e.id == &"":
			continue
		_by_id[e.id] = e


func get_event(id: StringName) -> AudioEventDef:
	if _by_id.is_empty() and not events.is_empty():
		rebuild_index()
	return _by_id.get(id) as AudioEventDef


func has_event(id: StringName) -> bool:
	return get_event(id) != null


static func load_or_builtin() -> AudioCatalog:
	var path := "res://resources/configs/audio/default_audio_catalog.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is AudioCatalog:
			var cat := res as AudioCatalog
			if cat.events.is_empty():
				cat.events = _builtin_events()
			cat.rebuild_index()
			return cat
	var built := AudioCatalog.new()
	built.events = _builtin_events()
	built.rebuild_index()
	return built


static func _builtin_events() -> Array[AudioEventDef]:
	var out: Array[AudioEventDef] = []
	out.append(_ev(&"shift_whoosh", &"SFX_Movement", "res://assets/audio/sfx/shift_whoosh.wav", "WHOOSH", false, true))
	out.append(_ev(&"shift_tick", &"SFX_Movement", "res://assets/audio/sfx/shift_tick.wav", "TICK", false, true))
	out.append(_ev(&"shift_land", &"SFX_Movement", "res://assets/audio/sfx/shift_land.wav", "LAND", true, true))
	out.append(_ev(&"shift_sub", &"SFX_Juice", "", "SUB", false, false))
	out.append(_ev(&"shift_combo", &"SFX_Juice", "res://assets/audio/sfx/shift_combo.wav", "COMBO", true, false))
	out.append(_ev(&"ui_click", &"SFX_UI", "res://assets/audio/ui/ui_click.wav", "UI", false, false))
	out.append(_ev(&"ui_error", &"SFX_UI", "res://assets/audio/ui/ui_error.wav", "ERROR", false, false))
	out.append(_ev(&"puzzle_solve", &"SFX_Juice", "res://assets/audio/sfx/puzzle_solve.wav", "SOLVE", false, false))
	out.append(_ev(&"laser_fire", &"SFX_Puzzle", "res://assets/audio/sfx/laser_fire.wav", "LASER", true, false))
	out.append(_ev(&"switch_toggle", &"SFX_Puzzle", "res://assets/audio/sfx/switch_toggle.wav", "SWITCH", false, false))
	out.append(_ev(&"button_press", &"SFX_Puzzle", "res://assets/audio/sfx/button_press.wav", "BUTTON", false, false))
	out.append(_ev(&"particle_spark", &"SFX_Particles", "res://assets/audio/sfx/particle_spark.wav", "PARTICLE", true, false))
	var victory := _ev(&"stinger_victory", &"Music_Stinger", "res://assets/audio/music/stinger_victory.wav", "SOLVE", false, false)
	victory.category = &"music"
	victory.duck_music_db = 8.0
	victory.duck_ms = 900.0
	out.append(victory)
	var failure := _ev(&"stinger_failure", &"Music_Stinger", "res://assets/audio/music/stinger_failure.wav", "ERROR", false, false)
	failure.category = &"music"
	failure.duck_music_db = 6.0
	failure.duck_ms = 700.0
	out.append(failure)
	return out


static func _ev(
	id: StringName,
	bus: StringName,
	path: String,
	proc: String,
	spatial: bool,
	combo: bool
) -> AudioEventDef:
	var e := AudioEventDef.new()
	e.id = id
	e.bus = bus
	e.procedural_kind = proc
	e.spatial = spatial
	e.use_combo_pitch = combo
	e.category = &"sfx"
	if path != "" and ResourceLoader.exists(path):
		var res := load(path)
		if res is AudioStream:
			e.stream = res as AudioStream
	return e
