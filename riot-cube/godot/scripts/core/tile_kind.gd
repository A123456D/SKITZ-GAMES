class_name TileKind
extends Object

const SKULL := "skull"
const HEART := "heart"
const BOLT := "bolt"
const STAR := "star"
const FLAME := "flame"
const DIAMOND := "diamond"

const ALL: PackedStringArray = [
	SKULL,
	HEART,
	BOLT,
	STAR,
	FLAME,
	DIAMOND,
]

static func colors(kind: String) -> Dictionary:
	match kind:
		SKULL:
			return {"fill": Color("#1a1a1a"), "ink": Color("#f5f5f5"), "accent": Color("#ff2d6a")}
		HEART:
			return {"fill": Color("#ff2d6a"), "ink": Color("#1a1a1a"), "accent": Color("#ffffff")}
		BOLT:
			return {"fill": Color("#c8ff3d"), "ink": Color("#1a1a1a"), "accent": Color("#ffffff")}
		STAR:
			return {"fill": Color("#ffd60a"), "ink": Color("#1a1a1a"), "accent": Color("#ffffff")}
		FLAME:
			return {"fill": Color("#ff6b1a"), "ink": Color("#1a1a1a"), "accent": Color("#ffe566")}
		DIAMOND:
			return {"fill": Color("#3d9bff"), "ink": Color("#0a1628"), "accent": Color("#ffffff")}
		_:
			return {"fill": Color.GRAY, "ink": Color.WHITE, "accent": Color.WHITE}
