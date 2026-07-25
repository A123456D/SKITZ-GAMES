class_name PuzzleCatalogBuilder
extends RefCounted
## Offline catalog builder: emit thousands of unique seed entries and/or light PuzzleDefs.

signal progress(done: int, total: int, unique: int)


func build_seed_catalog(
	base_seed: int,
	count: int,
	difficulty: int = 3,
	params: PuzzleGenParams = null
) -> Array:
	var gen := PuzzleGenerator.new()
	var fingerprints: Dictionary = {}
	var entries: Array = []
	var i := 0
	var guard := 0
	var max_guard := count * 8
	while entries.size() < count and guard < max_guard:
		guard += 1
		var seed_value := _mix(base_seed, i)
		i += 1
		var puzzle := gen.generate(seed_value, difficulty, params)
		if fingerprints.has(puzzle.state_fingerprint):
			continue
		fingerprints[puzzle.state_fingerprint] = true
		entries.append({
			"seed": seed_value,
			"difficulty": difficulty,
			"fingerprint": puzzle.state_fingerprint,
			"optimal_moves": puzzle.optimal_moves,
			"optimal_is_exact": puzzle.optimal_is_exact,
			"score": puzzle.difficulty_score,
			"pattern_id": String(puzzle.pattern_id),
			"width": puzzle.width,
			"height": puzzle.height,
			"params": puzzle.gen_params,
		})
		progress.emit(entries.size(), count, fingerprints.size())
	return entries


func build_puzzle_defs(
	base_seed: int,
	count: int,
	difficulty: int = 3,
	params: PuzzleGenParams = null
) -> Array[PuzzleDef]:
	var gen := PuzzleGenerator.new()
	var fingerprints: Dictionary = {}
	var out: Array[PuzzleDef] = []
	var i := 0
	var guard := 0
	var max_guard := count * 8
	while out.size() < count and guard < max_guard:
		guard += 1
		var seed_value := _mix(base_seed, i)
		i += 1
		var puzzle := gen.generate(seed_value, difficulty, params)
		if fingerprints.has(puzzle.state_fingerprint):
			continue
		fingerprints[puzzle.state_fingerprint] = true
		out.append(puzzle)
		progress.emit(out.size(), count, fingerprints.size())
	return out


## Write a JSON catalog (seed+params preferred for thousands of levels).
func write_json_catalog(path: String, entries: Array, pretty: bool = true) -> Error:
	var envelope := {
		"format": "shiftr_puzzle_catalog",
		"schema_version": 1,
		"count": entries.size(),
		"entries": entries,
	}
	var text := JSON.stringify(envelope, "\t" if pretty else "")
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return FileAccess.get_open_error()
	f.store_string(text)
	f.close()
	return OK


## Bake a small sample of PuzzleDef dictionaries as JSON (for demos / CI fixtures).
func write_baked_json(path: String, puzzles: Array[PuzzleDef], pretty: bool = true) -> Error:
	var arr: Array = []
	for p in puzzles:
		arr.append(p.to_dict())
	var envelope := {
		"format": "shiftr_puzzle_defs",
		"schema_version": 1,
		"count": arr.size(),
		"puzzles": arr,
	}
	var text := JSON.stringify(envelope, "\t" if pretty else "")
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return FileAccess.get_open_error()
	f.store_string(text)
	f.close()
	return OK


static func uniqueness_rate(entries: Array) -> float:
	if entries.is_empty():
		return 1.0
	var seen: Dictionary = {}
	for e in entries:
		var fp := str(e.get("fingerprint", e.get("state_fingerprint", "")))
		seen[fp] = true
	return float(seen.size()) / float(entries.size())


static func _mix(base: int, i: int) -> int:
	var x := (base if base != 0 else 1) ^ ((i + 1) * 0x85EBCA6B)
	x = (x * 0xC2B2AE35) & 0x7FFFFFFF
	return x if x != 0 else i + 1
