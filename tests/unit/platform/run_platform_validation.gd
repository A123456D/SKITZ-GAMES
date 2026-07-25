extends SceneTree
## Headless entry: godot --headless -s res://tests/unit/platform/run_platform_validation.gd

func _initialize() -> void:
	var validator := PlatformServicesValidation.new()
	var failed := validator.run_all()
	quit(1 if failed > 0 else 0)
