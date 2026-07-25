class_name SeededRNG
extends RefCounted
## Deterministic RNG boundary for future Cascade / spawn commands.
## Core shift/rotate paths never call this. When RNG is required, put the seed
## on BoardCommand.rng_seed (or derive from run_seed + command_id) so peers match.

var _state: int = 0


func _init(seed_value: int = 0) -> void:
	reseed(seed_value)


func reseed(seed_value: int) -> void:
	# xorshift32 rejects 0 state
	_state = seed_value if seed_value != 0 else 1


func get_state() -> int:
	return _state


func set_state(s: int) -> void:
	_state = s if s != 0 else 1


func next_u32() -> int:
	var x := _state
	x ^= (x << 13) & 0xFFFFFFFF
	x ^= (x >> 17)
	x ^= (x << 5) & 0xFFFFFFFF
	_state = x & 0xFFFFFFFF
	return _state


func next_int(max_exclusive: int) -> int:
	assert(max_exclusive > 0)
	return int(next_u32() % max_exclusive)


func next_range(min_inclusive: int, max_inclusive: int) -> int:
	assert(max_inclusive >= min_inclusive)
	var span := max_inclusive - min_inclusive + 1
	return min_inclusive + next_int(span)
