class_name ScreenTransition
extends CanvasLayer
## Fade / wipe / shift transitions. Frame-independent tweens; respects reduce_motion.

enum Mode { FADE, WIPE, SHIFT }

signal finished

@export var tokens: DesignTokens
@export var reduce_motion: bool = false

var _veil: ColorRect
var _busy: bool = false


func _ready() -> void:
	layer = 100
	if tokens == null:
		tokens = _load_tokens()
	_veil = ColorRect.new()
	_veil.name = "Veil"
	_veil.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_veil.mouse_filter = Control.MOUSE_FILTER_STOP
	_veil.color = Color(tokens.bg_deep.r, tokens.bg_deep.g, tokens.bg_deep.b, 0.0)
	_veil.visible = false
	add_child(_veil)


func prepare_covered() -> void:
	if _veil == null:
		return
	_veil.visible = true
	_veil.color.a = 1.0
	_veil.mouse_filter = Control.MOUSE_FILTER_STOP
	_veil.offset_left = 0
	_veil.offset_top = 0
	_veil.offset_right = 0
	_veil.offset_bottom = 0


func play(mode: Mode = Mode.FADE, outro: bool = true) -> void:
	if _busy:
		return
	_busy = true
	_veil.visible = true
	_veil.mouse_filter = Control.MOUSE_FILTER_STOP
	var dur := 0.08 if reduce_motion else (tokens.duration_transition if tokens else 0.32)
	match mode:
		Mode.FADE:
			await _fade(outro, dur)
		Mode.WIPE:
			await _wipe(outro, dur)
		Mode.SHIFT:
			await _shift(outro, dur)
	if not outro:
		_veil.visible = false
		_veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_busy = false
	finished.emit()


func cover(mode: Mode = Mode.FADE) -> void:
	await play(mode, true)


func uncover(mode: Mode = Mode.FADE) -> void:
	await play(mode, false)


func _fade(cover: bool, dur: float) -> void:
	_veil.anchor_left = 0
	_veil.anchor_top = 0
	_veil.anchor_right = 1
	_veil.anchor_bottom = 1
	_veil.offset_left = 0
	_veil.offset_top = 0
	_veil.offset_right = 0
	_veil.offset_bottom = 0
	var from_a := 0.0 if cover else 1.0
	var to_a := 1.0 if cover else 0.0
	_veil.color.a = from_a
	var tw := create_tween()
	tw.tween_property(_veil, "color:a", to_a, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	await tw.finished


func _wipe(cover: bool, dur: float) -> void:
	_veil.color.a = 1.0
	_veil.anchor_left = 0
	_veil.anchor_top = 0
	_veil.anchor_right = 1
	_veil.anchor_bottom = 1
	if cover:
		_veil.offset_top = -_veil.size.y if _veil.size.y > 0 else -1280.0
		_veil.offset_bottom = -_veil.size.y if _veil.size.y > 0 else -1280.0
		var tw := create_tween()
		tw.tween_property(_veil, "offset_top", 0.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(_veil, "offset_bottom", 0.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		await tw.finished
	else:
		var h := _veil.size.y if _veil.size.y > 0 else 1280.0
		var tw := create_tween()
		tw.tween_property(_veil, "offset_top", h, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
		tw.parallel().tween_property(_veil, "offset_bottom", h, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
		await tw.finished


func _shift(cover: bool, dur: float) -> void:
	# Horizontal shift wipe — brand metaphor.
	_veil.color.a = 1.0
	_veil.anchor_left = 0
	_veil.anchor_top = 0
	_veil.anchor_right = 1
	_veil.anchor_bottom = 1
	var w := _veil.size.x if _veil.size.x > 0 else 720.0
	if cover:
		_veil.offset_left = -w
		_veil.offset_right = -w
		var tw := create_tween()
		tw.tween_property(_veil, "offset_left", 0.0, dur).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(_veil, "offset_right", 0.0, dur).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		await tw.finished
	else:
		var tw := create_tween()
		tw.tween_property(_veil, "offset_left", w, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
		tw.parallel().tween_property(_veil, "offset_right", w, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
		await tw.finished


func _load_tokens() -> DesignTokens:
	var path := "res://resources/configs/visual/default_design_tokens.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is DesignTokens:
			return res as DesignTokens
	return DesignTokens.new()
