class_name AsyncLoader
extends RefCounted
## Threaded ResourceLoader helpers. Use for screens / puzzles / audio stems â€”
## never block the main thread on button press for large PackedScenes.

signal progress(path: String, fraction: float)
signal completed(path: String, resource: Resource)
signal failed(path: String, error: Error)

var _pending: Dictionary = {} ## path -> true


func request(path: String, type_hint: String = "") -> Error:
	if path.is_empty():
		return ERR_INVALID_PARAMETER
	if ResourceLoader.has_cached(path):
		return OK
	if _pending.has(path):
		return OK
	var err := ResourceLoader.load_threaded_request(path, type_hint, false)
	if err == OK:
		_pending[path] = true
	return err


func is_ready(path: String) -> bool:
	if ResourceLoader.has_cached(path):
		return true
	var status := ResourceLoader.load_threaded_get_status(path)
	return status == ResourceLoader.THREAD_LOAD_LOADED


func poll(path: String) -> Resource:
	if ResourceLoader.has_cached(path):
		_pending.erase(path)
		return ResourceLoader.load(path)
	var progress_arr: Array = []
	var status := ResourceLoader.load_threaded_get_status(path, progress_arr)
	if progress_arr.size() > 0:
		progress.emit(path, float(progress_arr[0]))
	match status:
		ResourceLoader.THREAD_LOAD_LOADED:
			_pending.erase(path)
			var res := ResourceLoader.load_threaded_get(path)
			completed.emit(path, res)
			return res
		ResourceLoader.THREAD_LOAD_FAILED, ResourceLoader.THREAD_LOAD_INVALID_RESOURCE:
			_pending.erase(path)
			failed.emit(path, FAILED)
			return null
		_:
			return null


## Await until loaded (or failed). Safe from async UI flows.
func await_path(host: Node, path: String, type_hint: String = "") -> Resource:
	if path.is_empty():
		return null
	if ResourceLoader.has_cached(path):
		return ResourceLoader.load(path)
	request(path, type_hint)
	while true:
		var res := poll(path)
		if res != null:
			return res
		var status := ResourceLoader.load_threaded_get_status(path)
		if status == ResourceLoader.THREAD_LOAD_FAILED or status == ResourceLoader.THREAD_LOAD_INVALID_RESOURCE:
			return null
		if host == null or not is_instance_valid(host):
			return null
		await host.get_tree().process_frame
	return null


static func load_sync_cached(path: String) -> Resource:
	if path.is_empty() or not ResourceLoader.exists(path):
		return null
	return ResourceLoader.load(path)
