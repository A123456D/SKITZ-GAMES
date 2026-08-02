class_name CRCardFace
extends Control

const CRCards := preload("res://scripts/core/cards.gd")
const CRTypes := preload("res://scripts/core/types.gd")
const CRArt := preload("res://scripts/ui/art.gd")

signal pressed_card

var def_id: String = ""
var owner_id: String = ""
var power_override: int = -1
var selected: bool = false
var dimmed: bool = false
var compact: bool = false
var interactive: bool = false
var disabled_play: bool = false


func setup(
	p_def_id: String,
	opts: Dictionary = {},
) -> void:
	def_id = p_def_id
	owner_id = str(opts.get("owner", ""))
	power_override = int(opts.get("power", -1))
	selected = bool(opts.get("selected", false))
	dimmed = bool(opts.get("dimmed", false))
	compact = bool(opts.get("compact", false))
	interactive = bool(opts.get("interactive", false))
	disabled_play = bool(opts.get("disabled", false))
	mouse_filter = Control.MOUSE_FILTER_STOP if interactive else Control.MOUSE_FILTER_IGNORE
	queue_redraw()


func _gui_input(event: InputEvent) -> void:
	if not interactive or disabled_play:
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		pressed_card.emit()
		accept_event()


func _draw() -> void:
	if def_id == "":
		return
	var def: Dictionary = CRCards.get_card(def_id)
	var w := size.x
	var h := size.y
	var accent: Color = CRArt.owner_color(owner_id) if owner_id != "" else CRArt.faction_accent(str(def["faction"]))
	var power := power_override if power_override >= 0 else int(def["power"])
	var alpha := 0.42 if dimmed else 1.0

	# Shadow
	draw_set_transform(Vector2(0, 6), 0.0, Vector2.ONE)
	draw_colored_polygon(_round_poly(Rect2(4, 4, w - 8, h - 8), 14), Color(0, 0, 0, 0.45 * alpha))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	var face := Color("0a1018")
	face.a = alpha
	draw_colored_polygon(_round_poly(Rect2(0, 0, w, h), 16), face)

	# Brushed gradient approximation (stacked bands)
	var bands := [
		[0.0, Color("243044")],
		[0.2, Color("1a2438")],
		[0.55, Color("121a28")],
		[1.0, Color("0a1018")],
	]
	for i in range(bands.size() - 1):
		var y0: float = bands[i][0] * h
		var y1: float = bands[i + 1][0] * h
		var c: Color = bands[i][1]
		c.a = alpha
		draw_rect(Rect2(2, y0, w - 4, maxf(1.0, y1 - y0)), c, true)

	# Bevel
	var hi := Color(0.86, 0.92, 1.0, 0.35 * alpha)
	var lo := Color(0, 0, 0, 0.55 * alpha)
	draw_polyline(_round_poly(Rect2(1, 1, w - 2, h - 2), 15), hi, 2.0, true)
	draw_polyline(_round_poly(Rect2(3, 3, w - 6, h - 6), 13), lo, 2.0, true)

	# Faction rail
	var rail: Color = CRArt.faction_accent(str(def["faction"]))
	rail.a = 0.85 * alpha
	draw_colored_polygon(_round_poly(Rect2(4, 18, 5, h - 36), 3), rail)

	# Selection stroke
	var stroke := accent if selected else Color(0.63, 0.73, 0.86, 0.4)
	stroke.a *= alpha
	draw_polyline(_round_poly(Rect2(0, 0, w, h), 16), stroke, 3.5 if selected else 1.75, true)

	# Frame overlay
	var frame: Texture2D = CRArt.ui("ui-card-frame.png")
	if frame:
		draw_texture_rect(frame, Rect2(-2, -2, w + 4, h + 4), false, Color(1, 1, 1, 0.5 * alpha))

	# Art window
	var art_pad := w * 0.1
	var art_top := h * (0.14 if compact else 0.16)
	var art_h := h * (0.58 if compact else 0.42)
	var art_box := Rect2(art_pad, art_top, w - art_pad * 2, art_h)
	draw_colored_polygon(_round_poly(art_box, 10), Color(0.02, 0.03, 0.05, alpha))
	var art: Texture2D = CRArt.card_art(def_id)
	if art:
		var side := minf(art_box.size.x, art_box.size.y) * 0.95
		var ax := art_box.position.x + (art_box.size.x - side) * 0.5
		var ay := art_box.position.y + (art_box.size.y - side) * 0.5
		draw_texture_rect(art, Rect2(ax, ay, side, side), false, Color(1, 1, 1, alpha))
	draw_polyline(_round_poly(art_box, 10), Color(0.18, 0.94, 1.0, 0.28 * alpha), 1.0, true)

	# Arrows
	var dirs: Array[String] = CRTypes.list_arrows(def["arrows"])
	var ac := art_box.get_center()
	var reach_x := art_box.size.x * 0.42
	var reach_y := art_box.size.y * 0.42
	for d in dirs:
		var ox := -reach_x if d == "left" else (reach_x if d == "right" else 0.0)
		var oy := -reach_y if d == "up" else (reach_y if d == "down" else 0.0)
		_draw_arrow(ac + Vector2(ox, oy), d, accent, 11.0 if compact else 13.0, alpha)

	# Cost gem
	var cost_r := 16.0 if compact else 18.0
	var cost_c := Vector2(18, 18)
	draw_circle(cost_c, cost_r, Color(0.04, 0.05, 0.08, alpha))
	draw_arc(cost_c, cost_r, 0, TAU, 32, accent, 2.0)
	_draw_text(str(int(def["cost"])), cost_c + Vector2(0, 5), 18 if compact else 20, CRArt.COLOR_TEXT, HORIZONTAL_ALIGNMENT_CENTER, alpha)

	# Power gem
	var pwr_c := Vector2(w - 18, 18)
	draw_circle(pwr_c, cost_r, Color(0.04, 0.05, 0.08, alpha))
	draw_arc(pwr_c, cost_r, 0, TAU, 32, CRArt.COLOR_ENERGY, 2.0)
	_draw_text(str(power), pwr_c + Vector2(0, 5), 18 if compact else 20, CRArt.COLOR_ENERGY, HORIZONTAL_ALIGNMENT_CENTER, alpha)

	# Name + node
	var font := CRArt.title_font()
	var name_y := art_box.position.y + art_box.size.y + (10 if compact else 14)
	var name_str := str(def["name"])
	if name_str.length() > 14:
		name_str = name_str.substr(0, 13) + "…"
	draw_string(font, Vector2(12, name_y + 16), name_str, HORIZONTAL_ALIGNMENT_LEFT, w - 24, 15 if compact else 17, Color(CRArt.COLOR_TEXT, alpha))
	var node_str := CRCards.node_title(str(def["node"]))
	draw_string(CRArt.body_font(), Vector2(12, name_y + 34), node_str, HORIZONTAL_ALIGNMENT_LEFT, w - 24, 12, Color(CRArt.COLOR_MUTED, alpha))

	if not compact:
		var ability := CRCards.ability_text(def)
		var ay := name_y + 52
		var lines := _wrap(ability, w - 24, 11)
		for i in mini(lines.size(), 3):
			draw_string(CRArt.body_font(), Vector2(12, ay + i * 14), lines[i], HORIZONTAL_ALIGNMENT_LEFT, w - 24, 11, Color(CRArt.COLOR_TEXT, 0.85 * alpha))
		var hint := CRCards.arrows_hint(def)
		if hint != "":
			draw_string(CRArt.bold_font(), Vector2(12, h - 14), hint, HORIZONTAL_ALIGNMENT_LEFT, w - 24, 12, Color(accent, alpha))


func _wrap(text: String, max_w: float, font_size: int) -> PackedStringArray:
	var font := CRArt.body_font()
	var words := text.split(" ")
	var lines: PackedStringArray = PackedStringArray()
	var line := ""
	for word in words:
		var test := line if line == "" else "%s %s" % [line, word]
		if font.get_string_size(test, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x > max_w and line != "":
			lines.append(line)
			line = word
		else:
			line = test
	if line != "":
		lines.append(line)
	return lines


func _draw_text(text: String, pos: Vector2, size_px: int, color: Color, align: HorizontalAlignment, alpha: float) -> void:
	var c := color
	c.a *= alpha
	var font := CRArt.bold_font()
	var tw := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size_px).x
	var x := pos.x
	if align == HORIZONTAL_ALIGNMENT_CENTER:
		x -= tw * 0.5
	draw_string(font, Vector2(x, pos.y), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size_px, c)


func _draw_arrow(center: Vector2, dir: String, color: Color, size_px: float, alpha: float) -> void:
	var c := color
	c.a = alpha
	var pts: PackedVector2Array = PackedVector2Array([
		Vector2(0, -size_px),
		Vector2(size_px * 0.55, size_px * 0.4),
		Vector2(-size_px * 0.55, size_px * 0.4),
	])
	var rot := 0.0
	match dir:
		"right":
			rot = PI * 0.5
		"down":
			rot = PI
		"left":
			rot = -PI * 0.5
	var xf := Transform2D(rot, center)
	var world: PackedVector2Array = PackedVector2Array()
	for p in pts:
		world.append(xf * p)
	draw_colored_polygon(world, c)


func _round_poly(r: Rect2, radius: float) -> PackedVector2Array:
	var rr := minf(radius, minf(r.size.x, r.size.y) * 0.5)
	var pts: PackedVector2Array = PackedVector2Array()
	var steps := 4
	var corners := [
		[r.position + Vector2(rr, rr), PI, PI * 1.5],
		[r.position + Vector2(r.size.x - rr, rr), PI * 1.5, TAU],
		[r.position + Vector2(r.size.x - rr, r.size.y - rr), 0.0, PI * 0.5],
		[r.position + Vector2(rr, r.size.y - rr), PI * 0.5, PI],
	]
	for corner in corners:
		var c: Vector2 = corner[0]
		var a0: float = corner[1]
		var a1: float = corner[2]
		for i in range(steps + 1):
			var t := float(i) / float(steps)
			var a := lerpf(a0, a1, t)
			pts.append(c + Vector2(cos(a), sin(a)) * rr)
	return pts
