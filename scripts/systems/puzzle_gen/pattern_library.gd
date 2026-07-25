class_name PatternLibrary
extends RefCounted
## Built-in Align motifs + progressive unlock by tier (pattern recognition curriculum).

static var _cache: Array[PatternTemplate] = []


static func all_templates() -> Array[PatternTemplate]:
	if _cache.is_empty():
		_cache = _build_all()
	return _cache


static func by_id(id: StringName) -> PatternTemplate:
	for t in all_templates():
		if t.id == id:
			return t
	return null


static func templates_for(
	width: int,
	height: int,
	tier_max: int,
	color_count: int
) -> Array[PatternTemplate]:
	var out: Array[PatternTemplate] = []
	for t in all_templates():
		if t.width != width or t.height != height:
			continue
		if t.tier > tier_max:
			continue
		if t.color_count_used() > color_count:
			continue
		out.append(t)
	return out


static func pick(rng: SeededRNG, width: int, height: int, tier_max: int, color_count: int, forced_id: StringName = &"") -> PatternTemplate:
	if forced_id != &"":
		var forced := by_id(forced_id)
		if forced != null and forced.width == width and forced.height == height:
			return forced
	var pool := templates_for(width, height, tier_max, color_count)
	if pool.is_empty():
		# Fallback: synthesize a simple half-split for any size.
		return _synth_half(width, height)
	return pool[rng.next_int(pool.size())]


static func _build_all() -> Array[PatternTemplate]:
	var out: Array[PatternTemplate] = []
	# --- 3x3 ---
	out.append(PatternTemplate.make(&"solid_half_3", "Half Split", PuzzleGenEnums.PatternFamily.SOLID_BLOCKS, 0, 3, 3, [
		0, 0, 0, 0, 0, 0, 1, 1, 1
	], PackedStringArray(["teach", "blocks"])))
	out.append(PatternTemplate.make(&"stripes_h_3", "H Stripes", PuzzleGenEnums.PatternFamily.STRIPES, 1, 3, 3, [
		0, 0, 0, 1, 1, 1, 0, 0, 0
	], PackedStringArray(["stripes"])))
	out.append(PatternTemplate.make(&"stripes_v_3", "V Stripes", PuzzleGenEnums.PatternFamily.STRIPES, 1, 3, 3, [
		0, 1, 0, 0, 1, 0, 0, 1, 0
	], PackedStringArray(["stripes"])))
	out.append(PatternTemplate.make(&"checker_3", "Checker", PuzzleGenEnums.PatternFamily.CHECKER, 2, 3, 3, [
		0, 1, 0, 1, 0, 1, 0, 1, 0
	], PackedStringArray(["checker"])))
	out.append(PatternTemplate.make(&"frame_3", "Frame", PuzzleGenEnums.PatternFamily.FRAME, 3, 3, 3, [
		1, 1, 1, 1, 0, 1, 1, 1, 1
	], PackedStringArray(["frame"])))
	out.append(PatternTemplate.make(&"letter_l_3", "L Motif", PuzzleGenEnums.PatternFamily.LETTER, 4, 3, 3, [
		0, 1, 1, 0, 1, 1, 0, 0, 0
	], PackedStringArray(["letter"])))

	# --- 4x4 ---
	out.append(PatternTemplate.make(&"quad_4", "Quad Blocks", PuzzleGenEnums.PatternFamily.SOLID_BLOCKS, 0, 4, 4, [
		0, 0, 1, 1,
		0, 0, 1, 1,
		2, 2, 3, 3,
		2, 2, 3, 3
	], PackedStringArray(["teach", "blocks", "gdd_example"])))
	out.append(PatternTemplate.make(&"half_4", "Vertical Halves", PuzzleGenEnums.PatternFamily.SOLID_BLOCKS, 0, 4, 4, [
		0, 0, 1, 1,
		0, 0, 1, 1,
		0, 0, 1, 1,
		0, 0, 1, 1
	], PackedStringArray(["blocks"])))
	out.append(PatternTemplate.make(&"stripes_h_4", "H Stripes", PuzzleGenEnums.PatternFamily.STRIPES, 1, 4, 4, [
		0, 0, 0, 0,
		1, 1, 1, 1,
		0, 0, 0, 0,
		1, 1, 1, 1
	], PackedStringArray(["stripes"])))
	out.append(PatternTemplate.make(&"stripes_v_4", "V Stripes", PuzzleGenEnums.PatternFamily.STRIPES, 1, 4, 4, [
		0, 1, 0, 1,
		0, 1, 0, 1,
		0, 1, 0, 1,
		0, 1, 0, 1
	], PackedStringArray(["stripes"])))
	out.append(PatternTemplate.make(&"checker_4", "Checker", PuzzleGenEnums.PatternFamily.CHECKER, 2, 4, 4, [
		0, 1, 0, 1,
		1, 0, 1, 0,
		0, 1, 0, 1,
		1, 0, 1, 0
	], PackedStringArray(["checker"])))
	out.append(PatternTemplate.make(&"frame_4", "Frame", PuzzleGenEnums.PatternFamily.FRAME, 3, 4, 4, [
		1, 1, 1, 1,
		1, 0, 0, 1,
		1, 0, 0, 1,
		1, 1, 1, 1
	], PackedStringArray(["frame"])))
	out.append(PatternTemplate.make(&"letter_t_4", "T Motif", PuzzleGenEnums.PatternFamily.LETTER, 4, 4, 4, [
		0, 0, 0, 0,
		1, 0, 1, 1,
		1, 0, 1, 1,
		1, 0, 1, 1
	], PackedStringArray(["letter"])))
	out.append(PatternTemplate.make(&"letter_c_4", "C Motif", PuzzleGenEnums.PatternFamily.LETTER, 4, 4, 4, [
		0, 0, 0, 1,
		0, 1, 1, 1,
		0, 1, 1, 1,
		0, 0, 0, 1
	], PackedStringArray(["letter"])))
	out.append(PatternTemplate.make(&"tri_band_4", "Tri Band", PuzzleGenEnums.PatternFamily.STRIPES, 2, 4, 4, [
		0, 0, 0, 0,
		1, 1, 1, 1,
		2, 2, 2, 2,
		0, 0, 0, 0
	], PackedStringArray(["stripes", "entropy"])))

	# --- 5x5 ---
	out.append(PatternTemplate.make(&"cross_5", "Cross", PuzzleGenEnums.PatternFamily.LETTER, 3, 5, 5, [
		1, 1, 0, 1, 1,
		1, 1, 0, 1, 1,
		0, 0, 0, 0, 0,
		1, 1, 0, 1, 1,
		1, 1, 0, 1, 1
	], PackedStringArray(["letter", "cross"])))
	out.append(PatternTemplate.make(&"frame_5", "Frame", PuzzleGenEnums.PatternFamily.FRAME, 3, 5, 5, [
		1, 1, 1, 1, 1,
		1, 0, 0, 0, 1,
		1, 0, 2, 0, 1,
		1, 0, 0, 0, 1,
		1, 1, 1, 1, 1
	], PackedStringArray(["frame"])))
	out.append(PatternTemplate.make(&"checker_5", "Checker", PuzzleGenEnums.PatternFamily.CHECKER, 2, 5, 5, [
		0, 1, 0, 1, 0,
		1, 0, 1, 0, 1,
		0, 1, 0, 1, 0,
		1, 0, 1, 0, 1,
		0, 1, 0, 1, 0
	], PackedStringArray(["checker"])))
	out.append(PatternTemplate.make(&"stripes_h_5", "H Stripes", PuzzleGenEnums.PatternFamily.STRIPES, 1, 5, 5, [
		0, 0, 0, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 0, 0, 0,
		1, 1, 1, 1, 1,
		2, 2, 2, 2, 2
	], PackedStringArray(["stripes"])))
	out.append(PatternTemplate.make(&"blocks_5", "Corner Blocks", PuzzleGenEnums.PatternFamily.SOLID_BLOCKS, 0, 5, 5, [
		0, 0, 1, 1, 1,
		0, 0, 1, 1, 1,
		2, 2, 2, 3, 3,
		2, 2, 2, 3, 3,
		2, 2, 2, 3, 3
	], PackedStringArray(["blocks"])))
	out.append(PatternTemplate.make(&"letter_s_5", "S Motif", PuzzleGenEnums.PatternFamily.LETTER, 4, 5, 5, [
		0, 0, 0, 1, 1,
		0, 1, 1, 1, 1,
		0, 0, 0, 0, 0,
		1, 1, 1, 1, 0,
		1, 1, 0, 0, 0
	], PackedStringArray(["letter"])))

	# --- 6x6 ---
	out.append(PatternTemplate.make(&"quad_6", "Six Quads", PuzzleGenEnums.PatternFamily.SOLID_BLOCKS, 0, 6, 6, [
		0, 0, 0, 1, 1, 1,
		0, 0, 0, 1, 1, 1,
		0, 0, 0, 1, 1, 1,
		2, 2, 2, 3, 3, 3,
		2, 2, 2, 3, 3, 3,
		2, 2, 2, 3, 3, 3
	], PackedStringArray(["blocks"])))
	out.append(PatternTemplate.make(&"stripes_v_6", "V Stripes", PuzzleGenEnums.PatternFamily.STRIPES, 1, 6, 6, [
		0, 1, 0, 1, 0, 1,
		0, 1, 0, 1, 0, 1,
		0, 1, 0, 1, 0, 1,
		0, 1, 0, 1, 0, 1,
		0, 1, 0, 1, 0, 1,
		0, 1, 0, 1, 0, 1
	], PackedStringArray(["stripes"])))
	out.append(PatternTemplate.make(&"checker_6", "Checker", PuzzleGenEnums.PatternFamily.CHECKER, 2, 6, 6, _checker(6, 6, 2), PackedStringArray(["checker"])))
	out.append(PatternTemplate.make(&"frame_6", "Double Frame", PuzzleGenEnums.PatternFamily.FRAME, 3, 6, 6, [
		1, 1, 1, 1, 1, 1,
		1, 2, 2, 2, 2, 1,
		1, 2, 0, 0, 2, 1,
		1, 2, 0, 0, 2, 1,
		1, 2, 2, 2, 2, 1,
		1, 1, 1, 1, 1, 1
	], PackedStringArray(["frame"])))
	out.append(PatternTemplate.make(&"letter_h_6", "H Motif", PuzzleGenEnums.PatternFamily.LETTER, 4, 6, 6, [
		0, 1, 1, 1, 1, 0,
		0, 1, 1, 1, 1, 0,
		0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0,
		0, 1, 1, 1, 1, 0,
		0, 1, 1, 1, 1, 0
	], PackedStringArray(["letter"])))
	out.append(PatternTemplate.make(&"rings_6", "Rings", PuzzleGenEnums.PatternFamily.FRAME, 4, 6, 6, [
		0, 0, 0, 0, 0, 0,
		0, 1, 1, 1, 1, 0,
		0, 1, 2, 2, 1, 0,
		0, 1, 2, 2, 1, 0,
		0, 1, 1, 1, 1, 0,
		0, 0, 0, 0, 0, 0
	], PackedStringArray(["frame", "entropy"])))
	return out


static func _checker(w: int, h: int, colors: int) -> Array:
	var g: Array = []
	for y in h:
		for x in w:
			g.append((x + y) % colors)
	return g


static func _synth_half(w: int, h: int) -> PatternTemplate:
	var g: Array = []
	var mid := int(h / 2)
	for y in h:
		for _x in w:
			g.append(0 if y < mid else 1)
	return PatternTemplate.make(
		StringName("synth_half_%dx%d" % [w, h]),
		"Synth Half",
		PuzzleGenEnums.PatternFamily.SOLID_BLOCKS,
		0,
		w,
		h,
		g,
		PackedStringArray(["synth"])
	)
