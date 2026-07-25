class_name UiScreen
extends Control
## Base for stack screens â€” enter/exit motion, shared context from UiRouter.

signal request_push(screen_id: StringName, params: Dictionary)
signal request_pop
signal request_sheet(sheet_id: StringName, params: Dictionary)

@export var screen_id: StringName = &""
@export var title: String = ""
@export var subtitle: String = ""
@export var shows_back: bool = true
@export var shows_currency: bool = false

var router: UiRouter
var tokens: DesignTokens
var settings: UiSettingsState
var params: Dictionary = {}

var _enter_tween: Tween


func setup(p_router: UiRouter, p_params: Dictionary = {}) -> void:
	router = p_router
	params = p_params
	tokens = router.tokens if router else null
	settings = router.settings if router else null
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	if tokens:
		theme = router.get_app_theme() if router else null
	_build()
	_apply_text_scale()
	if settings and not settings.changed.is_connected(_on_settings_changed):
		settings.changed.connect(_on_settings_changed)


func _build() -> void:
	pass


func on_enter() -> void:
	play_enter()


func on_exit() -> void:
	pass


func play_enter() -> void:
	var reduce := settings != null and settings.reduce_motion
	modulate.a = 0.0
	if _enter_tween and _enter_tween.is_valid():
		_enter_tween.kill()
	_enter_tween = create_tween()
	var dur := 0.08 if reduce else (tokens.duration_panel if tokens else 0.22)
	_enter_tween.set_parallel(true)
	_enter_tween.tween_property(self, "modulate:a", 1.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	if not reduce:
		offset_left = 16.0
		offset_right = 16.0
		_enter_tween.tween_property(self, "offset_left", 0.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		_enter_tween.tween_property(self, "offset_right", 0.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


func play_exit() -> void:
	var reduce := settings != null and settings.reduce_motion
	if _enter_tween and _enter_tween.is_valid():
		_enter_tween.kill()
	_enter_tween = create_tween()
	var dur := 0.06 if reduce else (tokens.duration_panel if tokens else 0.18)
	_enter_tween.set_parallel(true)
	_enter_tween.tween_property(self, "modulate:a", 0.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	if not reduce:
		_enter_tween.tween_property(self, "offset_left", 12.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
		_enter_tween.tween_property(self, "offset_right", 12.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	await _enter_tween.finished


func feel_press(control: Control = null) -> void:
	if router:
		router.play_button_feel(control)


func push(id: StringName, p: Dictionary = {}) -> void:
	request_push.emit(id, p)


func pop() -> void:
	request_pop.emit()


func open_sheet(id: StringName, p: Dictionary = {}) -> void:
	request_sheet.emit(id, p)


func _on_settings_changed() -> void:
	_apply_text_scale()
	_on_settings_updated()


func _on_settings_updated() -> void:
	pass


func _apply_text_scale() -> void:
	pass


func scaled(base: int) -> int:
	if settings:
		return settings.scaled_font(base)
	return base
