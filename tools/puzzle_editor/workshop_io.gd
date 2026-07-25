class_name WorkshopIO
extends RefCounted
## Import / export workshop packages (.shiftr.json / .shiftrpz) and optional .tres.
## Compatible with PuzzleDef.to_dict / from_dict plus workshop envelope metadata.

static func export_document(doc: EditorDocument) -> Dictionary:
	assert(doc != null)
	doc.ensure_id()
	var puzzle := doc.to_puzzle_def()
	## Preview hash — stable fingerprint of start+goal for workshop listings.
	var preview := StateFingerprint.from_occupants(
		doc.width, doc.height, doc.occupants_packed(EditorDocument.Layer.START)
	)
	var goal_fp := StateFingerprint.from_occupants(
		doc.width, doc.height, doc.occupants_packed(EditorDocument.Layer.GOAL)
	)
	return {
		"format": WorkshopSchema.FORMAT,
		"schema_version": WorkshopSchema.SCHEMA_VERSION,
		"exported_at": Time.get_datetime_string_from_system(true, true),
		"workshop": {
			"title": doc.title,
			"author": doc.author,
			"tags": _tags_array(doc.tags),
			"seed": doc.seed_value,
			"difficulty": doc.difficulty,
			"preview_hash": "%s|%s" % [preview, goal_fp],
			"id": String(doc.puzzle_id),
		},
		"puzzle": puzzle.to_dict(),
	}


static func export_json(doc: EditorDocument, pretty: bool = true) -> String:
	var data := export_document(doc)
	return JSON.stringify(data, "\t" if pretty else "")


static func import_json(text: String) -> Dictionary:
	## Returns {ok, document?, error?, warnings?}
	var parsed: Variant = JSON.parse_string(text)
	if not (parsed is Dictionary):
		return {"ok": false, "error": "invalid_json"}
	return import_dict(parsed)


static func import_dict(data: Dictionary) -> Dictionary:
	var warnings: PackedStringArray = PackedStringArray()
	var format := str(data.get("format", ""))
	## Accept bare PuzzleDef dicts and catalog envelopes for convenience.
	if format == WorkshopSchema.FORMAT:
		var ver := int(data.get("schema_version", 0))
		if ver > WorkshopSchema.SCHEMA_VERSION:
			return {"ok": false, "error": "schema_too_new", "schema_version": ver}
		if ver < 1:
			return {"ok": false, "error": "schema_invalid"}
		if ver < WorkshopSchema.SCHEMA_VERSION:
			warnings.append("schema_migrated_%d_to_%d" % [ver, WorkshopSchema.SCHEMA_VERSION])
		var puzzle_data: Variant = data.get("puzzle", {})
		if not (puzzle_data is Dictionary):
			return {"ok": false, "error": "missing_puzzle"}
		var doc := _doc_from_puzzle_dict(puzzle_data)
		var ws: Variant = data.get("workshop", {})
		if ws is Dictionary:
			_apply_workshop_meta(doc, ws)
		return {"ok": true, "document": doc, "warnings": warnings}

	if format == "shiftr_puzzle_defs":
		var puzzles: Variant = data.get("puzzles", [])
		if puzzles is Array and not puzzles.is_empty() and puzzles[0] is Dictionary:
			var doc2 := _doc_from_puzzle_dict(puzzles[0])
			warnings.append("imported_first_of_catalog")
			return {"ok": true, "document": doc2, "warnings": warnings}
		return {"ok": false, "error": "empty_catalog"}

	## Bare PuzzleDef
	if data.has("goal_occupants") and data.has("start_occupants"):
		var doc3 := _doc_from_puzzle_dict(data)
		warnings.append("bare_puzzle_def")
		return {"ok": true, "document": doc3, "warnings": warnings}

	return {"ok": false, "error": "unknown_format"}


static func save_to_file(doc: EditorDocument, path: String) -> Error:
	var json := export_json(doc, true)
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return FileAccess.get_open_error()
	f.store_string(json)
	doc.mark_clean()
	return OK


static func load_from_file(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {"ok": false, "error": "file_missing"}
	var text := FileAccess.get_file_as_string(path)
	return import_json(text)


static func export_tres(doc: EditorDocument, path: String) -> Error:
	var puzzle := doc.to_puzzle_def()
	return ResourceSaver.save(puzzle, path)


static func import_tres(path: String) -> Dictionary:
	if not ResourceLoader.exists(path):
		return {"ok": false, "error": "resource_missing"}
	var res := load(path)
	if res is PuzzleDef:
		var doc := EditorDocument.new()
		doc.apply_puzzle_def(res)
		return {"ok": true, "document": doc, "warnings": PackedStringArray()}
	return {"ok": false, "error": "not_puzzle_def"}


static func roundtrip_ok(doc: EditorDocument) -> bool:
	var json := export_json(doc)
	var result := import_json(json)
	if not result.get("ok", false):
		return false
	var again: EditorDocument = result["document"]
	var a := export_document(doc)
	var b := export_document(again)
	## Compare puzzle payloads (ignore exported_at).
	return a["puzzle"] == b["puzzle"] and a["workshop"]["id"] == b["workshop"]["id"]


static func _doc_from_puzzle_dict(data: Dictionary) -> EditorDocument:
	var p := PuzzleDef.from_dict(data)
	var doc := EditorDocument.new(p.width, p.height)
	doc.apply_puzzle_def(p)
	return doc


static func _apply_workshop_meta(doc: EditorDocument, ws: Dictionary) -> void:
	if ws.has("title"):
		doc.title = str(ws["title"])
	if ws.has("author"):
		doc.author = str(ws["author"])
	if ws.has("seed"):
		doc.seed_value = int(ws["seed"])
	if ws.has("difficulty"):
		doc.difficulty = int(ws["difficulty"])
	if ws.has("id") and String(doc.puzzle_id).is_empty():
		doc.puzzle_id = StringName(str(ws["id"]))
	var t: Variant = ws.get("tags", [])
	if t is Array:
		doc.tags = PackedStringArray()
		for item in t:
			doc.tags.append(str(item))
	doc.meta_changed.emit()


static func _tags_array(tags: PackedStringArray) -> Array:
	var out: Array = []
	for t in tags:
		out.append(t)
	return out
