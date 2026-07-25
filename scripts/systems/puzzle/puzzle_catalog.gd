class_name PuzzleCatalog
extends RefCounted
## Builds stock PuzzleObjectDefs in code (also mirrored as .tres under resources/puzzles/objects/).
## Tests and demos call PuzzleCatalog.build_all().


static func build_all() -> Array[PuzzleObjectDef]:
	var defs: Array[PuzzleObjectDef] = []
	defs.append(_wall())
	defs.append(_door())
	defs.append(_heavy_door())
	defs.append(_switch())
	defs.append(_pressure_plate())
	defs.append(_mirror_slash())
	defs.append(_mirror_backslash())
	defs.append(_laser_emitter())
	defs.append(_laser_receiver())
	defs.append(_magnet())
	defs.append(_teleporter())
	defs.append(_ghost_block())
	defs.append(_gravity_floor())
	defs.append(_gravity_block())
	defs.append(_ice())
	defs.append(_fire())
	defs.append(_burnable_crate())
	defs.append(_time_chronolock())
	defs.append(_time_slow())
	defs.append(_time_rewind())
	defs.append(_enemy_patrol())
	defs.append(_crate())
	defs.append(_block_red())
	defs.append(_block_blue())
	defs.append(_block_green())
	defs.append(_block_yellow())
	return defs


static func _def(id: StringName, name: String, tags: PackedStringArray, comps: Array) -> PuzzleObjectDef:
	var d := PuzzleObjectDef.new()
	d.id = id
	d.display_name = name
	d.tags = tags
	d.components = []
	for c in comps:
		d.components.append(c)
	return d


static func _wall() -> PuzzleObjectDef:
	return _def(&"wall", "Wall", PackedStringArray(), [
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _door() -> PuzzleObjectDef:
	return _def(&"door", "Door", PackedStringArray(), [
		PuzzleComponentSpec.make(&"door", {"channel": "door", "inverted": false}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _heavy_door() -> PuzzleObjectDef:
	## Variant of door — same components, different channel/params. No new class.
	return _def(&"heavy_door", "Heavy Door", PackedStringArray(["heavy"]), [
		PuzzleComponentSpec.make(&"door", {"channel": "heavy_door", "inverted": false, "start_open": false}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _switch() -> PuzzleObjectDef:
	return _def(&"switch", "Switch", PackedStringArray(), [
		PuzzleComponentSpec.make(&"switch", {"channel": "door", "toggle": true}),
	])


static func _pressure_plate() -> PuzzleObjectDef:
	return _def(&"pressure_plate", "Pressure Plate", PackedStringArray(["floor"]), [
		PuzzleComponentSpec.make(&"pressure_plate", {"channel": "door"}),
	])


static func _mirror_slash() -> PuzzleObjectDef:
	return _def(&"mirror", "Mirror /", PackedStringArray(), [
		PuzzleComponentSpec.make(&"mirror", {"orientation": "slash"}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _mirror_backslash() -> PuzzleObjectDef:
	return _def(&"mirror_backslash", "Mirror \\", PackedStringArray(), [
		PuzzleComponentSpec.make(&"mirror", {"orientation": "backslash"}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _laser_emitter() -> PuzzleObjectDef:
	return _def(&"laser_emitter", "Laser Emitter", PackedStringArray(), [
		PuzzleComponentSpec.make(&"laser_emitter", {"dir": 0, "beam_color": "red", "max_length": 64}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _laser_receiver() -> PuzzleObjectDef:
	return _def(&"laser_receiver", "Laser Receiver", PackedStringArray(), [
		PuzzleComponentSpec.make(&"laser_receiver", {"channel": "door", "required_color": "red", "absorb": true}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _magnet() -> PuzzleObjectDef:
	return _def(&"magnet", "Magnet", PackedStringArray(), [
		PuzzleComponentSpec.make(&"magnet", {"polarity": 1, "axis": "row", "range_cells": 8, "target_tag": "magnetic"}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _teleporter() -> PuzzleObjectDef:
	return _def(&"teleporter", "Teleporter", PackedStringArray(["floor"]), [
		PuzzleComponentSpec.make(&"teleporter", {"link_id": "tp_a", "cooldown_ticks": 1}),
	])


static func _ghost_block() -> PuzzleObjectDef:
	return _def(&"ghost_block", "Ghost Block", PackedStringArray(["ghost"]), [
		PuzzleComponentSpec.make(&"ghost", {"phase_channel": "door", "always_phased": false}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _gravity_floor() -> PuzzleObjectDef:
	return _def(&"gravity_floor", "Gravity Floor", PackedStringArray(["floor"]), [
		PuzzleComponentSpec.make(&"gravity", {"dir": 1}), ## SOUTH
	])


static func _gravity_block() -> PuzzleObjectDef:
	return _def(&"gravity_block", "Gravity Block", PackedStringArray(["magnetic"]), [
		PuzzleComponentSpec.make(&"movable", {"mass": 1}),
		PuzzleComponentSpec.make(&"gravity", {"dir": 1}),
		PuzzleComponentSpec.make(&"presser", {}),
	])


static func _ice() -> PuzzleObjectDef:
	return _def(&"ice", "Ice", PackedStringArray(["floor"]), [
		PuzzleComponentSpec.make(&"ice", {}),
	])


static func _fire() -> PuzzleObjectDef:
	return _def(&"fire", "Fire", PackedStringArray(["floor"]), [
		PuzzleComponentSpec.make(&"fire", {"damage": 1, "tick_interval": 1, "spread": false}),
	])


static func _burnable_crate() -> PuzzleObjectDef:
	return _def(&"burnable_crate", "Burnable Crate", PackedStringArray(["presser"]), [
		PuzzleComponentSpec.make(&"movable", {}),
		PuzzleComponentSpec.make(&"presser", {}),
		PuzzleComponentSpec.make(&"burnable", {"hp": 1}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _time_chronolock() -> PuzzleObjectDef:
	return _def(&"time_chronolock", "Chronolock", PackedStringArray(["floor"]), [
		PuzzleComponentSpec.make(&"time", {"mode": PuzzleEnums.TimeMode.CHRONOLOCK, "radius": 2, "channel": ""}),
	])


static func _time_slow() -> PuzzleObjectDef:
	return _def(&"time_slow", "Time Slow", PackedStringArray(["floor"]), [
		PuzzleComponentSpec.make(&"time", {"mode": PuzzleEnums.TimeMode.SLOW, "radius": 2, "slow_factor": 2}),
	])


static func _time_rewind() -> PuzzleObjectDef:
	return _def(&"time_rewind", "Rewind Pocket", PackedStringArray(["floor"]), [
		PuzzleComponentSpec.make(&"time", {"mode": PuzzleEnums.TimeMode.REWIND_POCKET, "radius": 1, "pocket_depth": 4}),
	])


static func _enemy_patrol() -> PuzzleObjectDef:
	return _def(&"enemy_patrol", "Patrol Enemy", PackedStringArray(["enemy", "presser"]), [
		PuzzleComponentSpec.make(&"actor", {"pattern": [0, 0, 2, 2], "step_interval": 1}), ## E,E,W,W
		PuzzleComponentSpec.make(&"movable", {}),
		PuzzleComponentSpec.make(&"presser", {}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _crate() -> PuzzleObjectDef:
	return _def(&"crate", "Crate", PackedStringArray(["presser", "magnetic"]), [
		PuzzleComponentSpec.make(&"movable", {}),
		PuzzleComponentSpec.make(&"presser", {}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


## Color blocks — distinct occupants with modular rules (presentation + sim).
## Red: solid pushable + horizontal axis-lock (row shifts only; AxisLockFilter).
## Blue: gravity-sensitive movable.
## Green: clones once into adjacent empty after a shift.
## Yellow: countdown fuse then destroy (explode event).
static func _block_red() -> PuzzleObjectDef:
	return _def(&"block_red", "Red Block", PackedStringArray(["presser", "magnetic", "color_block", "axis"]), [
		PuzzleComponentSpec.make(&"movable", {}),
		PuzzleComponentSpec.make(&"presser", {}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
		PuzzleComponentSpec.make(&"axis_lock", {"mode": "horizontal"}),
	])


static func _block_blue() -> PuzzleObjectDef:
	return _def(&"block_blue", "Blue Block", PackedStringArray(["presser", "magnetic", "color_block"]), [
		PuzzleComponentSpec.make(&"movable", {"mass": 1}),
		PuzzleComponentSpec.make(&"gravity", {"dir": 1}),
		PuzzleComponentSpec.make(&"presser", {}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
	])


static func _block_green() -> PuzzleObjectDef:
	return _def(&"block_green", "Green Block", PackedStringArray(["presser", "magnetic", "color_block", "clone"]), [
		PuzzleComponentSpec.make(&"movable", {}),
		PuzzleComponentSpec.make(&"presser", {}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
		PuzzleComponentSpec.make(&"clone", {"clone_def": "block_green"}),
	])


static func _block_yellow() -> PuzzleObjectDef:
	return _def(&"block_yellow", "Yellow Block", PackedStringArray(["presser", "magnetic", "color_block", "fuse"]), [
		PuzzleComponentSpec.make(&"movable", {}),
		PuzzleComponentSpec.make(&"presser", {}),
		PuzzleComponentSpec.make(&"blocking", {"blocks": true}),
		PuzzleComponentSpec.make(&"countdown", {"turns": 3}),
	])
