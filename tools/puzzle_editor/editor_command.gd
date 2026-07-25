class_name EditorCommand
extends RefCounted
## Base mutation for the editor undo stack.
##
## WHY command pattern (not BoardSession history): paint/fill/resize/meta edits
## are not BoardCommands. Storing inverse patches keeps undo O(changed cells)
## without cloning the whole document each stroke.

var label: StringName = &""


func execute(_doc: EditorDocument) -> void:
	pass


func undo(_doc: EditorDocument) -> void:
	pass


func redo(doc: EditorDocument) -> void:
	execute(doc)
