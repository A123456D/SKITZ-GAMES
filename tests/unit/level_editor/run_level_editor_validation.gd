extends SceneTree
## Headless entry: godot --headless -s res://tests/unit/level_editor/run_level_editor_validation.gd

func _initialize() -> void:
	var validator := LevelEditorValidation.new()
	var failed := validator.run_all()
	quit(1 if failed > 0 else 0)
