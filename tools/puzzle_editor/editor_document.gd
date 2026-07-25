class_name EditorDocument
extends RefCounted
## Mutable authoring draft. Separate from BoardSession until Test / Instant Play.
##
## WHY separate: editor mutations (paint, resize, metadata) are not BoardCommands.
## A dedicated document + command stack keeps BoardSim pure and undo cheap for
## non-invertible edits (fill, resize, paste).

signal changed
signal meta_changed
signal selection_changed

enum Layer { START = 0, GOAL = 1 }

const DEFAULT_WIDTH := 4
const DEFAULT_HEIGHT := 4
const MIN_SIZE := 2
const MAX_SIZE := 12

var width: int = DEFAULT_WIDTH
var height: int = DEFAULT_HEIGHT
var active_layer: int = Layer.START
## Row-major EditorCell arrays.
var start_cells: Array[EditorCell] = []
var goal_cells: Array[EditorCell] = []

var title: String = "Untitled"
var author: String = ""
var puzzle_id: StringName = &""
var mode: StringName = &"align"
var seed_value: int = 0
var difficulty: int = 1
var tags: PackedStringArray = PackedStringArray()
var pattern_id: StringName = &""
var pattern_tier: int = 0
var move_budget: int = 8
var par_soft: int = 7
var par_hard: int = 5
var scramble_depth: int = 0
var optimal_moves: int = -1
var optimal_is_exact: bool = false
var difficulty_score: float = 0.0
var branching_factor: float = 0.0
var state_fingerprint: String = ""
var hint_first_move: Dictionary = {}
var gen_params: Dictionary = {}
var meta: Dictionary = {}
var dirty: bool = false

## Inclusive selection rect; empty when size is zero.
var selection: Rect2i = Rect2i()


func _init(w: int = DEFAULT_WIDTH, h: int = DEFAULT_HEIGHT) -> void:
	resize(w, h, false)


func cell_count() -> int:
	return width * height


func index_of(x: int, y: int) -> int:
	return y * width + x


func in_bounds(x: int, y: int) -> bool:
	return x >= 0 and y >= 0 and x < width and y < height


func get_layer_cells(layer: int = -1) -> Array[EditorCell]:
	var L := active_layer if layer < 0 else layer
	return goal_cells if L == Layer.GOAL else start_cells


func get_cell(x: int, y: int, layer: int = -1) -> EditorCell:
	if not in_bounds(x, y):
		return null
	return get_layer_cells(layer)[index_of(x, y)]


func set_cell(x: int, y: int, cell: EditorCell, layer: int = -1, emit: bool = true) -> void:
	if not in_bounds(x, y) or cell == null:
		return
	get_layer_cells(layer)[index_of(x, y)] = cell
	dirty = true
	if emit:
		changed.emit()


func set_active_layer(layer: int) -> void:
	if layer == active_layer:
		return
	active_layer = layer
	changed.emit()


func set_selection(rect: Rect2i) -> void:
	selection = _clamp_rect(rect)
	selection_changed.emit()


func clear_selection() -> void:
	selection = Rect2i()
	selection_changed.emit()


func has_selection() -> bool:
	return selection.size.x > 0 and selection.size.y > 0


func selected_cells() -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	if not has_selection():
		return out
	for y in range(selection.position.y, selection.position.y + selection.size.y):
		for x in range(selection.position.x, selection.position.x + selection.size.x):
			if in_bounds(x, y):
				out.append(Vector2i(x, y))
	return out


func resize(w: int, h: int, emit: bool = true) -> void:
	w = clampi(w, MIN_SIZE, MAX_SIZE)
	h = clampi(h, MIN_SIZE, MAX_SIZE)
	start_cells = _resize_layer(start_cells, width, height, w, h)
	goal_cells = _resize_layer(goal_cells, width, height, w, h)
	width = w
	height = h
	selection = _clamp_rect(selection)
	dirty = true
	if emit:
		changed.emit()


func ensure_id() -> void:
	if String(puzzle_id).is_empty():
		puzzle_id = StringName("workshop_%d" % Time.get_unix_time_from_system())


func mark_clean() -> void:
	dirty = false


func snapshot_layer(layer: int = -1) -> Array:
	var cells := get_layer_cells(layer)
	var out: Array = []
	out.resize(cells.size())
	for i in cells.size():
		out[i] = cells[i].duplicate_cell()
	return out


func apply_layer_snapshot(snap: Array, layer: int = -1, emit: bool = true) -> void:
	var target := get_layer_cells(layer)
	assert(snap.size() == target.size())
	for i in snap.size():
		var cell: EditorCell = snap[i] as EditorCell
		target[i] = cell.duplicate_cell() if cell else EditorCell.new()
	dirty = true
	if emit:
		changed.emit()


func occupants_packed(layer: int = -1) -> PackedStringArray:
	var cells := get_layer_cells(layer)
	var out := PackedStringArray()
	out.resize(cells.size())
	for i in cells.size():
		out[i] = String(cells[i].occupant_id)
	return out


func fill_occupants(layer: int, occupants: PackedStringArray, emit: bool = true) -> void:
	var cells := get_layer_cells(layer)
	var n := mini(cells.size(), occupants.size())
	for i in n:
		cells[i].occupant_id = StringName(occupants[i])
		## Color-only Align cells clear puzzle occupant blobs when painting colors.
		if cells[i].puzzle.is_empty() == false and String(cells[i].puzzle.get("def", "")) == String(cells[i].occupant_id):
			pass
		dirty = true
	if emit:
		changed.emit()


func build_board_state(layer: int = Layer.START) -> BoardState:
	var s := BoardState.create(width, height)
	var cells := get_layer_cells(layer)
	for y in height:
		for x in width:
			var cell := cells[index_of(x, y)]
			s.set_tile(x, y, cell.to_tile(x, y))
	return s


func to_puzzle_def() -> PuzzleDef:
	ensure_id()
	var p := PuzzleDef.new()
	p.id = puzzle_id
	p.mode = mode
	p.seed_value = seed_value
	p.difficulty = difficulty
	p.width = width
	p.height = height
	p.pattern_id = pattern_id
	p.pattern_tier = pattern_tier
	p.goal_occupants = occupants_packed(Layer.GOAL)
	p.start_occupants = occupants_packed(Layer.START)
	p.scramble_depth = scramble_depth
	p.optimal_moves = optimal_moves
	p.optimal_is_exact = optimal_is_exact
	p.difficulty_score = difficulty_score
	p.move_budget = move_budget
	p.par_soft = par_soft
	p.par_hard = par_hard
	p.state_fingerprint = state_fingerprint
	p.branching_factor = branching_factor
	p.hint_first_move = hint_first_move.duplicate(true)
	p.gen_params = gen_params.duplicate(true)
	p.meta = _workshop_meta()
	return p


func apply_puzzle_def(p: PuzzleDef) -> void:
	assert(p != null)
	width = p.width
	height = p.height
	_alloc_empty()
	_apply_occupants(start_cells, p.start_occupants)
	_apply_occupants(goal_cells, p.goal_occupants)
	puzzle_id = p.id
	mode = p.mode
	seed_value = p.seed_value
	difficulty = p.difficulty
	pattern_id = p.pattern_id
	pattern_tier = p.pattern_tier
	scramble_depth = p.scramble_depth
	optimal_moves = p.optimal_moves
	optimal_is_exact = p.optimal_is_exact
	difficulty_score = p.difficulty_score
	move_budget = p.move_budget
	par_soft = p.par_soft
	par_hard = p.par_hard
	state_fingerprint = p.state_fingerprint
	branching_factor = p.branching_factor
	hint_first_move = p.hint_first_move.duplicate(true)
	gen_params = p.gen_params.duplicate(true)
	meta = p.meta.duplicate(true)
	title = str(meta.get("title", title))
	author = str(meta.get("author", author))
	var t: Variant = meta.get("tags", [])
	tags = PackedStringArray()
	if t is Array:
		for item in t:
			tags.append(str(item))
	elif t is PackedStringArray:
		tags = t
	## Optional rich cell layers for workshop object mode.
	_import_rich_layers(meta.get("start_cells", null), Layer.START)
	_import_rich_layers(meta.get("goal_cells", null), Layer.GOAL)
	dirty = false
	changed.emit()
	meta_changed.emit()


func duplicate_document() -> EditorDocument:
	var d := EditorDocument.new(width, height)
	d.active_layer = active_layer
	d.start_cells = []
	d.goal_cells = []
	for c in start_cells:
		d.start_cells.append(c.duplicate_cell())
	for c in goal_cells:
		d.goal_cells.append(c.duplicate_cell())
	d.title = title
	d.author = author
	d.puzzle_id = puzzle_id
	d.mode = mode
	d.seed_value = seed_value
	d.difficulty = difficulty
	d.tags = tags.duplicate()
	d.pattern_id = pattern_id
	d.pattern_tier = pattern_tier
	d.move_budget = move_budget
	d.par_soft = par_soft
	d.par_hard = par_hard
	d.scramble_depth = scramble_depth
	d.optimal_moves = optimal_moves
	d.optimal_is_exact = optimal_is_exact
	d.difficulty_score = difficulty_score
	d.branching_factor = branching_factor
	d.state_fingerprint = state_fingerprint
	d.hint_first_move = hint_first_move.duplicate(true)
	d.gen_params = gen_params.duplicate(true)
	d.meta = meta.duplicate(true)
	d.selection = selection
	d.dirty = dirty
	return d


func _workshop_meta() -> Dictionary:
	var m := meta.duplicate(true)
	m["title"] = title
	m["author"] = author
	var tag_arr: Array = []
	for t in tags:
		tag_arr.append(t)
	m["tags"] = tag_arr
	m["start_cells"] = _export_rich_layer(start_cells)
	m["goal_cells"] = _export_rich_layer(goal_cells)
	m["workshop"] = true
	return m


func _export_rich_layer(cells: Array[EditorCell]) -> Array:
	var out: Array = []
	for c in cells:
		out.append(c.to_dict())
	return out


func _import_rich_layers(data: Variant, layer: int) -> void:
	if data == null or not (data is Array):
		return
	var arr: Array = data
	var cells := get_layer_cells(layer)
	var n := mini(cells.size(), arr.size())
	for i in n:
		if arr[i] is Dictionary:
			cells[i] = EditorCell.from_dict(arr[i])


func _alloc_empty() -> void:
	start_cells = []
	goal_cells = []
	var n := width * height
	start_cells.resize(n)
	goal_cells.resize(n)
	for i in n:
		start_cells[i] = EditorCell.new()
		goal_cells[i] = EditorCell.new()


func _apply_occupants(cells: Array[EditorCell], occupants: PackedStringArray) -> void:
	var n := mini(cells.size(), occupants.size())
	for i in n:
		cells[i].occupant_id = StringName(occupants[i])


func _resize_layer(
	old: Array[EditorCell], old_w: int, old_h: int, new_w: int, new_h: int
) -> Array[EditorCell]:
	var out: Array[EditorCell] = []
	out.resize(new_w * new_h)
	for y in new_h:
		for x in new_w:
			var i := y * new_w + x
			if x < old_w and y < old_h and old.size() == old_w * old_h:
				out[i] = old[y * old_w + x].duplicate_cell()
			else:
				out[i] = EditorCell.new()
	return out


func _clamp_rect(rect: Rect2i) -> Rect2i:
	if rect.size.x <= 0 or rect.size.y <= 0:
		return Rect2i()
	var x0 := clampi(rect.position.x, 0, width - 1)
	var y0 := clampi(rect.position.y, 0, height - 1)
	var x1 := clampi(rect.position.x + rect.size.x - 1, 0, width - 1)
	var y1 := clampi(rect.position.y + rect.size.y - 1, 0, height - 1)
	if x1 < x0 or y1 < y0:
		return Rect2i()
	return Rect2i(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
