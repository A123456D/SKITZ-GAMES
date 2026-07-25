class_name WorldSkin
extends RefCounted
## Selectable world palette overlays on DesignTokens.
## Neon Grid is the concept default; Crystal / Nature / Void are stubs for worlds carousel.

enum Id {
	NEON_GRID = 0,
	CRYSTAL = 1,
	NATURE = 2,
	VOID = 3,
}


static func id_from_key(key: StringName) -> Id:
	match String(key):
		"crystal":
			return Id.CRYSTAL
		"nature":
			return Id.NATURE
		"void":
			return Id.VOID
		_:
			return Id.NEON_GRID


static func key_for(id: Id) -> StringName:
	match id:
		Id.CRYSTAL:
			return &"crystal"
		Id.NATURE:
			return &"nature"
		Id.VOID:
			return &"void"
		_:
			return &"neon_grid"


static func display_name(id: Id) -> String:
	match id:
		Id.CRYSTAL:
			return "Crystal Caves"
		Id.NATURE:
			return "Nature's Core"
		Id.VOID:
			return "Void"
		_:
			return "Neon Grid"


static func tagline(id: Id) -> String:
	match id:
		Id.CRYSTAL:
			return "Ice-blue lattices · sharp refract"
		Id.NATURE:
			return "Living emerald · soft bloom"
		Id.VOID:
			return "Deep violet · sparse stars"
		_:
			return "Purple neon · concept default"


## Mutates a tokens duplicate in place with world-specific accents / gradients.
static func apply_to_tokens(tokens: DesignTokens, id: Id) -> void:
	if tokens == null:
		return
	match id:
		Id.CRYSTAL:
			tokens.bg_deep = Color("060A12")
			tokens.bg_elevated = Color("101828")
			tokens.bg_play = Color("081018")
			tokens.accent_signal = Color("7DD3FC")
			tokens.accent_beam = Color("E0F2FE")
			tokens.accent_secondary = Color("38BDF8")
			tokens.glow_tint = Color(0.45, 0.75, 1.0, 1.0)
			tokens.gradient_a = Color("040810")
			tokens.gradient_b = Color("0C1A2E")
			tokens.gradient_c = Color("0A1628")
			tokens.beam_color = Color(0.45, 0.8, 1.0, 0.16)
			tokens.shift_band = Color(0.45, 0.75, 1.0, 0.22)
			tokens.surface_glass_border = Color(0.55, 0.85, 1.0, 0.3)
		Id.NATURE:
			tokens.bg_deep = Color("06100A")
			tokens.bg_elevated = Color("0E1C14")
			tokens.bg_play = Color("08140E")
			tokens.accent_signal = Color("34D399")
			tokens.accent_beam = Color("A7F3D0")
			tokens.accent_secondary = Color("10B981")
			tokens.glow_tint = Color(0.25, 0.9, 0.55, 1.0)
			tokens.gradient_a = Color("040C08")
			tokens.gradient_b = Color("0C2214")
			tokens.gradient_c = Color("0A1A12")
			tokens.beam_color = Color(0.25, 0.85, 0.5, 0.14)
			tokens.shift_band = Color(0.25, 0.85, 0.5, 0.22)
			tokens.surface_glass_border = Color(0.4, 0.9, 0.6, 0.28)
		Id.VOID:
			tokens.bg_deep = Color("050508")
			tokens.bg_elevated = Color("121018")
			tokens.bg_play = Color("08070C")
			tokens.accent_signal = Color("C084FC")
			tokens.accent_beam = Color("F0ABFC")
			tokens.accent_secondary = Color("A855F7")
			tokens.glow_tint = Color(0.75, 0.4, 1.0, 1.0)
			tokens.gradient_a = Color("030208")
			tokens.gradient_b = Color("180A28")
			tokens.gradient_c = Color("0C0618")
			tokens.beam_color = Color(0.75, 0.35, 1.0, 0.12)
			tokens.shift_band = Color(0.7, 0.35, 0.95, 0.2)
			tokens.surface_glass_border = Color(0.75, 0.45, 1.0, 0.26)
		_:
			## Neon Grid — leave base concept tokens as authored.
			pass


static func next_id(current: Id) -> Id:
	return ((int(current) + 1) % 4) as Id
