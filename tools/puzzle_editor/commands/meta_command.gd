class_name MetaCommand
extends EditorCommand
## Undoable metadata patch (title, author, difficulty, budgets, tags).

var before: Dictionary = {}
var after: Dictionary = {}


func _init() -> void:
	label = &"meta"


static func capture(doc: EditorDocument, updates: Dictionary) -> MetaCommand:
	var cmd := MetaCommand.new()
	cmd.before = _snapshot(doc)
	cmd.after = cmd.before.duplicate(true)
	for k in updates.keys():
		cmd.after[k] = updates[k]
	return cmd


func execute(doc: EditorDocument) -> void:
	_apply(doc, after)


func undo(doc: EditorDocument) -> void:
	_apply(doc, before)


static func _snapshot(doc: EditorDocument) -> Dictionary:
	var tag_arr: Array = []
	for t in doc.tags:
		tag_arr.append(t)
	return {
		"title": doc.title,
		"author": doc.author,
		"puzzle_id": String(doc.puzzle_id),
		"mode": String(doc.mode),
		"seed_value": doc.seed_value,
		"difficulty": doc.difficulty,
		"tags": tag_arr,
		"pattern_id": String(doc.pattern_id),
		"pattern_tier": doc.pattern_tier,
		"move_budget": doc.move_budget,
		"par_soft": doc.par_soft,
		"par_hard": doc.par_hard,
	}


func _apply(doc: EditorDocument, data: Dictionary) -> void:
	doc.title = str(data.get("title", doc.title))
	doc.author = str(data.get("author", doc.author))
	doc.puzzle_id = StringName(str(data.get("puzzle_id", doc.puzzle_id)))
	doc.mode = StringName(str(data.get("mode", doc.mode)))
	doc.seed_value = int(data.get("seed_value", doc.seed_value))
	doc.difficulty = int(data.get("difficulty", doc.difficulty))
	doc.tags = PackedStringArray()
	var t: Variant = data.get("tags", [])
	if t is Array:
		for item in t:
			doc.tags.append(str(item))
	doc.pattern_id = StringName(str(data.get("pattern_id", doc.pattern_id)))
	doc.pattern_tier = int(data.get("pattern_tier", doc.pattern_tier))
	doc.move_budget = int(data.get("move_budget", doc.move_budget))
	doc.par_soft = int(data.get("par_soft", doc.par_soft))
	doc.par_hard = int(data.get("par_hard", doc.par_hard))
	doc.dirty = true
	doc.meta_changed.emit()
	doc.changed.emit()
