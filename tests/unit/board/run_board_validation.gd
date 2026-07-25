extends SceneTree
## Headless entry: godot --headless -s res://tests/unit/board/run_board_validation.gd

func _initialize() -> void:
	var validator := BoardSystemValidation.new()
	var failed := validator.run_all()
	quit(1 if failed > 0 else 0)
