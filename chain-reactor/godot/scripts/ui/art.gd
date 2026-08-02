class_name CRArt
extends RefCounted

const CARD_ART := {
	"n_pulse_n": "signal-spike.png",
	"n_pulse_cross": "pulse-reactor.png",
	"n_pulse_side": "lateral-ping.png",
	"n_amp": "amplifier-lens.png",
	"v_swarm1": "card-spark-drone.png",
	"v_swarm2": "volt-swarm.png",
	"v_swarm3": "volt-swarm.png",
	"v_edge": "pulse-reactor.png",
	"v_split1": "splitter-fork.png",
	"v_split2": "splitter-fork.png",
	"v_corner": "card-corner-surge.png",
	"p_center1": "prism-lattice.png",
	"p_center2": "prism-lattice.png",
	"p_reflect1": "reflector-prism.png",
	"p_reflect2": "reflector-prism.png",
	"p_amp1": "amplifier-lens.png",
	"p_amp2": "amplifier-lens.png",
	"p_wall": "card-hard-light.png",
	"o_late1": "card-dark-seed.png",
	"o_late2": "void-singularity.png",
	"o_nuke1": "void-nuke.png",
	"o_nuke2": "void-nuke.png",
	"o_siphon": "card-drain-lattice.png",
	"o_heavy": "card-void-pillar.png",
	"o_split": "splitter-fork.png",
}

const COLOR_BG := Color("07090f")
const COLOR_CYAN := Color("2ef0ff")
const COLOR_PURPLE := Color("b44cff")
const COLOR_ENEMY := Color("ff2ec8")
const COLOR_TEXT := Color("e8f0ff")
const COLOR_MUTED := Color("7a889f")
const COLOR_ENERGY := Color("ffe566")
const COLOR_DANGER := Color("ff4d6d")
const COLOR_CARD := Color("121826")

static var _tex: Dictionary = {}
static var _font_title: FontFile
static var _font_body: FontFile
static var _font_bold: FontFile


static func warm() -> void:
	_load_font("res://assets/fonts/Orbitron-ExtraBold.ttf", true)
	_load_font("res://assets/fonts/Orbitron-Bold.ttf", false)
	_load_font("res://assets/fonts/JetBrainsMono-Bold.ttf", false)
	_load_font("res://assets/fonts/JetBrainsMono-Regular.ttf", false)
	for f in [
		"ui-bg-chamber.png", "ui-card-frame.png", "ui-btn-primary.png", "ui-btn-ghost.png",
		"ui-btn-pass.png", "ui-hud-panel.png", "ui-board-panel.png", "ui-energy-bar.png",
		"ui-tile-empty.png", "ui-logo-badge.png", "faction-volt.png", "faction-prismatic.png",
		"faction-void.png",
	]:
		ui(f)
	for file in CARD_ART.values():
		card_file(str(file))


static func _load_font(path: String, prefer_title: bool) -> void:
	if not ResourceLoader.exists(path):
		return
	var ff := load(path) as FontFile
	if ff == null:
		return
	if prefer_title and _font_title == null:
		_font_title = ff
	elif path.find("Orbitron-Bold") >= 0 and _font_title == null:
		_font_title = ff
	elif path.find("JetBrainsMono-Bold") >= 0:
		_font_bold = ff
	elif path.find("JetBrainsMono-Regular") >= 0:
		_font_body = ff


static func title_font() -> Font:
	if _font_title:
		return _font_title
	return ThemeDB.fallback_font


static func body_font() -> Font:
	if _font_body:
		return _font_body
	if _font_bold:
		return _font_bold
	return ThemeDB.fallback_font


static func bold_font() -> Font:
	if _font_bold:
		return _font_bold
	return body_font()


static func tex(path: String) -> Texture2D:
	if _tex.has(path):
		return _tex[path]
	var t: Texture2D = null
	if ResourceLoader.exists(path):
		t = load(path) as Texture2D
	if t == null:
		t = _load_image_texture(path)
	_tex[path] = t
	return t


static func _load_image_texture(path: String) -> Texture2D:
	var global := ProjectSettings.globalize_path(path)
	if not FileAccess.file_exists(path) and not FileAccess.file_exists(global):
		return null
	var img := Image.new()
	var err := img.load(global)
	if err != OK:
		return null
	return ImageTexture.create_from_image(img)


static func ui(file: String) -> Texture2D:
	return tex("res://assets/ui/%s" % file)


static func card_file(file: String) -> Texture2D:
	return tex("res://assets/cards/%s" % file)


static func card_art(def_id: String) -> Texture2D:
	var file := str(CARD_ART.get(def_id, "pulse-reactor.png"))
	return card_file(file)


static func faction_tex(faction: String) -> Texture2D:
	match faction:
		"volt":
			return ui("faction-volt.png")
		"prismatic":
			return ui("faction-prismatic.png")
		"void":
			return ui("faction-void.png")
	return null


static func faction_accent(faction: String) -> Color:
	match faction:
		"volt":
			return COLOR_ENERGY
		"prismatic":
			return COLOR_CYAN
		"void":
			return COLOR_PURPLE
	return Color("9aa8c0")


static func owner_color(owner: String) -> Color:
	return COLOR_CYAN if owner == "player" else COLOR_ENEMY


static func nine_slice_style(tex: Texture2D, margin: int = 48) -> StyleBoxTexture:
	var sb := StyleBoxTexture.new()
	sb.texture = tex
	sb.texture_margin_left = margin
	sb.texture_margin_top = margin
	sb.texture_margin_right = margin
	sb.texture_margin_bottom = margin
	return sb
