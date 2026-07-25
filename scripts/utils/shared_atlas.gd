class_name SharedAtlas
extends Object
## Runtime shared textures for batching-friendly white/glow pixels.
## Prefer one ImageTexture across particles & soft glows to cut canvas break-batches.
## Art pipeline: see tools/developer/pack_shared_atlas.gd + docs/PERFORMANCE.md.

const _ShaderFx := preload("res://scripts/utils/shader_fx.gd")
const WHITE_SIZE := 4
const GLOW_SIZE := 32

static var _white: Texture2D
static var _glow: Texture2D
static var _tile_blur_mat: ShaderMaterial


static func white_texture() -> Texture2D:
	if _white != null:
		return _white
	var disk := "res://assets/textures/atlas/white_pixel.png"
	if ResourceLoader.exists(disk):
		_white = load(disk) as Texture2D
		if _white:
			return _white
	var img := Image.create(WHITE_SIZE, WHITE_SIZE, false, Image.FORMAT_RGBA8)
	img.fill(Color.WHITE)
	_white = ImageTexture.create_from_image(img)
	return _white


static func soft_glow_texture() -> Texture2D:
	if _glow != null:
		return _glow
	var disk := "res://assets/textures/atlas/soft_glow.png"
	if ResourceLoader.exists(disk):
		_glow = load(disk) as Texture2D
		if _glow:
			return _glow
	var img := Image.create(GLOW_SIZE, GLOW_SIZE, false, Image.FORMAT_RGBA8)
	var mid := float(GLOW_SIZE - 1) * 0.5
	for y in GLOW_SIZE:
		for x in GLOW_SIZE:
			var dx := (float(x) - mid) / mid
			var dy := (float(y) - mid) / mid
			var d := sqrt(dx * dx + dy * dy)
			var a := clampf(1.0 - d, 0.0, 1.0)
			a = a * a
			img.set_pixel(x, y, Color(1, 1, 1, a))
	_glow = ImageTexture.create_from_image(img)
	return _glow


## One shared motion-blur material; blur_dir / blur_amount are instance uniforms.
static func tile_blur_material() -> ShaderMaterial:
	if _tile_blur_mat != null:
		return _tile_blur_mat
	_tile_blur_mat = _ShaderFx.load_material(
		"res://assets/shaders/materials/tile_motion_blur.tres",
		"res://assets/shaders/source/tile_motion_blur.gdshader"
	) as ShaderMaterial
	return _tile_blur_mat


static func make_particle_material(color: Color, speed_min: float, speed_max: float) -> ParticleProcessMaterial:
	var mat := ParticleProcessMaterial.new()
	mat.particle_flag_disable_z = true
	mat.direction = Vector3(0, -1, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = speed_min
	mat.initial_velocity_max = speed_max
	mat.gravity = Vector3(0, 180, 0)
	mat.scale_min = 1.5
	mat.scale_max = 3.0
	mat.color = color
	return mat
