class_name ChapterDef
extends Resource

@export var id: StringName = &""
@export var title: String = ""
@export var subtitle: String = ""
@export_range(0.0, 1.0, 0.01) var progress: float = 0.0
@export var stars_earned: int = 0
@export var stars_total: int = 45
@export var unlocked: bool = true
@export var levels: Array[LevelEntryDef] = []
