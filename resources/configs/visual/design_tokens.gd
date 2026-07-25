class_name DesignTokens
extends Resource
## SHIFTR visual design tokens — neon cyberpunk glass.
## Purple primary · blue secondary · cyan accent. Dark void, emissive objects.

@export_group("Surfaces")
@export var bg_deep: Color = Color("07060F")
@export var bg_elevated: Color = Color("12101C")
@export var bg_play: Color = Color("0B0A14")
@export var bg_grid_line: Color = Color(0.55, 0.35, 0.95, 0.10)
@export var surface_glass: Color = Color(0.16, 0.12, 0.28, 0.52)
@export var surface_glass_border: Color = Color(0.72, 0.48, 1.0, 0.28)
@export var surface_steel: Color = Color("1A1528")

@export_group("Ink")
@export var ink_primary: Color = Color("F2EEFF")
@export var ink_secondary: Color = Color(0.78, 0.72, 0.92, 0.88)
@export var ink_muted: Color = Color(0.58, 0.52, 0.72, 0.70)
@export var ink_on_accent: Color = Color("0A0614")

@export_group("Accents")
@export var accent_signal: Color = Color("A855F7")
@export var accent_signal_dim: Color = Color(0.66, 0.33, 0.97, 0.38)
@export var accent_beam: Color = Color("22D3EE")
@export var accent_steel: Color = Color("7C8DB5")
@export var accent_warn: Color = Color("FF5C7A")
@export var accent_focus: Color = Color("67E8F9")
@export var accent_secondary: Color = Color("3B82F6")
@export var accent_star: Color = Color("FBBF24")

@export_group("Object glow (puzzle)")
@export var object_red: Color = Color("FF3B5C")
@export var object_blue: Color = Color("3B82F6")
@export var object_green: Color = Color("34D399")
@export var object_yellow: Color = Color("FBBF24")
@export var object_purple: Color = Color("C084FC")
@export var object_white: Color = Color("F8FAFC")
@export var object_cyan: Color = Color("22D3EE")
@export var tile_empty: Color = Color(0.10, 0.09, 0.16, 0.92)
@export var shift_band: Color = Color(0.66, 0.33, 0.97, 0.22)

@export_group("Glow")
@export_range(0.0, 2.0, 0.01) var glow_idle: float = 0.42
@export_range(0.0, 2.0, 0.01) var glow_press: float = 0.95
@export_range(0.0, 2.0, 0.01) var glow_confirm: float = 1.2
@export_range(0.0, 2.0, 0.01) var bloom_strength_ref: float = 0.62
@export var glow_tint: Color = Color(0.66, 0.33, 0.97, 1.0)

@export_group("Spacing")
@export_range(2, 48, 1) var space_xs: int = 4
@export_range(2, 48, 1) var space_sm: int = 8
@export_range(2, 64, 1) var space_md: int = 16
@export_range(2, 96, 1) var space_lg: int = 24
@export_range(2, 128, 1) var space_xl: int = 40
@export_range(40, 120, 1) var touch_min: int = 48

@export_group("Radii")
@export_range(0, 32, 1) var radius_sm: int = 12
@export_range(0, 40, 1) var radius_md: int = 16
@export_range(0, 48, 1) var radius_lg: int = 22
@export_range(0, 64, 1) var radius_pill: int = 28

@export_group("Motion")
@export_range(0.02, 0.4, 0.001) var duration_press: float = 0.08
@export_range(0.05, 0.6, 0.001) var duration_focus: float = 0.14
@export_range(0.1, 1.0, 0.001) var duration_panel: float = 0.22
@export_range(0.15, 1.2, 0.001) var duration_transition: float = 0.32
@export_range(0.4, 8.0, 0.05) var duration_bg_drift: float = 2.8
@export_range(0.8, 20.0, 0.1) var duration_icon_idle: float = 3.6
@export_range(0.9, 1.0, 0.001) var press_scale: float = 0.96
@export_range(1.0, 1.08, 0.001) var focus_scale: float = 1.02

@export_group("Background")
@export var gradient_a: Color = Color("05040C")
@export var gradient_b: Color = Color("140E28")
@export var gradient_c: Color = Color("0A1224")
@export var beam_color: Color = Color(0.66, 0.33, 0.97, 0.14)
@export_range(8.0, 96.0, 1.0) var grid_cell_px: float = 48.0
@export_range(0.0, 1.0, 0.01) var grid_opacity: float = 0.11
@export_range(0.0, 40.0, 0.5) var parallax_px: float = 12.0

@export_group("Typography sizes")
@export_range(10, 28, 1) var font_caption: int = 13
@export_range(12, 36, 1) var font_body: int = 15
@export_range(16, 48, 1) var font_title: int = 22
@export_range(24, 72, 1) var font_display: int = 36


func make_glass_style(pressed: bool = false, focused: bool = false) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = surface_glass
	if pressed:
		sb.bg_color = Color(
			surface_glass.r * 0.82 + accent_signal.r * 0.18,
			surface_glass.g * 0.82 + accent_signal.g * 0.18,
			surface_glass.b * 0.82 + accent_signal.b * 0.18,
			minf(surface_glass.a + 0.14, 0.88)
		)
	sb.border_color = accent_focus if focused else surface_glass_border
	sb.set_border_width_all(1 if not focused else 2)
	sb.set_corner_radius_all(radius_md)
	sb.content_margin_left = float(space_md)
	sb.content_margin_right = float(space_md)
	sb.content_margin_top = float(space_sm + 2)
	sb.content_margin_bottom = float(space_sm + 2)
	sb.shadow_color = Color(accent_signal.r, accent_signal.g, accent_signal.b, 0.18)
	sb.shadow_size = 8 if not pressed else 3
	sb.shadow_offset = Vector2(0, 3 if not pressed else 1)
	return sb


func make_panel_style() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(bg_elevated.r, bg_elevated.g, bg_elevated.b, 0.86)
	sb.border_color = surface_glass_border
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(radius_lg)
	sb.content_margin_left = float(space_lg)
	sb.content_margin_right = float(space_lg)
	sb.content_margin_top = float(space_md)
	sb.content_margin_bottom = float(space_md)
	sb.shadow_color = Color(0.35, 0.15, 0.55, 0.35)
	sb.shadow_size = 14
	sb.shadow_offset = Vector2(0, 6)
	return sb


func make_ghost_style() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(1, 1, 1, 0.0)
	sb.border_color = Color(surface_glass_border.r, surface_glass_border.g, surface_glass_border.b, 0.0)
	sb.set_border_width_all(0)
	sb.set_corner_radius_all(radius_md)
	sb.content_margin_left = float(space_sm)
	sb.content_margin_right = float(space_sm)
	sb.content_margin_top = float(space_sm)
	sb.content_margin_bottom = float(space_sm)
	return sb


func make_tile_style() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = tile_empty
	sb.border_color = Color(surface_glass_border.r, surface_glass_border.g, surface_glass_border.b, 0.35)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(radius_sm)
	sb.shadow_color = Color(0, 0, 0, 0.35)
	sb.shadow_size = 5
	sb.shadow_offset = Vector2(0, 2)
	return sb
