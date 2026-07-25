class_name PuzzleVisuals
extends RefCounted
## Presentation map: occupant_id / beam color → emissive color + glyph.
## Pure data helper — no Node deps.


static func color_for(occupant: StringName, tokens: DesignTokens = null) -> Color:
	var t := tokens if tokens else DesignTokens.new()
	if occupant == &"" or String(occupant).is_empty():
		return t.tile_empty
	var id := String(occupant)
	match id:
		"laser_emitter", "block_red", "red":
			return t.object_red
		"laser_receiver":
			return t.object_red
		"mirror", "mirror_backslash":
			return t.object_cyan
		"magnet":
			return t.object_purple
		"ghost_block":
			return Color(t.object_purple.r, t.object_purple.g, t.object_purple.b, 0.75)
		"time_rewind", "time_slow", "time_chronolock":
			return t.accent_secondary
		"door", "heavy_door":
			return t.accent_steel
		"switch", "pressure_plate":
			return t.object_yellow
		"teleporter":
			return t.object_cyan
		"gravity_block", "block_blue", "blue":
			return t.object_blue
		"block_green", "green", "crate", "burnable_crate":
			return t.object_green
		"block_yellow", "yellow", "fire":
			return t.object_yellow
		"wall":
			return Color(0.28, 0.26, 0.36, 1.0)
		"enemy_patrol":
			return t.accent_warn
		"ice":
			return Color(0.55, 0.85, 1.0, 1.0)
		_:
			return _hash_palette(id, t)


static func beam_color(name: String, tokens: DesignTokens = null) -> Color:
	var t := tokens if tokens else DesignTokens.new()
	match name.to_lower():
		"red":
			return t.object_red
		"blue":
			return t.object_blue
		"green":
			return t.object_green
		"yellow":
			return t.object_yellow
		"purple":
			return t.object_purple
		"cyan", "white":
			return t.object_cyan if name.to_lower() == "cyan" else t.object_white
		_:
			return t.accent_beam


static func glyph_for(occupant: StringName) -> String:
	if occupant == &"" or String(occupant).is_empty():
		return ""
	match String(occupant):
		"laser_emitter":
			return "◈"
		"laser_receiver":
			return "◉"
		"mirror":
			return "/"
		"mirror_backslash":
			return "\\"
		"magnet":
			return "U"
		"ghost_block":
			return "◇"
		"time_rewind":
			return "⌛"
		"time_slow", "time_chronolock":
			return "◷"
		"door", "heavy_door":
			return "▣"
		"switch":
			return "⏻"
		"pressure_plate":
			return "▭"
		"teleporter":
			return "◎"
		"gravity_block", "block_blue":
			return "◆"
		"block_red", "red":
			return "■"
		"block_green", "green", "crate", "burnable_crate":
			return "■"
		"block_yellow", "yellow":
			return "■"
		"wall":
			return "▓"
		"enemy_patrol":
			return "▾"
		"ice":
			return "✦"
		"fire":
			return "▴"
		_:
			var s := String(occupant)
			return s.substr(0, 1).to_upper() if s.length() > 0 else "●"


static func _hash_palette(id: String, t: DesignTokens) -> Color:
	var palette: Array[Color] = [
		t.object_cyan,
		t.object_blue,
		t.object_red,
		t.object_yellow,
		t.object_purple,
		t.object_green,
		t.accent_beam,
		t.object_white,
	]
	var h := 0
	for i in id.length():
		h = (h * 31 + id.unicode_at(i)) & 0x7fffffff
	return palette[h % palette.size()]
