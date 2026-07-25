class_name PuzzleDef
extends Resource
## Serializable Align puzzle. Loads into BoardSession via apply_to_session / start_state.

@export var id: StringName = &""
@export var mode: StringName = &"align"
@export var seed_value: int = 0
@export_range(1, 10, 1) var difficulty: int = 1
@export var width: int = 4
@export var height: int = 4
@export var pattern_id: StringName = &""
@export var pattern_tier: int = 0
## Row-major occupant ids for the goal (target) board.
@export var goal_occupants: PackedStringArray = PackedStringArray()
## Row-major occupant ids for the scrambled start board.
@export var start_occupants: PackedStringArray = PackedStringArray()
@export var scramble_depth: int = 0
@export var optimal_moves: int = -1
@export var optimal_is_exact: bool = false
@export var difficulty_score: float = 0.0
@export var move_budget: int = 8
@export var par_soft: int = 7
@export var par_hard: int = 5
@export var state_fingerprint: String = ""
@export var branching_factor: float = 0.0
## First optimal (or construction) move as dict — optional hint seed.
@export var hint_first_move: Dictionary = {}
@export var gen_params: Dictionary = {}
@export var meta: Dictionary = {}


func cell_count() -> int:
	return width * height


func is_well_formed() -> bool:
	var n := cell_count()
	return (
		width > 0
		and height > 0
		and goal_occupants.size() == n
		and start_occupants.size() == n
	)


func build_goal_state() -> BoardState:
	var s := BoardState.create(width, height)
	s.fill_occupants_row_major(_as_array(goal_occupants))
	return s


func build_start_state() -> BoardState:
	var s := BoardState.create(width, height)
	s.fill_occupants_row_major(_as_array(start_occupants))
	return s


func apply_to_session(session: BoardSession) -> void:
	assert(session != null)
	assert(is_well_formed())
	var cfg := BoardConfig.new()
	cfg.width = width
	cfg.height = height
	session.setup_from_state(build_start_state(), cfg)
	session.meta["puzzle_id"] = String(id)
	session.meta["goal"] = Array(goal_occupants)
	session.meta["mode"] = String(mode)
	session.meta["difficulty"] = difficulty
	session.meta["optimal_moves"] = optimal_moves
	session.meta["par_soft"] = par_soft
	session.meta["par_hard"] = par_hard
	session.meta["move_budget"] = move_budget


func is_solved_state(state: BoardState) -> bool:
	if state == null or state.width != width or state.height != height:
		return false
	var i := 0
	for y in height:
		for x in width:
			if String(state.get_tile(x, y).occupant_id) != goal_occupants[i]:
				return false
			i += 1
	return true


func to_dict() -> Dictionary:
	return {
		"id": String(id),
		"mode": String(mode),
		"seed_value": seed_value,
		"difficulty": difficulty,
		"width": width,
		"height": height,
		"pattern_id": String(pattern_id),
		"pattern_tier": pattern_tier,
		"goal_occupants": Array(goal_occupants),
		"start_occupants": Array(start_occupants),
		"scramble_depth": scramble_depth,
		"optimal_moves": optimal_moves,
		"optimal_is_exact": optimal_is_exact,
		"difficulty_score": difficulty_score,
		"move_budget": move_budget,
		"par_soft": par_soft,
		"par_hard": par_hard,
		"state_fingerprint": state_fingerprint,
		"branching_factor": branching_factor,
		"hint_first_move": hint_first_move.duplicate(true),
		"gen_params": gen_params.duplicate(true),
		"meta": meta.duplicate(true),
	}


static func from_dict(data: Dictionary) -> PuzzleDef:
	var p := PuzzleDef.new()
	p.id = StringName(str(data.get("id", "")))
	p.mode = StringName(str(data.get("mode", "align")))
	p.seed_value = int(data.get("seed_value", 0))
	p.difficulty = int(data.get("difficulty", 1))
	p.width = int(data.get("width", 4))
	p.height = int(data.get("height", 4))
	p.pattern_id = StringName(str(data.get("pattern_id", "")))
	p.pattern_tier = int(data.get("pattern_tier", 0))
	p.goal_occupants = _to_packed(data.get("goal_occupants", []))
	p.start_occupants = _to_packed(data.get("start_occupants", []))
	p.scramble_depth = int(data.get("scramble_depth", 0))
	p.optimal_moves = int(data.get("optimal_moves", -1))
	p.optimal_is_exact = bool(data.get("optimal_is_exact", false))
	p.difficulty_score = float(data.get("difficulty_score", 0.0))
	p.move_budget = int(data.get("move_budget", 8))
	p.par_soft = int(data.get("par_soft", 7))
	p.par_hard = int(data.get("par_hard", 5))
	p.state_fingerprint = str(data.get("state_fingerprint", ""))
	p.branching_factor = float(data.get("branching_factor", 0.0))
	var hm: Variant = data.get("hint_first_move", {})
	p.hint_first_move = hm.duplicate(true) if hm is Dictionary else {}
	var gp: Variant = data.get("gen_params", {})
	p.gen_params = gp.duplicate(true) if gp is Dictionary else {}
	var m: Variant = data.get("meta", {})
	p.meta = m.duplicate(true) if m is Dictionary else {}
	return p


static func _to_packed(v: Variant) -> PackedStringArray:
	if v is PackedStringArray:
		return v
	var out := PackedStringArray()
	if v is Array:
		for item in v:
			out.append(str(item))
	return out


func _as_array(ps: PackedStringArray) -> Array:
	var a: Array = []
	a.resize(ps.size())
	for i in ps.size():
		a[i] = ps[i]
	return a
