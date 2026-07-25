class_name ObjectIconAtlas
extends RefCounted
## Procedural neon object silhouettes for board tiles.
## Unique shapes + glow rim; readable ~24–64px. Presentation only.
## Prefers authored/baked PNG under assets/textures/atlas/objects/.

const SIZE := 48
const BAKE_SCALE := 3 ## Supersample then Lanczos downscale for cleaner neon edges.

static var _cache: Dictionary = {} ## StringName → ImageTexture


static func texture_for(occupant: StringName) -> Texture2D:
	if occupant == &"" or String(occupant).is_empty():
		return null
	var key := occupant
	if _cache.has(key):
		return _cache[key] as Texture2D
	## Prefer authored atlas PNG when present (drop-in under assets/textures/atlas/objects/).
	var id := String(occupant)
	var png_path := "res://assets/textures/atlas/objects/%s.png" % id
	if ResourceLoader.exists(png_path):
		var loaded := load(png_path)
		if loaded is Texture2D:
			_cache[key] = loaded
			return loaded as Texture2D
	var img := _bake_icon_image(id)
	var tex := ImageTexture.create_from_image(img)
	_cache[key] = tex
	return tex


## Bake procedural icons to user:// or an absolute folder (tools / CI).
static func bake_pngs(out_dir: String, ids: PackedStringArray = PackedStringArray()) -> int:
	clear_cache()
	var list: PackedStringArray = ids
	if list.is_empty():
		list = PackedStringArray([
			"laser_emitter", "laser_receiver", "mirror", "mirror_backslash", "magnet",
			"ghost_block", "time_rewind", "door", "switch", "pressure_plate", "teleporter",
			"block_red", "block_blue", "block_green", "block_yellow", "crate", "wall",
			"ice", "fire", "enemy_patrol",
			"A", "B", "C", "D", "E", "F",
		])
	DirAccess.make_dir_recursive_absolute(out_dir)
	var n := 0
	for id in list:
		var img := _bake_icon_image(id)
		var path := out_dir.path_join("%s.png" % id)
		if img.save_png(path) == OK:
			n += 1
	return n


static func clear_cache() -> void:
	_cache.clear()


static func _bake_icon_image(id: String) -> Image:
	var big := SIZE * BAKE_SCALE
	var img := Image.create(big, big, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	_draw_icon(img, id, big)
	if BAKE_SCALE > 1:
		img.resize(SIZE, SIZE, Image.INTERPOLATE_LANCZOS)
	return img


static func _draw_icon(img: Image, id: String, canvas_size: int = SIZE) -> void:
	var s := float(canvas_size) / float(SIZE)
	match id:
		"laser_emitter":
			_emitter(img, s)
		"laser_receiver":
			_receiver_goal(img, s)
		"mirror":
			_mirror_slash(img, s)
		"mirror_backslash":
			_mirror_back(img, s)
		"magnet":
			_magnet(img, s)
		"ghost_block":
			_ghost(img, s)
		"time_rewind", "time_slow", "time_chronolock":
			_hourglass(img, s)
		"door", "heavy_door":
			_door(img, s)
		"switch":
			_switch(img, s)
		"pressure_plate":
			_plate(img, s)
		"teleporter":
			_teleporter(img, s)
		"block_red", "red":
			_color_block(img, Color(1.0, 0.28, 0.32), true, s)
		"block_blue", "blue", "gravity_block":
			_color_block(img, Color(0.28, 0.55, 1.0), false, s)
			_arrow_down(img, Color(0.75, 0.9, 1.0, 0.95), s)
		"block_green", "green":
			_color_block(img, Color(0.25, 0.95, 0.55), false, s)
			_clone_mark(img, s)
		"block_yellow", "yellow":
			_color_block(img, Color(1.0, 0.82, 0.2), false, s)
			_countdown_pips(img, 3, s)
		## Align generator palette letters — distinct silhouettes for Daily/Endless.
		"A":
			_align_swatch(img, Color(1.0, 0.32, 0.42), &"square", s)
		"B":
			_align_swatch(img, Color(0.35, 0.55, 1.0), &"diamond", s)
		"C":
			_align_swatch(img, Color(0.25, 0.95, 0.55), &"circle", s)
		"D":
			_align_swatch(img, Color(1.0, 0.82, 0.22), &"hex", s)
		"E":
			_align_swatch(img, Color(0.75, 0.4, 1.0), &"triangle", s)
		"F":
			_align_swatch(img, Color(0.2, 0.92, 0.95), &"cross", s)
		"crate", "burnable_crate":
			_crate(img, s)
		"wall":
			_wall(img, s)
		"ice":
			_ice(img, s)
		"fire":
			_fire(img, s)
		"enemy_patrol":
			_enemy(img, s)
		_:
			_fallback_diamond(img, s)


static func _S(v: float, s: float) -> int:
	return int(round(v * s))


static func _Sf(v: float, s: float) -> float:
	return v * s


static func _px(img: Image, x: int, y: int, c: Color) -> void:
	if x < 0 or y < 0 or x >= img.get_width() or y >= img.get_height():
		return
	var prev := img.get_pixel(x, y)
	if c.a >= prev.a:
		img.set_pixel(x, y, c)
	else:
		img.set_pixel(x, y, Color(
			prev.r * prev.a + c.r * c.a * (1.0 - prev.a),
			prev.g * prev.a + c.g * c.a * (1.0 - prev.a),
			prev.b * prev.a + c.b * c.a * (1.0 - prev.a),
			prev.a + c.a * (1.0 - prev.a)
		))


static func _glow_disk(img: Image, cx: float, cy: float, r: float, core: Color) -> void:
	var ri := int(ceil(r)) + 3
	var x0 := maxi(0, int(cx) - ri)
	var y0 := maxi(0, int(cy) - ri)
	var x1 := mini(img.get_width() - 1, int(cx) + ri)
	var y1 := mini(img.get_height() - 1, int(cy) + ri)
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			var d := sqrt((float(x) - cx) * (float(x) - cx) + (float(y) - cy) * (float(y) - cy))
			if d > r:
				continue
			var t := 1.0 - d / r
			var a := (t * t * (0.55 + 0.45 * t)) * core.a
			_px(img, x, y, Color(core.r, core.g, core.b, a))


static func _line(img: Image, x0: int, y0: int, x1: int, y1: int, c: Color, thick: int = 1) -> void:
	var dx := absi(x1 - x0)
	var dy := -absi(y1 - y0)
	var sx := 1 if x0 < x1 else -1
	var sy := 1 if y0 < y1 else -1
	var err := dx + dy
	var x := x0
	var y := y0
	while true:
		for oy in range(-thick + 1, thick):
			for ox in range(-thick + 1, thick):
				_px(img, x + ox, y + oy, c)
		if x == x1 and y == y1:
			break
		var e2 := 2 * err
		if e2 >= dy:
			err += dy
			x += sx
		if e2 <= dx:
			err += dx
			y += sy


static func _rect(img: Image, x0: int, y0: int, x1: int, y1: int, c: Color, filled: bool = true) -> void:
	for y in range(mini(y0, y1), maxi(y0, y1) + 1):
		for x in range(mini(x0, x1), maxi(x0, x1) + 1):
			if filled or x == x0 or x == x1 or y == y0 or y == y1:
				_px(img, x, y, c)


static func _rounded_rect(img: Image, x0: int, y0: int, x1: int, y1: int, rad: int, c: Color) -> void:
	_rect(img, x0 + rad, y0, x1 - rad, y1, c, true)
	_rect(img, x0, y0 + rad, x1, y1 - rad, c, true)
	_glow_disk(img, float(x0 + rad), float(y0 + rad), float(rad) + 0.5, Color(c.r, c.g, c.b, c.a))
	_glow_disk(img, float(x1 - rad), float(y0 + rad), float(rad) + 0.5, Color(c.r, c.g, c.b, c.a))
	_glow_disk(img, float(x0 + rad), float(y1 - rad), float(rad) + 0.5, Color(c.r, c.g, c.b, c.a))
	_glow_disk(img, float(x1 - rad), float(y1 - rad), float(rad) + 0.5, Color(c.r, c.g, c.b, c.a))


static func _emitter(img: Image, s: float = 1.0) -> void:
	var c := Color(1.0, 0.22, 0.32, 1.0)
	_glow_disk(img, _Sf(22, s), _Sf(24, s), _Sf(19, s), Color(c.r, c.g, c.b, 0.48))
	## Body + dark rim for silhouette read at small sizes.
	_rounded_rect(img, _S(9, s), _S(13, s), _S(27, s), _S(35, s), _S(3, s), Color(0.08, 0.02, 0.06, 0.95))
	_rounded_rect(img, _S(11, s), _S(15, s), _S(25, s), _S(33, s), _S(2, s), Color(c.r, c.g, c.b, 0.98))
	_rect(img, _S(14, s), _S(18, s), _S(22, s), _S(30, s), Color(1, 0.78, 0.82, 0.55), true)
	## Chevron nozzle — unique vs receiver rings.
	_rect(img, _S(25, s), _S(19, s), _S(33, s), _S(29, s), Color(c.r * 0.7, c.g * 0.15, c.b * 0.2, 1), true)
	var th := maxi(2, _S(2, s))
	_line(img, _S(33, s), _S(24, s), _S(43, s), _S(24, s), Color(1, 0.5, 0.55, 1), th)
	_line(img, _S(36, s), _S(17, s), _S(44, s), _S(24, s), Color(1, 0.8, 0.85, 1), th)
	_line(img, _S(36, s), _S(31, s), _S(44, s), _S(24, s), Color(1, 0.8, 0.85, 1), th)
	_glow_disk(img, _Sf(41, s), _Sf(24, s), _Sf(5.5, s), Color(1, 0.72, 0.78, 0.8))


static func _receiver_goal(img: Image, s: float = 1.0) -> void:
	var c := Color(1.0, 0.32, 0.42, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(22, s), Color(c.r, c.g, c.b, 0.48))
	for r in [17, 12, 7]:
		_ring(img, _S(24, s), _S(24, s), _S(r, s), Color(c.r, c.g, c.b, 0.95 if r > 10 else 1.0), s)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(5.5, s), Color(1, 0.9, 0.95, 1))
	var th := maxi(2, _S(2, s))
	_line(img, _S(24, s), _S(4, s), _S(24, s), _S(10, s), c, th)
	_line(img, _S(24, s), _S(38, s), _S(24, s), _S(44, s), c, th)
	_line(img, _S(4, s), _S(24, s), _S(10, s), _S(24, s), c, th)
	_line(img, _S(38, s), _S(24, s), _S(44, s), _S(24, s), c, th)


static func _ring(img: Image, cx: int, cy: int, r: int, c: Color, s: float = 1.0) -> void:
	var step := maxi(1, int(round(2.0 / maxf(s, 1.0))))
	for a in range(0, 360, step):
		var rad := deg_to_rad(float(a))
		var x := int(round(float(cx) + cos(rad) * float(r)))
		var y := int(round(float(cy) + sin(rad) * float(r)))
		_px(img, x, y, c)
		_px(img, x + 1, y, Color(c.r, c.g, c.b, c.a * 0.55))
		_px(img, x, y + 1, Color(c.r, c.g, c.b, c.a * 0.35))


static func _mirror_slash(img: Image, s: float = 1.0) -> void:
	var c := Color(0.3, 0.95, 1.0, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(18, s), Color(c.r, c.g, c.b, 0.34))
	_line(img, _S(10, s), _S(38, s), _S(38, s), _S(10, s), Color(0.12, 0.35, 0.45, 0.9), maxi(4, _S(5, s)))
	_line(img, _S(11, s), _S(37, s), _S(37, s), _S(11, s), c, maxi(2, _S(3, s)))
	_line(img, _S(14, s), _S(36, s), _S(36, s), _S(14, s), Color(0.85, 1, 1, 0.9), maxi(1, _S(1, s)))
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(3.5, s), Color(1, 1, 1, 0.95))


static func _mirror_back(img: Image, s: float = 1.0) -> void:
	var c := Color(0.3, 0.95, 1.0, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(18, s), Color(c.r, c.g, c.b, 0.34))
	_line(img, _S(10, s), _S(10, s), _S(38, s), _S(38, s), Color(0.12, 0.35, 0.45, 0.9), maxi(4, _S(5, s)))
	_line(img, _S(11, s), _S(11, s), _S(37, s), _S(37, s), c, maxi(2, _S(3, s)))
	_line(img, _S(14, s), _S(14, s), _S(34, s), _S(34, s), Color(0.85, 1, 1, 0.9), maxi(1, _S(1, s)))
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(3.5, s), Color(1, 1, 1, 0.95))


static func _magnet(img: Image, s: float = 1.0) -> void:
	var c := Color(0.75, 0.38, 1.0, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(21, s), Color(c.r, c.g, c.b, 0.42))
	## Outer horseshoe silhouette (dark stroke) then fill — reads as U, not twin bars.
	_rounded_rect(img, _S(10, s), _S(9, s), _S(20, s), _S(37, s), _S(3, s), Color(0.12, 0.05, 0.18, 1))
	_rounded_rect(img, _S(28, s), _S(9, s), _S(38, s), _S(37, s), _S(3, s), Color(0.12, 0.05, 0.18, 1))
	_rect(img, _S(10, s), _S(27, s), _S(38, s), _S(37, s), Color(0.12, 0.05, 0.18, 1), true)
	_rounded_rect(img, _S(12, s), _S(11, s), _S(18, s), _S(35, s), _S(2, s), c)
	_rounded_rect(img, _S(30, s), _S(11, s), _S(36, s), _S(35, s), _S(2, s), c)
	_rect(img, _S(12, s), _S(29, s), _S(36, s), _S(35, s), c, true)
	_rect(img, _S(15, s), _S(14, s), _S(17, s), _S(31, s), Color(0.12, 0.06, 0.18, 0.75), true)
	_rect(img, _S(31, s), _S(14, s), _S(33, s), _S(31, s), Color(0.12, 0.06, 0.18, 0.75), true)
	_rect(img, _S(12, s), _S(10, s), _S(18, s), _S(16, s), Color(1, 0.42, 0.48, 1), true)
	_rect(img, _S(30, s), _S(10, s), _S(36, s), _S(16, s), Color(0.42, 0.72, 1.0, 1), true)
	_glow_disk(img, _Sf(15, s), _Sf(12, s), _Sf(3.8, s), Color(1, 0.62, 0.68, 0.9))
	_glow_disk(img, _Sf(33, s), _Sf(12, s), _Sf(3.8, s), Color(0.68, 0.88, 1.0, 0.9))


static func _ghost(img: Image, s: float = 1.0) -> void:
	var c := Color(0.78, 0.55, 1.0, 0.9)
	_glow_disk(img, _Sf(24, s), _Sf(21, s), _Sf(16, s), Color(c.r, c.g, c.b, 0.32))
	_ring(img, _S(24, s), _S(19, s), _S(13, s), c, s)
	_ring(img, _S(24, s), _S(19, s), _S(9, s), Color(c.r, c.g, c.b, 0.5), s)
	var th := maxi(2, _S(2, s))
	_line(img, _S(14, s), _S(28, s), _S(18, s), _S(38, s), c, th)
	_line(img, _S(24, s), _S(28, s), _S(24, s), _S(40, s), c, th)
	_line(img, _S(34, s), _S(28, s), _S(30, s), _S(38, s), c, th)
	_glow_disk(img, _Sf(19.5, s), _Sf(17, s), _Sf(1.8, s), Color(1, 1, 1, 0.95))
	_glow_disk(img, _Sf(28.5, s), _Sf(17, s), _Sf(1.8, s), Color(1, 1, 1, 0.95))


static func _hourglass(img: Image, s: float = 1.0) -> void:
	var c := Color(0.35, 0.7, 1.0, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(18, s), Color(c.r, c.g, c.b, 0.34))
	var th := maxi(2, _S(2, s))
	_line(img, _S(12, s), _S(9, s), _S(36, s), _S(9, s), c, th)
	_line(img, _S(12, s), _S(39, s), _S(36, s), _S(39, s), c, th)
	_line(img, _S(12, s), _S(9, s), _S(24, s), _S(24, s), c, th)
	_line(img, _S(36, s), _S(9, s), _S(24, s), _S(24, s), c, th)
	_line(img, _S(12, s), _S(39, s), _S(24, s), _S(24, s), c, th)
	_line(img, _S(36, s), _S(39, s), _S(24, s), _S(24, s), c, th)
	_glow_disk(img, _Sf(24, s), _Sf(18, s), _Sf(3.5, s), Color(0.75, 0.9, 1.0, 0.95))
	_glow_disk(img, _Sf(24, s), _Sf(30, s), _Sf(2.5, s), Color(0.55, 0.8, 1.0, 0.75))


static func _door(img: Image, s: float = 1.0) -> void:
	var c := Color(0.72, 0.78, 0.95, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(18, s), Color(0.55, 0.35, 0.95, 0.32))
	_rounded_rect(img, _S(12, s), _S(9, s), _S(22, s), _S(39, s), _S(2, s), Color(c.r, c.g, c.b, 0.95))
	_rounded_rect(img, _S(26, s), _S(9, s), _S(36, s), _S(39, s), _S(2, s), Color(c.r, c.g, c.b, 0.95))
	_rect(img, _S(14, s), _S(11, s), _S(20, s), _S(37, s), Color(0.14, 0.12, 0.24, 0.9), true)
	_rect(img, _S(28, s), _S(11, s), _S(34, s), _S(37, s), Color(0.14, 0.12, 0.24, 0.9), true)
	_rect(img, _S(22, s), _S(9, s), _S(26, s), _S(39, s), Color(0.9, 0.7, 1.0, 0.8), true)
	_glow_disk(img, _Sf(30, s), _Sf(24, s), _Sf(2.5, s), Color(1, 0.85, 0.4, 1))


static func _switch(img: Image, s: float = 1.0) -> void:
	var c := Color(1.0, 0.85, 0.22, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(30, s), _Sf(16, s), Color(c.r, c.g, c.b, 0.36))
	_rounded_rect(img, _S(12, s), _S(30, s), _S(36, s), _S(40, s), _S(2, s), Color(0.32, 0.28, 0.42, 0.95))
	_rect(img, _S(14, s), _S(32, s), _S(34, s), _S(38, s), Color(0.2, 0.18, 0.28, 0.8), true)
	_line(img, _S(24, s), _S(30, s), _S(18, s), _S(14, s), c, maxi(2, _S(3, s)))
	_glow_disk(img, _Sf(18, s), _Sf(12, s), _Sf(5.5, s), Color(1, 0.95, 0.55, 1))
	_glow_disk(img, _Sf(18, s), _Sf(12, s), _Sf(2.2, s), Color(1, 1, 1, 1))


static func _plate(img: Image, s: float = 1.0) -> void:
	var c := Color(1.0, 0.85, 0.3, 0.95)
	_rounded_rect(img, _S(8, s), _S(16, s), _S(40, s), _S(32, s), _S(3, s), Color(c.r, c.g, c.b, 0.3))
	_rect(img, _S(10, s), _S(18, s), _S(38, s), _S(30, s), c, false)
	_rect(img, _S(14, s), _S(21, s), _S(34, s), _S(27, s), Color(c.r, c.g, c.b, 0.55), true)


static func _teleporter(img: Image, s: float = 1.0) -> void:
	var c := Color(0.25, 0.95, 1.0, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(18, s), Color(c.r, c.g, c.b, 0.36))
	_ring(img, _S(24, s), _S(24, s), _S(15, s), c, s)
	_ring(img, _S(24, s), _S(24, s), _S(10, s), Color(c.r, c.g, c.b, 0.75), s)
	_ring(img, _S(24, s), _S(24, s), _S(5, s), Color(1, 1, 1, 0.85), s)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(2.5, s), Color(1, 1, 1, 1))


static func _color_block(img: Image, c: Color, axis_mark: bool, s: float = 1.0) -> void:
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(20, s), Color(c.r, c.g, c.b, 0.42))
	_rounded_rect(img, _S(11, s), _S(11, s), _S(37, s), _S(37, s), _S(4, s), Color(c.r * 0.55, c.g * 0.55, c.b * 0.55, 0.95))
	_rounded_rect(img, _S(13, s), _S(13, s), _S(35, s), _S(35, s), _S(3, s), Color(c.r, c.g, c.b, 0.98))
	_rect(img, _S(16, s), _S(16, s), _S(32, s), _S(22, s), Color(1, 1, 1, 0.32), true)
	_rect(img, _S(11, s), _S(11, s), _S(37, s), _S(37, s), Color(1, 1, 1, 0.45), false)
	if axis_mark:
		var th := maxi(2, _S(2, s))
		_line(img, _S(16, s), _S(24, s), _S(32, s), _S(24, s), Color(1, 1, 1, 0.95), th)
		_line(img, _S(16, s), _S(24, s), _S(20, s), _S(20, s), Color(1, 1, 1, 0.95), th)
		_line(img, _S(16, s), _S(24, s), _S(20, s), _S(28, s), Color(1, 1, 1, 0.95), th)
		_line(img, _S(32, s), _S(24, s), _S(28, s), _S(20, s), Color(1, 1, 1, 0.95), th)
		_line(img, _S(32, s), _S(24, s), _S(28, s), _S(28, s), Color(1, 1, 1, 0.95), th)


static func _arrow_down(img: Image, c: Color, s: float = 1.0) -> void:
	var th := maxi(2, _S(2, s))
	_line(img, _S(24, s), _S(16, s), _S(24, s), _S(30, s), c, th)
	_line(img, _S(18, s), _S(26, s), _S(24, s), _S(32, s), c, th)
	_line(img, _S(30, s), _S(26, s), _S(24, s), _S(32, s), c, th)


static func _clone_mark(img: Image, s: float = 1.0) -> void:
	var c := Color(1, 1, 1, 0.85)
	_rect(img, _S(16, s), _S(16, s), _S(26, s), _S(26, s), c, false)
	_rect(img, _S(22, s), _S(22, s), _S(32, s), _S(32, s), c, false)


static func _countdown_pips(img: Image, n: int, s: float = 1.0) -> void:
	var c := Color(0.15, 0.1, 0.05, 0.9)
	for i in n:
		var x := _S(16 + i * 6, s)
		_rect(img, x, _S(34, s), x + _S(4, s), _S(38, s), c, true)


static func _crate(img: Image, s: float = 1.0) -> void:
	var c := Color(0.85, 0.7, 0.45, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(15, s), Color(c.r, c.g, c.b, 0.24))
	_rounded_rect(img, _S(13, s), _S(13, s), _S(35, s), _S(35, s), _S(2, s), c)
	_line(img, _S(13, s), _S(13, s), _S(35, s), _S(35, s), Color(0.4, 0.28, 0.15, 0.8), maxi(1, _S(1, s)))
	_line(img, _S(35, s), _S(13, s), _S(13, s), _S(35, s), Color(0.4, 0.28, 0.15, 0.8), maxi(1, _S(1, s)))


static func _wall(img: Image, s: float = 1.0) -> void:
	_rounded_rect(img, _S(10, s), _S(10, s), _S(38, s), _S(38, s), _S(2, s), Color(0.35, 0.32, 0.45, 1))
	_rect(img, _S(10, s), _S(18, s), _S(38, s), _S(20, s), Color(0.2, 0.18, 0.28, 0.8), true)
	_rect(img, _S(22, s), _S(10, s), _S(24, s), _S(38, s), Color(0.2, 0.18, 0.28, 0.8), true)


static func _ice(img: Image, s: float = 1.0) -> void:
	var c := Color(0.6, 0.9, 1.0, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(15, s), Color(c.r, c.g, c.b, 0.4))
	_line(img, _S(24, s), _S(12, s), _S(24, s), _S(36, s), c, maxi(1, _S(1, s)))
	_line(img, _S(12, s), _S(24, s), _S(36, s), _S(24, s), c, maxi(1, _S(1, s)))
	_line(img, _S(16, s), _S(16, s), _S(32, s), _S(32, s), c, maxi(1, _S(1, s)))


static func _fire(img: Image, s: float = 1.0) -> void:
	var c := Color(1.0, 0.45, 0.15, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(28, s), _Sf(15, s), Color(c.r, c.g, c.b, 0.45))
	var th := maxi(2, _S(2, s))
	_line(img, _S(24, s), _S(34, s), _S(18, s), _S(20, s), c, th)
	_line(img, _S(24, s), _S(34, s), _S(30, s), _S(18, s), c, th)
	_line(img, _S(24, s), _S(34, s), _S(24, s), _S(14, s), Color(1, 0.85, 0.3, 1), th)


static func _enemy(img: Image, s: float = 1.0) -> void:
	var c := Color(1.0, 0.35, 0.45, 1.0)
	_glow_disk(img, _Sf(24, s), _Sf(22, s), _Sf(13, s), Color(c.r, c.g, c.b, 0.34))
	_rounded_rect(img, _S(16, s), _S(14, s), _S(32, s), _S(28, s), _S(3, s), c)
	_glow_disk(img, _Sf(20, s), _Sf(20, s), _Sf(1.6, s), Color(1, 1, 1, 1))
	_glow_disk(img, _Sf(28, s), _Sf(20, s), _Sf(1.6, s), Color(1, 1, 1, 1))
	_line(img, _S(20, s), _S(32, s), _S(18, s), _S(38, s), c, maxi(1, _S(1, s)))
	_line(img, _S(28, s), _S(32, s), _S(30, s), _S(38, s), c, maxi(1, _S(1, s)))


static func _fallback_diamond(img: Image, s: float = 1.0) -> void:
	var c := Color(0.85, 0.8, 1.0, 0.95)
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(15, s), Color(c.r, c.g, c.b, 0.28))
	var th := maxi(2, _S(2, s))
	_line(img, _S(24, s), _S(10, s), _S(36, s), _S(24, s), c, th)
	_line(img, _S(36, s), _S(24, s), _S(24, s), _S(38, s), c, th)
	_line(img, _S(24, s), _S(38, s), _S(12, s), _S(24, s), c, th)
	_line(img, _S(12, s), _S(24, s), _S(24, s), _S(10, s), c, th)


static func _align_swatch(img: Image, c: Color, shape: StringName, s: float = 1.0) -> void:
	## Distinct Align-mode silhouettes so A–F never collide at board scale.
	_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(20, s), Color(c.r, c.g, c.b, 0.4))
	var ink := Color(0.06, 0.04, 0.1, 0.95)
	var th := maxi(2, _S(2, s))
	match shape:
		&"square":
			_rounded_rect(img, _S(11, s), _S(11, s), _S(37, s), _S(37, s), _S(3, s), ink)
			_rounded_rect(img, _S(13, s), _S(13, s), _S(35, s), _S(35, s), _S(2, s), c)
		&"diamond":
			_line(img, _S(24, s), _S(8, s), _S(40, s), _S(24, s), ink, th + 1)
			_line(img, _S(40, s), _S(24, s), _S(24, s), _S(40, s), ink, th + 1)
			_line(img, _S(24, s), _S(40, s), _S(8, s), _S(24, s), ink, th + 1)
			_line(img, _S(8, s), _S(24, s), _S(24, s), _S(8, s), ink, th + 1)
			_line(img, _S(24, s), _S(10, s), _S(38, s), _S(24, s), c, th)
			_line(img, _S(38, s), _S(24, s), _S(24, s), _S(38, s), c, th)
			_line(img, _S(24, s), _S(38, s), _S(10, s), _S(24, s), c, th)
			_line(img, _S(10, s), _S(24, s), _S(24, s), _S(10, s), c, th)
			_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(6, s), Color(c.r, c.g, c.b, 0.95))
		&"circle":
			_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(14, s), ink)
			_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(12, s), c)
			_ring(img, _S(24, s), _S(24, s), _S(12, s), Color(1, 1, 1, 0.55), s)
		&"hex":
			for a in [0, 60, 120, 180, 240, 300]:
				var r0 := deg_to_rad(float(a) - 30.0)
				var r1 := deg_to_rad(float(a) + 30.0)
				var x0 := int(round(24.0 * s + cos(r0) * 14.0 * s))
				var y0 := int(round(24.0 * s + sin(r0) * 14.0 * s))
				var x1 := int(round(24.0 * s + cos(r1) * 14.0 * s))
				var y1 := int(round(24.0 * s + sin(r1) * 14.0 * s))
				_line(img, x0, y0, x1, y1, ink, th + 1)
				_line(img, x0, y0, x1, y1, c, th)
			_glow_disk(img, _Sf(24, s), _Sf(24, s), _Sf(5, s), Color(1, 1, 1, 0.85))
		&"triangle":
			_line(img, _S(24, s), _S(9, s), _S(38, s), _S(36, s), ink, th + 1)
			_line(img, _S(38, s), _S(36, s), _S(10, s), _S(36, s), ink, th + 1)
			_line(img, _S(10, s), _S(36, s), _S(24, s), _S(9, s), ink, th + 1)
			_line(img, _S(24, s), _S(11, s), _S(36, s), _S(34, s), c, th)
			_line(img, _S(36, s), _S(34, s), _S(12, s), _S(34, s), c, th)
			_line(img, _S(12, s), _S(34, s), _S(24, s), _S(11, s), c, th)
			_glow_disk(img, _Sf(24, s), _Sf(26, s), _Sf(4, s), Color(c.r, c.g, c.b, 0.9))
		_:
			_line(img, _S(14, s), _S(14, s), _S(34, s), _S(34, s), ink, th + 1)
			_line(img, _S(34, s), _S(14, s), _S(14, s), _S(34, s), ink, th + 1)
			_line(img, _S(15, s), _S(15, s), _S(33, s), _S(33, s), c, th)
			_line(img, _S(33, s), _S(15, s), _S(15, s), _S(33, s), c, th)
	_rect(img, _S(16, s), _S(15, s), _S(30, s), _S(19, s), Color(1, 1, 1, 0.22), true)
