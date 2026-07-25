extends SceneTree
## Headless entry: godot --headless -s res://tests/unit/puzzle_gen/run_puzzle_gen_validation.gd

func _initialize() -> void:
	var validator := PuzzleGenValidation.new()
	var failed := validator.run_all()
	quit(1 if failed > 0 else 0)
