class_name HitStopClock
extends Node
## View-only presentation hitch. Must NEVER gate BoardSim / BoardSession.
##
## Mechanism: briefly lower Engine.time_scale so tweens/particles/camera freeze,
## then restore after a real-time timer (ignore_time_scale). Sim is event-driven
## and does not sample Engine.time_scale — determinism is preserved.

signal hit_stop_started(duration_sec: float)
signal hit_stop_finished

var feel: ShiftFeelConfig = null

var _busy: bool = false
var _saved_scale: float = 1.0
var _stack_bonus_ms: float = 0.0


func configure(p_feel: ShiftFeelConfig) -> void:
	feel = p_feel


func is_busy() -> bool:
	return _busy


func request(duration_sec: float, time_scale: float = 0.06) -> void:
	if duration_sec <= 0.0:
		return
	if feel and (feel.reduce_motion or feel.disable_hit_stop or not feel.hit_stop_enabled):
		return
	if _busy:
		# Soft stack: extend slightly instead of nesting time_scale chaos.
		_stack_bonus_ms = minf(40.0, _stack_bonus_ms + duration_sec * 1000.0 * 0.35)
		return
	_run(duration_sec, time_scale)


func _run(duration_sec: float, time_scale: float) -> void:
	_busy = true
	_saved_scale = Engine.time_scale
	if _saved_scale <= 0.0001:
		_saved_scale = 1.0
	Engine.time_scale = clampf(time_scale, 0.02, 0.2)
	hit_stop_started.emit(duration_sec)
	var tree := get_tree()
	if tree == null:
		_restore()
		return
	# process_always=true, ignore_time_scale=true → real-time hitch length.
	var timer := tree.create_timer(duration_sec, true, true, true)
	timer.timeout.connect(_on_timer, CONNECT_ONE_SHOT)


func _on_timer() -> void:
	if _stack_bonus_ms > 0.0:
		var extra := _stack_bonus_ms * 0.001
		_stack_bonus_ms = 0.0
		var timer := get_tree().create_timer(extra, true, true, true)
		timer.timeout.connect(_restore, CONNECT_ONE_SHOT)
		return
	_restore()


func _restore() -> void:
	Engine.time_scale = _saved_scale if _saved_scale > 0.0001 else 1.0
	_busy = false
	_stack_bonus_ms = 0.0
	hit_stop_finished.emit()


func cancel() -> void:
	if not _busy:
		return
	_restore()


func _exit_tree() -> void:
	## Never leave Engine.time_scale stuck after scene teardown.
	if _busy:
		_restore()
