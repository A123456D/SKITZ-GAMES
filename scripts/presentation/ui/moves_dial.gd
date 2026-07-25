class_name MovesDial
extends Control
## Circular glass moves counter — MOVES + BEST, purple ring.

@export var tokens: DesignTokens

var _ring: Panel
var _inner: Panel
var _moves_label: Label
var _best_label: Label
var _moves: int = 0
var _best: int = -1
var _pulse: float = 0.0


func _ready() -> void:
	if tokens == null:
		tokens = _load_tokens()
	custom_minimum_size = Vector2(108, 108)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build()
	set_process(true)


func configure(p_tokens: DesignTokens) -> void:
	tokens = p_tokens
	_style()


func set_moves(moves: int, best: int = -1) -> void:
	_moves = moves
	_best = best
	if _moves_label:
		_moves_label.text = "MOVES\n%d" % _moves
	if _best_label:
		_best_label.text = ("BEST: %d" % _best) if _best >= 0 else "BEST: —"


func _build() -> void:
	_ring = Panel.new()
	_ring.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_ring)

	_inner = Panel.new()
	_inner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_inner)

	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(col)

	_moves_label = Label.new()
	_moves_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_moves_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_moves_label.text = "MOVES\n0"
	col.add_child(_moves_label)

	_best_label = Label.new()
	_best_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_best_label.text = "BEST: —"
	col.add_child(_best_label)

	_style()
	resized.connect(_layout_inner)
	call_deferred("_layout_inner")


func _layout_inner() -> void:
	if _inner == null:
		return
	var pad := size.x * 0.12
	_inner.position = Vector2(pad, pad)
	_inner.size = size - Vector2(pad, pad) * 2.0


func _style() -> void:
	if tokens == null:
		return
	var ring := StyleBoxFlat.new()
	ring.bg_color = Color(tokens.surface_glass.r, tokens.surface_glass.g, tokens.surface_glass.b, 0.35)
	ring.border_color = tokens.accent_signal
	ring.set_border_width_all(3)
	ring.set_corner_radius_all(999)
	ring.shadow_color = Color(tokens.accent_signal.r, tokens.accent_signal.g, tokens.accent_signal.b, 0.45)
	ring.shadow_size = 12
	_ring.add_theme_stylebox_override("panel", ring)

	var inner := StyleBoxFlat.new()
	inner.bg_color = Color(tokens.bg_elevated.r, tokens.bg_elevated.g, tokens.bg_elevated.b, 0.92)
	inner.border_color = Color(tokens.surface_glass_border.r, tokens.surface_glass_border.g, tokens.surface_glass_border.b, 0.4)
	inner.set_border_width_all(1)
	inner.set_corner_radius_all(999)
	_inner.add_theme_stylebox_override("panel", inner)

	_moves_label.add_theme_color_override("font_color", tokens.ink_primary)
	_moves_label.add_theme_font_size_override("font_size", tokens.font_caption)
	_best_label.add_theme_color_override("font_color", tokens.accent_beam)
	_best_label.add_theme_font_size_override("font_size", maxi(10, tokens.font_caption - 2))
	set_moves(_moves, _best)


func _process(delta: float) -> void:
	_pulse += delta
	if _ring:
		var sb := _ring.get_theme_stylebox("panel") as StyleBoxFlat
		if sb and tokens:
			var a := 0.35 + 0.12 * sin(_pulse * 2.2)
			sb.shadow_color = Color(tokens.accent_signal.r, tokens.accent_signal.g, tokens.accent_signal.b, a)


func _load_tokens() -> DesignTokens:
	var path := "res://resources/configs/visual/default_design_tokens.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is DesignTokens:
			return res as DesignTokens
	return DesignTokens.new()
