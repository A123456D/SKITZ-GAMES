class_name TrailRenderer
extends Node2D
## Short glow trails for sliding tiles. Uses pooled Line2D nodes — no per-frame alloc spikes.
## Call begin_trail / sample / end_trail from the animator while tiles move.
## _process disabled when idle (battery / CPU).

const POOL_SIZE := 24
const MAX_POINTS := 10

var feel: ShiftFeelConfig = null
var _pool: Array[Line2D] = []
var _active: Dictionary = {} ## tile_id (int) -> Line2D
var _ages: Dictionary = {} ## Line2D -> float remaining life
var _release_buf: Array[Line2D] = [] ## reused; avoids per-frame Array alloc


func _ready() -> void:
	set_process(false)
	_ensure_pool()


func configure(p_feel: ShiftFeelConfig) -> void:
	feel = p_feel


func begin_trail(tile_id: int, color: Color, start: Vector2) -> void:
	if feel and not feel.wants_trails():
		return
	_ensure_pool()
	var line := _acquire()
	if line == null:
		return
	line.clear_points()
	line.default_color = Color(color.r, color.g, color.b, 0.55)
	line.width = feel.trail_width if feel else 8.0
	line.add_point(start)
	line.visible = true
	_active[tile_id] = line
	_ages[line] = feel.trail_lifetime if feel else 0.12
	set_process(true)


func sample(tile_id: int, pos: Vector2) -> void:
	if not _active.has(tile_id):
		return
	var line: Line2D = _active[tile_id]
	if line.get_point_count() >= MAX_POINTS:
		line.remove_point(0)
	line.add_point(pos)
	_ages[line] = feel.trail_lifetime if feel else 0.12


func end_trail(tile_id: int) -> void:
	if not _active.has(tile_id):
		return
	var line: Line2D = _active[tile_id]
	_active.erase(tile_id)
	_ages[line] = minf(float(_ages.get(line, 0.08)), 0.08)
	set_process(true)


func clear_all() -> void:
	for id in _active.keys():
		end_trail(int(id))
	for line in _pool:
		line.clear_points()
		line.visible = false
		_ages.erase(line)
	set_process(false)


func _process(delta: float) -> void:
	if _ages.is_empty():
		set_process(false)
		return
	_release_buf.clear()
	for line in _ages.keys():
		var life: float = float(_ages[line]) - delta
		_ages[line] = life
		if life <= 0.0:
			_release_buf.append(line)
		else:
			var a := clampf(life / maxf(0.001, feel.trail_lifetime if feel else 0.12), 0.0, 1.0)
			var c: Color = (line as Line2D).default_color
			c.a = 0.55 * a
			(line as Line2D).default_color = c
			(line as Line2D).width = (feel.trail_width if feel else 8.0) * (0.4 + 0.6 * a)
	for line in _release_buf:
		_release(line)
	if _ages.is_empty():
		set_process(false)


func _ensure_pool() -> void:
	while _pool.size() < POOL_SIZE:
		var line := Line2D.new()
		line.joint_mode = Line2D.LINE_JOINT_ROUND
		line.begin_cap_mode = Line2D.LINE_CAP_ROUND
		line.end_cap_mode = Line2D.LINE_CAP_ROUND
		line.antialiased = true
		line.visible = false
		line.z_index = -1
		add_child(line)
		_pool.append(line)


func _acquire() -> Line2D:
	for line in _pool:
		if not line.visible and not _active.values().has(line):
			return line
	return null


func _release(line: Line2D) -> void:
	_ages.erase(line)
	for k in _active.keys():
		if _active[k] == line:
			_active.erase(k)
			break
	line.clear_points()
	line.visible = false
