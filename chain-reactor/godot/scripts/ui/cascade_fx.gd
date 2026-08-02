class_name CRCascadeFx
extends Control

const CRArt := preload("res://scripts/ui/art.gd")

signal finished

var _queue: Array = []
var _timer: float = 0.0
var _step_delay: float = 0.2
var playing: bool = false
var beam_color: Color = CRArt.COLOR_CYAN
var _beams: Array = []
var _bursts: Array = []
var _banners: Array = []
var _cell_centers: Callable ## (Vector2i) -> Vector2


func configure(cell_centers: Callable) -> void:
	_cell_centers = cell_centers
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func start(events: Array, color: Color = CRArt.COLOR_CYAN) -> void:
	_queue = events.duplicate()
	_timer = 0.0
	playing = true
	beam_color = color
	_beams.clear()
	_bursts.clear()
	_banners.clear()
	queue_redraw()


func skip() -> void:
	if not playing:
		return
	_queue.clear()
	_finish()


func _finish() -> void:
	playing = false
	finished.emit()


func _process(dt: float) -> void:
	var dirty := false
	for b in _beams:
		b["life"] -= dt
		dirty = true
	_beams = _beams.filter(func(b): return float(b["life"]) > 0.0)
	for b in _bursts:
		b["life"] -= dt
		dirty = true
	_bursts = _bursts.filter(func(b): return float(b["life"]) > 0.0)
	for b in _banners:
		b["life"] -= dt
		dirty = true
	_banners = _banners.filter(func(b): return float(b["life"]) > 0.0)

	if playing:
		_timer -= dt
		if _timer <= 0.0:
			if _queue.is_empty():
				_finish()
			else:
				var ev: Dictionary = _queue.pop_front()
				_play_event(ev)
				_timer = _step_delay
			dirty = true

	if dirty:
		queue_redraw()


func _play_event(e: Dictionary) -> void:
	var t := str(e.get("type", ""))
	if t == "beam":
		var from_pos: Vector2i = e["from"]
		var from: Vector2 = _cell_centers.call(from_pos)
		var to: Vector2 = from
		if e.get("to", null) != null:
			to = _cell_centers.call(e["to"])
		else:
			var reach := 140.0
			match str(e.get("dir", "")):
				"up":
					to = from + Vector2(0, -reach)
				"down":
					to = from + Vector2(0, reach)
				"left":
					to = from + Vector2(-reach, 0)
				"right":
					to = from + Vector2(reach, 0)
		_beams.append({
			"from": from,
			"to": to,
			"life": 0.45,
			"max": 0.45,
			"width": 3.0 + float(e.get("step", 1)) * 1.5,
			"color": beam_color,
		})
		if str(e.get("kind", "")) == "hit":
			_push_banner("BEAM", CRArt.COLOR_CYAN, 0.35)
	elif t == "damage":
		var c: Vector2 = _cell_centers.call(e["pos"])
		_bursts.append({"pos": c, "life": 0.4, "max": 0.4, "color": CRArt.COLOR_DANGER})
		_push_banner("HIT -%d" % int(e.get("amount", 0)), CRArt.COLOR_DANGER, 0.45)
	elif t == "capture":
		var c2: Vector2 = _cell_centers.call(e["pos"])
		_bursts.append({"pos": c2, "life": 0.7, "max": 0.7, "color": beam_color, "ring": true})
		_push_banner("OVERTHROW", beam_color, 0.9)
	elif t == "relay":
		_push_banner("CHAIN", CRArt.COLOR_ENERGY, 0.4)
	elif t == "split":
		_push_banner("SPLIT", CRArt.COLOR_ENERGY, 0.4)
	elif t == "reflect":
		_push_banner("REFLECT +%d" % int(e.get("bonus", 3)), CRArt.COLOR_PURPLE, 0.4)
	elif t == "fire":
		if int(e.get("step", 1)) >= 3:
			_push_banner("CHAIN x%d" % int(e["step"]), CRArt.COLOR_CYAN, 0.4)


func _push_banner(text: String, color: Color, life: float) -> void:
	_banners.append({"text": text, "color": color, "life": life, "max": life})


func _draw() -> void:
	for b in _beams:
		var life: float = float(b["life"])
		var mx: float = float(b["max"])
		var a := clampf(life / mx, 0.0, 1.0)
		var col: Color = b["color"]
		col.a = a
		var glow := col
		glow.a = a * 0.35
		draw_line(b["from"], b["to"], glow, float(b["width"]) + 8.0, true)
		draw_line(b["from"], b["to"], col, float(b["width"]), true)

	for b in _bursts:
		var life2: float = float(b["life"])
		var mx2: float = float(b["max"])
		var t := 1.0 - clampf(life2 / mx2, 0.0, 1.0)
		var col2: Color = b["color"]
		col2.a = 1.0 - t
		var radius := lerpf(8.0, 48.0, t)
		if bool(b.get("ring", false)):
			draw_arc(b["pos"], radius, 0, TAU, 48, col2, 3.0)
			draw_circle(b["pos"], 6.0, col2)
		else:
			for i in 8:
				var ang := float(i) * TAU / 8.0
				var p2: Vector2 = b["pos"] + Vector2(cos(ang), sin(ang)) * radius
				draw_circle(p2, 3.0, col2)

	# Banners stacked near top-center of overlay
	var y := size.y * 0.18
	for b in _banners:
		var life3: float = float(b["life"])
		var mx3: float = float(b["max"])
		var a3 := clampf(life3 / mx3, 0.0, 1.0)
		var col3: Color = b["color"]
		col3.a = a3
		var font := CRArt.title_font()
		var text: String = str(b["text"])
		var fs := 28
		var tw := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		var x := (size.x - tw) * 0.5
		draw_string(font, Vector2(x + 2, y + 2), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0, 0, 0, 0.55 * a3))
		draw_string(font, Vector2(x, y), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col3)
		y += 34.0
