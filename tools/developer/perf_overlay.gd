class_name PerfOverlay
extends CanvasLayer
## Dev-only FPS / frame-time overlay. Enable with F3 when OS.has_feature("editor")
## or ProjectSettings `shiftr/debug/perf_overlay` = true.
## Never ship enabled in release player builds without the tools flag.

const TOGGLE_ACTION := &"ui_perf_overlay"

var _label: Label
var _enabled: bool = false
var _accum: float = 0.0
var _frames: int = 0
var _fps: float = 0.0


static func should_allow() -> bool:
	if OS.has_feature("editor"):
		return true
	if ProjectSettings.has_setting("shiftr/debug/perf_overlay"):
		return bool(ProjectSettings.get_setting("shiftr/debug/perf_overlay"))
	return OS.is_debug_build()


func _ready() -> void:
	layer = 128
	process_mode = Node.PROCESS_MODE_ALWAYS
	_label = Label.new()
	_label.name = "PerfLabel"
	_label.position = Vector2(12, 12)
	_label.add_theme_font_size_override("font_size", 14)
	_label.add_theme_color_override("font_color", Color(0.95, 0.98, 1.0, 0.9))
	_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	_label.add_theme_constant_override("outline_size", 4)
	_label.visible = false
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_label)
	set_process(false)
	if not InputMap.has_action(TOGGLE_ACTION):
		InputMap.add_action(TOGGLE_ACTION)
		var ev := InputEventKey.new()
		ev.keycode = KEY_F3
		InputMap.action_add_event(TOGGLE_ACTION, ev)


func _unhandled_input(event: InputEvent) -> void:
	if not should_allow():
		return
	if event.is_action_pressed(TOGGLE_ACTION):
		set_overlay_enabled(not _enabled)
		get_viewport().set_input_as_handled()


func set_overlay_enabled(on: bool) -> void:
	_enabled = on
	_label.visible = on
	set_process(on)
	if on:
		_accum = 0.0
		_frames = 0


func _process(delta: float) -> void:
	_accum += delta
	_frames += 1
	if _accum >= 0.35:
		_fps = float(_frames) / _accum
		_accum = 0.0
		_frames = 0
		var ms := 1000.0 / maxf(_fps, 0.01)
		var draw_hint := "?"
		var vp := get_viewport()
		if vp:
			# Approximation: RenderingServer has get_rendering_info in 4.x.
			var objs := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_OBJECTS_IN_FRAME)
			draw_hint = str(objs)
		_label.text = "FPS %.0f  |  %.2f ms  |  objects %s  |  budget %.1f/%.1f ms" % [
			_fps, ms, draw_hint, PerfBudgets.FRAME_MS_60, PerfBudgets.FRAME_MS_120
		]
		if _fps < float(PerfBudgets.TARGET_FPS_MIN) - 1.0:
			_label.add_theme_color_override("font_color", Color(1.0, 0.45, 0.3, 0.95))
		else:
			_label.add_theme_color_override("font_color", Color(0.95, 0.98, 1.0, 0.9))
