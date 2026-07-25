class_name ComboPitchTracker
extends RefCounted
## Increasing pitch on rapid chain hits. Presentation-only — never feeds BoardSim.

## Max gap between hits to stay in the same chain (seconds).
var window_sec: float = 0.45
## Pitch added per chain step after the first.
var pitch_step: float = 0.055
## Hard cap so chains never scream.
var pitch_cap: float = 1.35
var base_pitch: float = 1.0
## Soft ceiling on reported depth (UI / juice may still climb).
var depth_cap: int = 12

var depth: int = 0
var _last_sec: float = -999.0


func hit(now_sec: float = -1.0) -> float:
	if now_sec < 0.0:
		now_sec = Time.get_ticks_msec() * 0.001
	if now_sec - _last_sec > window_sec:
		depth = 0
	depth = mini(depth + 1, depth_cap)
	_last_sec = now_sec
	return current_pitch()


func peek_pitch(now_sec: float = -1.0) -> float:
	if now_sec < 0.0:
		now_sec = Time.get_ticks_msec() * 0.001
	if now_sec - _last_sec > window_sec:
		return base_pitch
	return current_pitch()


func current_pitch() -> float:
	if depth <= 1:
		return base_pitch
	return minf(pitch_cap, base_pitch + pitch_step * float(depth - 1))


func reset() -> void:
	depth = 0
	_last_sec = -999.0


## Undo / rebuild / puzzle exit — hard reset policy.
func on_interrupt() -> void:
	reset()
