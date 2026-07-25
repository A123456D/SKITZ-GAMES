class_name AchievementService
extends RefCounted
## Data-driven unlocks → local progress + platform adapter.
## Source of truth for progress is the save profile; platform is a mirror.

signal unlocked(achievement_id: StringName)
signal progress_changed(achievement_id: StringName, current: int, target: int)

var gateway: PlatformGateway = null
var save: SaveService = null
## id -> AchievementDef (catalog defs; progress mirrored from save)
var defs: Dictionary = {}


func configure(p_gateway: PlatformGateway, p_save: SaveService) -> void:
	gateway = p_gateway
	save = p_save


func load_defs_from_catalog(achievements: Array) -> void:
	defs.clear()
	for a in achievements:
		if a is AchievementDef:
			var def := a as AchievementDef
			defs[def.id] = def
	_hydrate_from_save()


func load_builtin_gdd_set() -> void:
	## Minimal ship set from GDD §12 when no catalog is wired.
	var cat := SampleUiCatalog.make_builtin()
	load_defs_from_catalog(cat.achievements)


func get_def(id: StringName) -> AchievementDef:
	return defs.get(id) as AchievementDef


func list_defs() -> Array:
	return defs.values()


func set_progress(id: StringName, value: int, persist: bool = true) -> void:
	var def := get_def(id)
	if def == null:
		return
	var target := maxi(1, def.target)
	var next := clampi(value, 0, target)
	def.progress = next
	_write_save_entry(id, def)
	progress_changed.emit(id, next, target)
	if gateway:
		gateway.set_achievement_progress(id, next, target)
	if next >= target and not def.unlocked:
		_do_unlock(def)
	elif persist and save:
		save.save_local()


func add_progress(id: StringName, delta: int = 1) -> void:
	var def := get_def(id)
	if def == null:
		return
	set_progress(id, def.progress + delta)


func unlock(id: StringName) -> void:
	var def := get_def(id)
	if def == null or def.unlocked:
		return
	def.progress = def.target
	_do_unlock(def)


func _do_unlock(def: AchievementDef) -> void:
	def.unlocked = true
	def.unlocked_label = Time.get_date_string_from_system()
	_write_save_entry(def.id, def)
	if save:
		save.save_local()
	if gateway:
		gateway.unlock_achievement(def.id, 100.0)
		gateway.add_breadcrumb("achievement", "unlocked", {"id": String(def.id)})
	unlocked.emit(def.id)


func _hydrate_from_save() -> void:
	if save == null or save.profile.is_empty():
		return
	var map: Dictionary = save.profile.get("achievements", {})
	for id in defs.keys():
		var def: AchievementDef = defs[id]
		var entry: Variant = map.get(String(id), {})
		if entry is Dictionary:
			def.progress = int(entry.get("progress", def.progress))
			def.unlocked = bool(entry.get("unlocked", def.unlocked))
			def.unlocked_label = str(entry.get("unlocked_label", def.unlocked_label))


func _write_save_entry(id: StringName, def: AchievementDef) -> void:
	if save == null:
		return
	if not save.profile.has("achievements"):
		save.profile["achievements"] = {}
	save.profile["achievements"][String(id)] = {
		"progress": def.progress,
		"unlocked": def.unlocked,
		"unlocked_label": def.unlocked_label,
		"unlocked_unix": int(Time.get_unix_time_from_system()) if def.unlocked else 0,
	}
