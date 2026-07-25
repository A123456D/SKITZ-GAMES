extends Control
## Tiny Align generator demo: regenerate / hint stages / show goal vs start.
## Run: F6 on res://scenes/puzzles/puzzle_gen_demo.tscn

@onready var _title: Label = $Title
@onready var _board_label: Label = $BoardLabel
@onready var _meta: Label = $Meta
@onready var _hint_label: Label = $HintLabel

var _gen: PuzzleGenerator = PuzzleGenerator.new()
var _hints: HintGenerator = HintGenerator.new()
var _puzzle: PuzzleDef = null
var _seed: int = 20260724
var _difficulty: int = 3
var _hint_stage: int = 0


func _ready() -> void:
	if Engine.has_meta("shiftr_pending_puzzle"):
		var data: Variant = Engine.get_meta("shiftr_pending_puzzle")
		Engine.remove_meta("shiftr_pending_puzzle")
		if data is Dictionary:
			_puzzle = PuzzleDef.from_dict(data)
			_seed = _puzzle.seed_value
			_difficulty = _puzzle.difficulty
			_hint_stage = 0
			_title.text = "SHIFTR · %s  d=%d  seed=%d" % [String(_puzzle.id), _difficulty, _seed]
			_board_label.text = _format_grid(_puzzle.start_occupants, _puzzle.width, _puzzle.height)
			_meta.text = "pattern=%s  opt=%s%s  score=%.1f  budget=%d\n[R] next  [1-6] difficulty  [H] hint  [G] goal" % [
				String(_puzzle.pattern_id),
				str(_puzzle.optimal_moves),
				"" if _puzzle.optimal_is_exact else "~",
				_puzzle.difficulty_score,
				_puzzle.move_budget,
			]
			_hint_label.text = "Hint: (press H)"
			return
	_regenerate()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_R, KEY_SPACE:
				_seed = (_seed * 1103515245 + 12345) & 0x7FFFFFFF
				_regenerate()
			KEY_H:
				_show_hint()
			KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6:
				_difficulty = event.keycode - KEY_0
				_regenerate()
			KEY_G:
				_board_label.text = _format_grid(_puzzle.goal_occupants, _puzzle.width, _puzzle.height)
				_meta.text = "Showing GOAL — press R to scramble view"


func _regenerate() -> void:
	_puzzle = _gen.generate(_seed, _difficulty)
	_hint_stage = 0
	_title.text = "SHIFTR · Puzzle Gen  d=%d  seed=%d" % [_difficulty, _seed]
	_board_label.text = _format_grid(_puzzle.start_occupants, _puzzle.width, _puzzle.height)
	_meta.text = "pattern=%s  opt=%s%s  score=%.1f  budget=%d\n[R] next  [1-6] difficulty  [H] hint  [G] goal" % [
		String(_puzzle.pattern_id),
		str(_puzzle.optimal_moves),
		"" if _puzzle.optimal_is_exact else "~",
		_puzzle.difficulty_score,
		_puzzle.move_budget,
	]
	_hint_label.text = "Hint: (press H)"


func _show_hint() -> void:
	var h := _hints.hint(_puzzle, _hint_stage)
	_hint_label.text = "Hint L%d: %s" % [_hint_stage + 1, h.blurb]
	_hint_stage = mini(2, _hint_stage + 1)


func _format_grid(occ: PackedStringArray, w: int, h: int) -> String:
	var lines: PackedStringArray = PackedStringArray()
	for y in h:
		var row: PackedStringArray = PackedStringArray()
		for x in w:
			row.append(occ[y * w + x])
		lines.append("  ".join(row))
	return "\n".join(lines)
