extends SceneTree
## Headless entry: godot --headless -s res://tests/unit/puzzle/run_puzzle_validation.gd

func _initialize() -> void:
	var validator := PuzzleEngineValidation.new()
	var failed := validator.run_all()
	quit(1 if failed > 0 else 0)
