extends SceneTree
## Bake procedural ObjectIconAtlas icons to assets/textures/atlas/objects/
## Usage: godot --headless -s res://tools/developer/bake_object_icons.gd

const AtlasScript := preload("res://scripts/presentation/board/object_icon_atlas.gd")

func _initialize() -> void:
	var out := ProjectSettings.globalize_path("res://assets/textures/atlas/objects")
	DirAccess.make_dir_recursive_absolute(out)
	AtlasScript.clear_cache()
	var n: int = AtlasScript.bake_pngs(out)
	print("bake_object_icons: wrote %d PNGs → %s" % [n, out])
	quit(0 if n > 0 else 1)
