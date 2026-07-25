class_name BoardSerializer
extends RefCounted
## Versioned Dictionary / JSON serialization for save, load, and MP state sync.

const FORMAT_ID := "shiftr_board"


static func to_dict(state: BoardState, history: MoveHistory = null, meta: Dictionary = {}) -> Dictionary:
	var d := {
		"format": FORMAT_ID,
		"schema_version": BoardEnums.SCHEMA_VERSION,
		"state": state.to_dict(),
		"meta": meta.duplicate(true),
	}
	if history != null:
		d["history"] = history.to_dict()
	return d


static func from_dict(data: Dictionary) -> Dictionary:
	## Returns { "ok": bool, "error": String, "state": BoardState, "history": MoveHistory, "meta": Dictionary }
	var result := {
		"ok": false,
		"error": "",
		"state": null,
		"history": null,
		"meta": {},
	}
	if data.get("format", "") != FORMAT_ID:
		result["error"] = "bad_format"
		return result
	var ver := int(data.get("schema_version", -1))
	if ver != BoardEnums.SCHEMA_VERSION:
		# Future: run migrations. For v1, hard fail on mismatch.
		result["error"] = "unsupported_schema_version"
		return result
	if not data.has("state") or not (data["state"] is Dictionary):
		result["error"] = "missing_state"
		return result
	result["state"] = BoardState.from_dict(data["state"])
	if data.has("history") and data["history"] is Dictionary:
		var hist := MoveHistory.new()
		hist.load_dict(data["history"])
		result["history"] = hist
	var meta: Variant = data.get("meta", {})
	result["meta"] = meta.duplicate(true) if meta is Dictionary else {}
	result["ok"] = true
	return result


static func to_json(state: BoardState, history: MoveHistory = null, meta: Dictionary = {}, pretty: bool = false) -> String:
	var d := to_dict(state, history, meta)
	return JSON.stringify(d, "\t" if pretty else "")


static func from_json(json_text: String) -> Dictionary:
	var parsed: Variant = JSON.parse_string(json_text)
	if parsed == null or not (parsed is Dictionary):
		return {"ok": false, "error": "json_parse_failed", "state": null, "history": null, "meta": {}}
	return from_dict(parsed)


static func save_to_file(path: String, state: BoardState, history: MoveHistory = null, meta: Dictionary = {}) -> Error:
	var json := to_json(state, history, meta, false)
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return FileAccess.get_open_error()
	f.store_string(json)
	return OK


static func load_from_file(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {"ok": false, "error": "file_missing", "state": null, "history": null, "meta": {}}
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {"ok": false, "error": "file_open_failed", "state": null, "history": null, "meta": {}}
	return from_json(f.get_as_text())
