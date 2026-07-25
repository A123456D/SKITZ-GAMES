extends SceneTree
## Headless / editor helper: bake white + soft-glow PNGs into assets/textures/atlas/.
## Run: godot --headless --path . -s res://tools/developer/pack_shared_atlas.gd
## If Godot is unavailable, SharedAtlas generates equivalent ImageTextures at runtime.

const OUT_DIR := "res://assets/textures/atlas/"


func _init() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT_DIR))
	_write_white()
	_write_glow()
	print("pack_shared_atlas: wrote white_pixel.png + soft_glow.png under ", OUT_DIR)
	quit()


func _write_white() -> void:
	var img := Image.create(4, 4, false, Image.FORMAT_RGBA8)
	img.fill(Color.WHITE)
	img.save_png(ProjectSettings.globalize_path(OUT_DIR + "white_pixel.png"))


func _write_glow() -> void:
	var size := 32
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var mid := float(size - 1) * 0.5
	for y in size:
		for x in size:
			var dx := (float(x) - mid) / mid
			var dy := (float(y) - mid) / mid
			var d := sqrt(dx * dx + dy * dy)
			var a := clampf(1.0 - d, 0.0, 1.0)
			a *= a
			img.set_pixel(x, y, Color(1, 1, 1, a))
	img.save_png(ProjectSettings.globalize_path(OUT_DIR + "soft_glow.png"))
