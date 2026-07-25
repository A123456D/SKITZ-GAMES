class_name CosmeticItemDef
extends Resource
## Cosmetics identity reward (GDD §9.3) — Sparks / Prisms economy display.

enum Kind { TILE_SKIN, BOARD_FRAME, SHIFT_TRAIL, WIN_FANFARE, TOUCH_RIPPLE }

@export var id: StringName = &""
@export var display_name: String = ""
@export var kind: Kind = Kind.SHIFT_TRAIL
@export var blurb: String = ""
@export var owned: bool = false
@export var equipped: bool = false
@export var spark_cost: int = 0
@export var prism_cost: int = 0
@export var accent: Color = Color("2FE0C5")


func kind_label() -> String:
	match kind:
		Kind.TILE_SKIN:
			return "Tile skin"
		Kind.BOARD_FRAME:
			return "Frame"
		Kind.SHIFT_TRAIL:
			return "Trail"
		Kind.WIN_FANFARE:
			return "Fanfare"
		Kind.TOUCH_RIPPLE:
			return "Ripple"
	return ""
