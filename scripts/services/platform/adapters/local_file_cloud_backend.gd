class_name LocalFileCloudBackend
extends RefCounted
## File-based stand-in for cloud saves. Works today without Steam/Play/GC SDKs.
## Path: user://cloud/<slot>.bin + .meta.json â€” used by Null/Web until real cloud is wired.

const ROOT := "user://cloud/"



func _checksum_md5(data: PackedByteArray) -> String:
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_MD5)
	ctx.update(data)
	return ctx.finish().hex_encode()

func upload(slot: String, payload: PackedByteArray, meta: Dictionary) -> Error:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(ROOT))
	var path := ROOT + _safe(slot) + ".bin"
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return FileAccess.get_open_error()
	f.store_buffer(payload)
	var meta_path := ROOT + _safe(slot) + ".meta.json"
	var m := meta.duplicate(true)
	m["updated_unix"] = int(Time.get_unix_time_from_system())
	m["checksum"] = _checksum_md5(payload)
	m["byte_len"] = payload.size()
	var mf := FileAccess.open(meta_path, FileAccess.WRITE)
	if mf == null:
		return FileAccess.get_open_error()
	mf.store_string(JSON.stringify(m))
	return OK


func download(slot: String) -> Dictionary:
	var path := ROOT + _safe(slot) + ".bin"
	var meta_path := ROOT + _safe(slot) + ".meta.json"
	if not FileAccess.file_exists(path):
		return {"ok": false, "payload": PackedByteArray(), "meta": {}, "error": "missing"}
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {"ok": false, "payload": PackedByteArray(), "meta": {}, "error": "open_failed"}
	var payload := f.get_buffer(f.get_length())
	var meta := {}
	if FileAccess.file_exists(meta_path):
		var mf := FileAccess.open(meta_path, FileAccess.READ)
		if mf:
			var parsed: Variant = JSON.parse_string(mf.get_as_text())
			if parsed is Dictionary:
				meta = parsed
	return {"ok": true, "payload": payload, "meta": meta, "error": ""}


func _safe(slot: String) -> String:
	return slot.replace("/", "_").replace("\\", "_").replace("..", "_")
