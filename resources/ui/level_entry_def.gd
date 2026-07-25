class_name LevelEntryDef
extends Resource

@export var id: StringName = &""
@export var index: int = 1
@export var display_name: String = ""
@export_range(0, 3, 1) var stars: int = 0
@export var locked: bool = false
@export var par_soft: int = 8
@export var par_hard: int = 5
## When >= 0, level content can be rebuilt via PuzzleGenerator.generate(gen_seed, difficulty).
## Authored campaign levels keep gen_seed = -1 and use CampaignLevelCatalog.
@export var gen_seed: int = -1
@export_range(1, 10, 1) var difficulty: int = 1
## Short teach label for Level Select (Swipe / Beam / Mirror / …).
@export var teach_tag: String = ""
@export var blurb: String = ""
