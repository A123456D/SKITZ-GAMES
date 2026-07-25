class_name UiFeel
extends Node
## UI-facing satisfaction API sharing EffectRecipe vocabulary with the board.

@export var director: SatisfactionDirector
@export var feel: ShiftFeelConfig

var _audio: FeelAudio = null


func setup(p_director: SatisfactionDirector, p_feel: ShiftFeelConfig = null) -> void:
	director = p_director
	if p_feel:
		feel = p_feel
	if director and feel:
		director.feel = feel


func ensure_audio() -> FeelAudio:
	if _audio and is_instance_valid(_audio):
		return _audio
	_audio = get_node_or_null("FeelAudio") as FeelAudio
	if _audio == null and director and director.audio:
		_audio = director.audio
	if _audio == null:
		_audio = FeelAudio.new()
		_audio.name = "FeelAudio"
		add_child(_audio)
		_audio.configure(feel if feel else ShiftFeelConfig.new())
	if director and director.audio == null:
		director.audio = _audio
	return _audio


func button_press(control: Control = null, screen_pos: Vector2 = Vector2.ZERO) -> void:
	var ctx := {}
	if control:
		ctx["targets"] = [control]
		if screen_pos == Vector2.ZERO:
			screen_pos = control.get_global_rect().get_center()
	if screen_pos != Vector2.ZERO:
		ctx["screen_pos"] = screen_pos
	_play(&"button_press", ctx)


func screen_transition() -> void:
	_play(&"screen_transition", {})


func puzzle_solve(board: BoardView = null) -> void:
	var ctx := {}
	if board:
		var targets: Array = []
		for c in board.get_children():
			if c is BoardTileView:
				targets.append(c)
		ctx["targets"] = targets
		director.board_view = board
	_play(&"puzzle_solve", ctx)


func invalid() -> void:
	_play(&"invalid_input", {})


func achievement(screen_pos: Vector2 = Vector2.ZERO) -> void:
	var ctx := {}
	if screen_pos != Vector2.ZERO:
		ctx["screen_pos"] = screen_pos
	_play(&"achievement_reward", ctx)


func error_fail() -> void:
	_play(&"error_fail", {})


func play(id: StringName, ctx: Dictionary = {}) -> void:
	_play(id, ctx)


func _play(id: StringName, ctx: Dictionary) -> void:
	if director == null:
		push_warning("UiFeel: SatisfactionDirector missing for %s" % String(id))
		return
	ensure_audio()
	director.play(id, ctx)
