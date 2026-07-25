class_name NodePool
extends RefCounted
## Generic Node pool: acquire → use → release (parent removed, dormant).
## Prefer for tiles, one-shot particles, UI bursts — avoids per-burst instantiate spikes.

var _factory: Callable
var _free: Array[Node] = []
var _max_size: int = 64
var _created: int = 0


func _init(factory: Callable, max_size: int = 64) -> void:
	_factory = factory
	_max_size = maxi(1, max_size)


func size_free() -> int:
	return _free.size()


func size_created() -> int:
	return _created


func acquire() -> Node:
	while not _free.is_empty():
		var n: Node = _free.pop_back()
		if is_instance_valid(n):
			return n
	var made: Node = _factory.call() as Node
	if made:
		_created += 1
	return made


func release(node: Node) -> void:
	if node == null or not is_instance_valid(node):
		return
	var parent := node.get_parent()
	if parent:
		parent.remove_child(node)
	if node is CanvasItem:
		(node as CanvasItem).visible = false
	if _free.size() >= _max_size:
		node.queue_free()
		return
	_free.append(node)


func clear(free_nodes: bool = true) -> void:
	if free_nodes:
		for n in _free:
			if is_instance_valid(n):
				n.queue_free()
	_free.clear()
	_created = 0


func warm(count: int) -> void:
	var n := mini(count, _max_size) - _free.size()
	for _i in range(maxi(0, n)):
		var made: Node = _factory.call() as Node
		if made == null:
			break
		_created += 1
		_free.append(made)
