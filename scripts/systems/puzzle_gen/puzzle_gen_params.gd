class_name PuzzleGenParams
extends Resource
## Tunables for PuzzleGenerator. Prefer shipping seed+params catalogs over huge baked boards.

@export var width: int = 4
@export var height: int = 4
@export_range(0, 5, 1) var color_count: int = 2
@export_range(0, 4, 1) var pattern_tier_max: int = 0
@export_range(1, 64, 1) var scramble_depth: int = 4
@export_range(1, 8, 1) var max_steps_per_shift: int = 1
@export var allow_multi_step: bool = false
@export var min_optimal: int = 1
@export var max_optimal: int = 12
@export var solver_node_cap: int = 80000
@export var regen_attempts: int = 12
@export var require_solver_confirm: bool = true
@export var reject_already_solved: bool = true
@export var palette: PackedStringArray = PackedStringArray(["A", "B", "C", "D", "E", "F"])
## Optional forced pattern id; empty = pick by seed + tier.
@export var pattern_id: StringName = &""
@export var budget_slack: int = 3
@export var soft_par_slack: int = 2


func duplicate_params() -> PuzzleGenParams:
	var p := PuzzleGenParams.new()
	p.width = width
	p.height = height
	p.color_count = color_count
	p.pattern_tier_max = pattern_tier_max
	p.scramble_depth = scramble_depth
	p.max_steps_per_shift = max_steps_per_shift
	p.allow_multi_step = allow_multi_step
	p.min_optimal = min_optimal
	p.max_optimal = max_optimal
	p.solver_node_cap = solver_node_cap
	p.regen_attempts = regen_attempts
	p.require_solver_confirm = require_solver_confirm
	p.reject_already_solved = reject_already_solved
	p.palette = palette.duplicate()
	p.pattern_id = pattern_id
	p.budget_slack = budget_slack
	p.soft_par_slack = soft_par_slack
	return p


## Map abstract difficulty 1..10 → concrete axes (GDD §7.2).
static func from_difficulty(difficulty: int) -> PuzzleGenParams:
	var d := clampi(difficulty, 1, 10)
	var p := PuzzleGenParams.new()
	match d:
		1:
			p.width = 3
			p.height = 3
			p.color_count = 2
			p.pattern_tier_max = 0
			p.scramble_depth = 2
			p.min_optimal = 1
			p.max_optimal = 3
		2:
			p.width = 3
			p.height = 3
			p.color_count = 2
			p.pattern_tier_max = 1
			p.scramble_depth = 3
			p.min_optimal = 2
			p.max_optimal = 4
		3:
			p.width = 4
			p.height = 4
			p.color_count = 2
			p.pattern_tier_max = 1
			p.scramble_depth = 4
			p.min_optimal = 2
			p.max_optimal = 5
		4:
			p.width = 4
			p.height = 4
			p.color_count = 3
			p.pattern_tier_max = 2
			p.scramble_depth = 5
			p.min_optimal = 3
			p.max_optimal = 6
		5:
			p.width = 4
			p.height = 4
			p.color_count = 3
			p.pattern_tier_max = 2
			p.scramble_depth = 6
			p.min_optimal = 4
			p.max_optimal = 8
		6:
			p.width = 5
			p.height = 5
			p.color_count = 3
			p.pattern_tier_max = 3
			p.scramble_depth = 7
			p.min_optimal = 4
			p.max_optimal = 9
		7:
			p.width = 5
			p.height = 5
			p.color_count = 4
			p.pattern_tier_max = 3
			p.scramble_depth = 8
			p.min_optimal = 5
			p.max_optimal = 10
		8:
			p.width = 6
			p.height = 6
			p.color_count = 4
			p.pattern_tier_max = 4
			p.scramble_depth = 10
			p.min_optimal = 6
			p.max_optimal = 12
		9:
			p.width = 6
			p.height = 6
			p.color_count = 4
			p.pattern_tier_max = 4
			p.scramble_depth = 12
			p.min_optimal = 7
			p.max_optimal = 14
			p.allow_multi_step = true
			p.max_steps_per_shift = 2
		_:
			p.width = 6
			p.height = 6
			p.color_count = 5
			p.pattern_tier_max = 4
			p.scramble_depth = 14
			p.min_optimal = 8
			p.max_optimal = 16
			p.allow_multi_step = true
			p.max_steps_per_shift = 2
	p.budget_slack = 3 + int(d / 3)
	p.soft_par_slack = 2 + int(d / 4)
	return p


func to_dict() -> Dictionary:
	return {
		"width": width,
		"height": height,
		"color_count": color_count,
		"pattern_tier_max": pattern_tier_max,
		"scramble_depth": scramble_depth,
		"max_steps_per_shift": max_steps_per_shift,
		"allow_multi_step": allow_multi_step,
		"min_optimal": min_optimal,
		"max_optimal": max_optimal,
		"solver_node_cap": solver_node_cap,
		"regen_attempts": regen_attempts,
		"require_solver_confirm": require_solver_confirm,
		"reject_already_solved": reject_already_solved,
		"palette": Array(palette),
		"pattern_id": String(pattern_id),
		"budget_slack": budget_slack,
		"soft_par_slack": soft_par_slack,
	}


static func from_dict(data: Dictionary) -> PuzzleGenParams:
	var p := PuzzleGenParams.new()
	p.width = int(data.get("width", 4))
	p.height = int(data.get("height", 4))
	p.color_count = int(data.get("color_count", 2))
	p.pattern_tier_max = int(data.get("pattern_tier_max", 0))
	p.scramble_depth = int(data.get("scramble_depth", 4))
	p.max_steps_per_shift = int(data.get("max_steps_per_shift", 1))
	p.allow_multi_step = bool(data.get("allow_multi_step", false))
	p.min_optimal = int(data.get("min_optimal", 1))
	p.max_optimal = int(data.get("max_optimal", 12))
	p.solver_node_cap = int(data.get("solver_node_cap", PuzzleGenEnums.DEFAULT_SOLVER_NODE_CAP))
	p.regen_attempts = int(data.get("regen_attempts", PuzzleGenEnums.DEFAULT_REGEN_ATTEMPTS))
	p.require_solver_confirm = bool(data.get("require_solver_confirm", true))
	p.reject_already_solved = bool(data.get("reject_already_solved", true))
	var pal: Variant = data.get("palette", PuzzleGenEnums.DEFAULT_PALETTE)
	p.palette = PackedStringArray(pal) if pal is Array or pal is PackedStringArray else PuzzleGenEnums.DEFAULT_PALETTE.duplicate()
	p.pattern_id = StringName(str(data.get("pattern_id", "")))
	p.budget_slack = int(data.get("budget_slack", 3))
	p.soft_par_slack = int(data.get("soft_par_slack", 2))
	return p
