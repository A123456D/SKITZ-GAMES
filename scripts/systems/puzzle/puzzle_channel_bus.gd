class_name PuzzleChannelBus
extends RefCounted
## Soft signal bus: switches / plates / laser receivers → doors / ghosts / time locks.
## No hard object refs — everything talks through StringName channels.

signal channel_changed(channel: StringName, active: bool, strength: int)

## channel → press count / activation strength (0 = off).
var _strength: Dictionary = {}
## Sticky toggle latches (switch toggle mode).
var _latches: Dictionary = {}


func clear_ephemeral() -> void:
	## Clears pressure / laser strengths but keeps sticky latches.
	_strength.clear()


func reset_all() -> void:
	_strength.clear()
	_latches.clear()


func get_strength(channel: StringName) -> int:
	var s: int = int(_strength.get(channel, 0))
	var latch: int = int(_latches.get(channel, 0))
	return s + latch


func is_active(channel: StringName) -> bool:
	return get_strength(channel) > 0


func add_strength(channel: StringName, amount: int = 1) -> void:
	if String(channel).is_empty() or amount == 0:
		return
	var prev := get_strength(channel)
	_strength[channel] = int(_strength.get(channel, 0)) + amount
	var now := get_strength(channel)
	if (prev > 0) != (now > 0):
		channel_changed.emit(channel, now > 0, now)


func set_latch(channel: StringName, on: bool) -> void:
	if String(channel).is_empty():
		return
	var prev := get_strength(channel)
	if on:
		_latches[channel] = 1
	else:
		_latches.erase(channel)
	var now := get_strength(channel)
	if (prev > 0) != (now > 0):
		channel_changed.emit(channel, now > 0, now)


func toggle_latch(channel: StringName) -> bool:
	var on := not bool(_latches.get(channel, 0))
	set_latch(channel, on)
	return on


func to_dict() -> Dictionary:
	var strength: Dictionary = {}
	for k in _strength.keys():
		strength[String(k)] = _strength[k]
	var latches: Dictionary = {}
	for k in _latches.keys():
		latches[String(k)] = _latches[k]
	return {"strength": strength, "latches": latches}


func from_dict(data: Dictionary) -> void:
	reset_all()
	var s: Variant = data.get("strength", {})
	if s is Dictionary:
		for k in s.keys():
			_strength[StringName(str(k))] = int(s[k])
	var l: Variant = data.get("latches", {})
	if l is Dictionary:
		for k in l.keys():
			_latches[StringName(str(k))] = int(l[k])
