class_name RefCountedPool
extends RefCounted
## Pool for RefCounted objects (dicts wrappers, temp buffers, recipe contexts).
## Call release() so hot paths reuse instead of allocating every frame.

var _factory: Callable
var _reset: Callable
var _free: Array = []
var _max_size: int = 128


func _init(factory: Callable, reset: Callable = Callable(), max_size: int = 128) -> void:
	_factory = factory
	_reset = reset
	_max_size = maxi(1, max_size)


func acquire() -> Variant:
	if not _free.is_empty():
		return _free.pop_back()
	return _factory.call()


func release(obj: Variant) -> void:
	if obj == null:
		return
	if _reset.is_valid():
		_reset.call(obj)
	if _free.size() >= _max_size:
		return
	_free.append(obj)


func clear() -> void:
	_free.clear()
