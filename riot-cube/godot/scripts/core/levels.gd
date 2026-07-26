class_name RiotLevels
extends Object


static func level_1() -> Dictionary:
	var board: Array = [
		[TileKind.SKULL, TileKind.HEART, TileKind.BOLT, TileKind.STAR, TileKind.FLAME, TileKind.DIAMOND],
		[TileKind.HEART, TileKind.SKULL, TileKind.STAR, TileKind.BOLT, TileKind.DIAMOND, TileKind.FLAME],
		[TileKind.BOLT, TileKind.STAR, TileKind.HEART, TileKind.FLAME, TileKind.SKULL, TileKind.DIAMOND],
		[TileKind.STAR, TileKind.FLAME, TileKind.DIAMOND, TileKind.SKULL, TileKind.HEART, TileKind.BOLT],
		[TileKind.FLAME, TileKind.DIAMOND, TileKind.SKULL, TileKind.HEART, TileKind.BOLT, TileKind.STAR],
		[TileKind.DIAMOND, TileKind.BOLT, TileKind.FLAME, TileKind.STAR, TileKind.SKULL, TileKind.HEART],
	]
	return {
		"id": "level-1",
		"title": "LEVEL 1",
		"size": 6,
		"moves": 24,
		"goals": [
			{"kind": TileKind.HEART, "need": 12},
			{"kind": TileKind.SKULL, "need": 8},
			{"kind": TileKind.BOLT, "need": 8},
		],
		"board": board,
		"star_scores": [400, 800, 1400],
	}
