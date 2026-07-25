class_name EditorHistory
extends RefCounted
## Undo/redo stack for EditorCommand. Mirrors MoveHistory philosophy (invertible
## ops + bounded capacity) but stores document-level commands.

signal changed

const DEFAULT_CAPACITY := 256

var capacity: int = DEFAULT_CAPACITY
var _undo: Array[EditorCommand] = []
var _redo: Array[EditorCommand] = []


func setup(p_capacity: int = DEFAULT_CAPACITY) -> void:
	capacity = maxi(8, p_capacity)
	clear()


func clear() -> void:
	_undo.clear()
	_redo.clear()
	changed.emit()


func can_undo() -> bool:
	return not _undo.is_empty()


func can_redo() -> bool:
	return not _redo.is_empty()


func push(cmd: EditorCommand, doc: EditorDocument) -> void:
	assert(cmd != null and doc != null)
	cmd.execute(doc)
	_undo.append(cmd)
	while _undo.size() > capacity:
		_undo.pop_front()
	_redo.clear()
	changed.emit()


func undo(doc: EditorDocument) -> bool:
	if not can_undo():
		return false
	var cmd: EditorCommand = _undo.pop_back()
	cmd.undo(doc)
	_redo.append(cmd)
	changed.emit()
	return true


func redo(doc: EditorDocument) -> bool:
	if not can_redo():
		return false
	var cmd: EditorCommand = _redo.pop_back()
	cmd.redo(doc)
	_undo.append(cmd)
	changed.emit()
	return true
