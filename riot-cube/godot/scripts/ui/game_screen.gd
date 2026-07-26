extends Control

const BoardViewScript := preload("res://scripts/ui/board_view.gd")

@onready var _title: Label = %Title
@onready var _moves: Label = %Moves
@onready var _score: Label = %Score
@onready var _goals: Label = %Goals
@onready var _hint: Label = %Hint
@onready var _board_host: Control = %BoardHost
@onready var _overlay: ColorRect = %Overlay
@onready var _end_title: Label = %EndTitle
@onready var _end_score: Label = %EndScore
@onready var _end_stars: Label = %EndStars
@onready var _retry: Button = %Retry

var session: RiotSession
var board: RiotBoardView


func _ready() -> void:
	_apply_theme()
	session = RiotSession.new()
	board = BoardViewScript.new()
	board.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	board.mouse_filter = Control.MOUSE_FILTER_STOP
	_board_host.add_child(board)
	board.twist_requested.connect(_on_twist)
	_retry.pressed.connect(_on_retry)
	_overlay.visible = false
	session.start(RiotLevels.level_1())
	board.bind(session)
	session.changed.connect(_refresh)
	_refresh()


func _apply_theme() -> void:
	var paper := _panel_style(Color("#f3efe6"))
	var dark := _panel_style(Color("#111111"))
	var pink_btn := _panel_style(Color("#ff2d6a"))
	(%TitleScrap as PanelContainer).add_theme_stylebox_override("panel", paper)
	(%MovesScrap as PanelContainer).add_theme_stylebox_override("panel", dark)
	(%ScoreScrap as PanelContainer).add_theme_stylebox_override("panel", paper)
	(%GoalsScrap as PanelContainer).add_theme_stylebox_override("panel", paper)
	(%HintScrap as PanelContainer).add_theme_stylebox_override("panel", dark)
	(%EndPanel as PanelContainer).add_theme_stylebox_override("panel", paper)
	_retry.add_theme_stylebox_override("normal", pink_btn)
	_retry.add_theme_stylebox_override("hover", _panel_style(Color("#ff4d80")))
	_retry.add_theme_stylebox_override("pressed", _panel_style(Color("#cc1a4d")))
	_retry.add_theme_color_override("font_color", Color.WHITE)
	_retry.add_theme_color_override("font_hover_color", Color.WHITE)
	_retry.add_theme_color_override("font_pressed_color", Color.WHITE)


func _panel_style(color: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = color
	sb.set_border_width_all(4)
	sb.border_color = Color("#111111")
	sb.set_corner_radius_all(8)
	sb.content_margin_left = 14
	sb.content_margin_top = 10
	sb.content_margin_right = 14
	sb.content_margin_bottom = 10
	return sb

func _refresh() -> void:
	_title.text = "RIOT CUBE"
	_moves.text = "MOVES\n%d" % session.moves_left
	_score.text = "SCORE\n%d" % session.score
	var parts: PackedStringArray = PackedStringArray()
	for g in session.goals:
		parts.append("%s %d/%d" % [str(g["kind"]).to_upper(), int(g["have"]), int(g["need"])])
	_goals.text = "GOALS  ·  " + "   ".join(parts)

	if session.status == "playing":
		_hint.text = "Swipe a row or column — matches of 3+ rip clear."
		_overlay.visible = false
	elif session.status == "won":
		_hint.text = "Rip. Match. Repeat."
		_end_title.text = "CLEARED!"
		_end_score.text = "SCORE  %d" % session.score
		var s: int = session.stars()
		_end_stars.text = "★".repeat(s) + "☆".repeat(3 - s)
		_retry.text = "AGAIN"
		_overlay.visible = true
	else:
		_hint.text = "Try another twist path."
		_end_title.text = "OUT OF MOVES"
		_end_score.text = "SCORE  %d" % session.score
		_end_stars.text = ""
		_retry.text = "RETRY"
		_overlay.visible = true


func _on_twist(twist: Dictionary) -> void:
	var before: Array = RiotBoard.clone_board(session.board)
	var result: Dictionary = session.apply_twist(twist)
	if not result["did_twist"]:
		return
	board.flash_changes(before)
	var combo: int = int(result["combo"])
	var gain: int = int(result["score_gain"])
	if combo > 1:
		board.show_float("COMBO x%d" % combo)
	elif gain > 0:
		board.show_float("+%d" % gain)


func _on_retry() -> void:
	session.restart()
	_overlay.visible = false


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_restart"):
		_on_retry()
