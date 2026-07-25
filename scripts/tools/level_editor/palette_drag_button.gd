class_name PaletteDragButton
extends Button
## Palette entry that supports Godot drag → EditorBoardView drop.

var payload: Dictionary = {}
var preview_text: String = ""


func configure_drag(p_payload: Dictionary, p_preview: String) -> void:
	payload = p_payload.duplicate(true)
	preview_text = p_preview


func _get_drag_data(_at_position: Vector2) -> Variant:
	if payload.is_empty():
		return null
	var preview := Label.new()
	preview.text = preview_text if preview_text != "" else str(payload.get("id", "?"))
	set_drag_preview(preview)
	return payload.duplicate(true)
