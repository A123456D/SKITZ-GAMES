class_name SatisfactionCatalog
extends Resource
## Lookup table of EffectRecipe by id. Prefer authored .tres; build_builtin() is fallback.

@export var recipes: Array[EffectRecipe] = []

var _by_id: Dictionary = {}


func ensure_index() -> void:
	_by_id.clear()
	for r in recipes:
		if r and r.id != &"":
			_by_id[r.id] = r


func get_recipe(id: StringName) -> EffectRecipe:
	if _by_id.is_empty():
		ensure_index()
	return _by_id.get(id) as EffectRecipe


func has_recipe(id: StringName) -> bool:
	return get_recipe(id) != null


func register(recipe: EffectRecipe) -> void:
	if recipe == null or recipe.id == &"":
		return
	for i in recipes.size():
		if recipes[i] and recipes[i].id == recipe.id:
			recipes[i] = recipe
			_by_id[recipe.id] = recipe
			return
	recipes.append(recipe)
	_by_id[recipe.id] = recipe


static func load_or_builtin() -> SatisfactionCatalog:
	var cat := build_builtin()
	# Authored recipe assets override builtins (add a .tres under recipes/).
	var dir := DirAccess.open("res://resources/configs/feel/recipes")
	if dir:
		dir.list_dir_begin()
		var fn := dir.get_next()
		while fn != "":
			if fn.ends_with(".tres"):
				var res := load("res://resources/configs/feel/recipes/%s" % fn)
				if res is EffectRecipe:
					cat.register(res as EffectRecipe)
			fn = dir.get_next()
	# Optional catalog resource can replace wholesale if it has entries.
	var path := "res://resources/configs/feel/default_satisfaction_catalog.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is SatisfactionCatalog:
			var authored := res as SatisfactionCatalog
			if not authored.recipes.is_empty():
				authored.ensure_index()
				return authored
	cat.ensure_index()
	return cat


static func build_builtin() -> SatisfactionCatalog:
	var cat := SatisfactionCatalog.new()
	for r in _builtin_list():
		cat.register(r)
	return cat


static func _builtin_list() -> Array[EffectRecipe]:
	var out: Array[EffectRecipe] = []
	out.append(_r(&"swipe_commit", EffectRecipe.Intensity.MEDIUM, {
		"anticipation": true, "anticipation_ms": 28.0,
		"nudge_pixels": 5.0, "nudge_opposite_first": true,
		"audio_whoosh": true, "haptic": 1,
	}))
	out.append(_r(&"shift_travel", EffectRecipe.Intensity.MEDIUM, {
		"secondary_motion": true, "audio_whoosh": false,
	}))
	out.append(_r(&"wrap_edge", EffectRecipe.Intensity.MEDIUM, {
		"trauma": 0.12, "wrap_particles": true, "particles": true,
		"glow_pulse": true, "glow_ms": 90.0, "haptic": 1,
	}))
	out.append(_r(&"puzzle_solve", EffectRecipe.Intensity.HEAVY, {
		"hit_stop_ms": 70.0, "trauma": 0.38, "zoom_pulse": 0.028, "zoom_pulse_ms": 220.0,
		"particles": true, "particle_amount": 36,
		"glow_pulse": true, "glow_strength": 1.45, "glow_ms": 420.0,
		"audio_land": true, "audio_sub": true, "audio_solve": true, "audio_combo": true,
		"squash": true, "follow_through": true, "follow_through_ms": 160.0, "haptic": 3,
	}))
	out.append(_r(&"land_settle", EffectRecipe.Intensity.MEDIUM, {
		"hit_stop_ms": 32.0, "trauma": 0.24, "zoom_pulse": 0.016, "zoom_pulse_ms": 120.0,
		"particles": true, "glow_pulse": true, "glow_strength": 0.95, "glow_ms": 120.0,
		"audio_tick": true, "audio_land": true, "audio_sub": true,
		"follow_through": true, "secondary_motion": true, "haptic": 2,
	}))
	out.append(_r(&"chain_queue", EffectRecipe.Intensity.MICRO, {
		"hit_stop_ms": 0.0, "trauma": 0.1, "zoom_pulse": 0.0,
		"particles": true, "particle_amount": 6,
		"audio_whoosh": true, "audio_tick": true, "audio_land": true,
		"haptic": 1,
	}))
	out.append(_r(&"undo_redo", EffectRecipe.Intensity.MICRO, {
		"audio_ui": true, "audio_whoosh": true, "glow_pulse": true, "glow_ms": 80.0, "haptic": 1,
	}))
	out.append(_r(&"invalid_input", EffectRecipe.Intensity.MICRO, {
		"audio_error": true, "squash": true, "squash_scale": Vector2(0.97, 1.03),
		"squash_ms": 50.0, "glow_pulse": true, "glow_strength": 0.4, "haptic": 1,
	}))
	out.append(_r(&"button_press", EffectRecipe.Intensity.MICRO, {
		"audio_ui": true, "particles": true, "particle_amount": 8, "haptic": 1,
	}))
	out.append(_r(&"screen_transition", EffectRecipe.Intensity.MEDIUM, {
		"audio_whoosh": true, "glow_pulse": true, "glow_ms": 160.0,
	}))
	out.append(_r(&"combo_cascade", EffectRecipe.Intensity.MEDIUM, {
		"trauma": 0.14, "particles": true, "glow_pulse": true,
		"audio_combo": true, "haptic": 3,
	}))
	out.append(_r(&"door_open", EffectRecipe.Intensity.MEDIUM, {
		"hit_stop_ms": 16.0, "trauma": 0.08, "particles": true, "particle_amount": 10,
		"glow_pulse": true, "anticipation": true, "audio_whoosh": true, "audio_tick": true, "haptic": 2,
	}))
	out.append(_r(&"laser_fire", EffectRecipe.Intensity.MEDIUM, {
		"glow_pulse": true, "glow_strength": 1.0, "particles": true, "particle_amount": 6,
		"audio_tick": true, "audio_whoosh": true,
	}))
	out.append(_r(&"switch_toggle", EffectRecipe.Intensity.MICRO, {
		"glow_pulse": true, "squash": true, "squash_scale": Vector2(0.94, 0.94),
		"audio_ui": true, "haptic": 1,
	}))
	out.append(_r(&"teleport", EffectRecipe.Intensity.MEDIUM, {
		"hit_stop_ms": 18.0, "trauma": 0.1, "zoom_pulse": 0.012,
		"particles": true, "glow_pulse": true, "audio_whoosh": true, "audio_tick": true, "haptic": 2,
	}))
	out.append(_r(&"ice_slide", EffectRecipe.Intensity.MEDIUM, {
		"trauma": 0.06, "audio_whoosh": true, "follow_through": true, "follow_through_ms": 90.0,
		"secondary_motion": true, "squash": true, "squash_ms": 30.0, "haptic": 1,
	}))
	out.append(_r(&"enemy_move", EffectRecipe.Intensity.MICRO, {
		"audio_tick": true, "glow_pulse": true, "glow_strength": 0.35, "glow_ms": 70.0,
	}))
	out.append(_r(&"achievement_reward", EffectRecipe.Intensity.HEAVY, {
		"hit_stop_ms": 40.0, "trauma": 0.25, "zoom_pulse": 0.02,
		"particles": true, "particle_amount": 24,
		"glow_pulse": true, "glow_strength": 1.3, "glow_ms": 400.0,
		"audio_solve": true, "audio_sub": true, "audio_combo": true, "haptic": 3,
	}))
	out.append(_r(&"error_fail", EffectRecipe.Intensity.MEDIUM, {
		"trauma": 0.08, "audio_error": true, "audio_land": true,
		"squash": true, "squash_scale": Vector2(1.04, 0.92), "glow_pulse": true,
		"glow_strength": 0.5, "haptic": 2,
	}))
	return out


static func _r(id: StringName, intensity: EffectRecipe.Intensity, props: Dictionary) -> EffectRecipe:
	var recipe := EffectRecipe.new()
	recipe.id = id
	recipe.intensity = intensity
	for k in props:
		recipe.set(k, props[k])
	return recipe
