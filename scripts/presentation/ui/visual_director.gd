class_name VisualDirector
extends Node
## Applies DesignTokens + VisualQuality to a scene: theme, background, bloom, particles.
## Compose under any root; does not touch board sim / feel logic.

const _ShaderFx := preload("res://scripts/utils/shader_fx.gd")

signal quality_changed(quality: VisualQualityConfig)
signal tokens_changed(tokens: DesignTokens)

@export var tokens: DesignTokens
@export var quality: VisualQualityConfig
## Optional ShiftFeelConfig to sync reduce_motion.
@export var feel_config: ShiftFeelConfig

@onready var _bg_layer: CanvasLayer = get_node_or_null("BackgroundLayer") as CanvasLayer
@onready var _bloom_layer: CanvasLayer = get_node_or_null("BloomLayer") as CanvasLayer
@onready var _ambient_host: Node2D = get_node_or_null("AmbientHost") as Node2D

var _theme: Theme
var _bg: AnimatedShiftBackground
var _bloom_rect: ColorRect
var _bloom_mat: ShaderMaterial
var _bloom_copy: BackBufferCopy
var _ambient: GPUParticles2D
var _applied_root: Node
var _confirm_pool: NodePool
var _confirm_scene: PackedScene


func _ready() -> void:
	if tokens == null:
		tokens = _load_tokens()
	if quality == null:
		quality = _load_quality_high()
	_confirm_pool = NodePool.new(_make_confirm_burst, 8)
	_sync_reduce_motion()
	_ensure_layers()
	_apply_all()


func configure(p_tokens: DesignTokens, p_quality: VisualQualityConfig, p_feel: ShiftFeelConfig = null) -> void:
	tokens = p_tokens
	quality = p_quality
	if p_feel:
		feel_config = p_feel
	_sync_reduce_motion()
	_ensure_layers()
	_apply_all()
	tokens_changed.emit(tokens)
	quality_changed.emit(quality)


func set_quality_tier(tier: VisualQualityConfig.Tier) -> void:
	var keep_battery := quality.battery_saver if quality else false
	var keep_reduce := quality.reduce_motion if quality else false
	match tier:
		VisualQualityConfig.Tier.HIGH:
			quality = load("res://resources/configs/visual/quality_high.tres") as VisualQualityConfig
		VisualQualityConfig.Tier.MEDIUM:
			quality = load("res://resources/configs/visual/quality_med.tres") as VisualQualityConfig
		VisualQualityConfig.Tier.LOW:
			quality = load("res://resources/configs/visual/quality_low.tres") as VisualQualityConfig
	if quality:
		quality = quality.duplicate(true) as VisualQualityConfig
		quality.battery_saver = keep_battery
		quality.reduce_motion = keep_reduce
	_sync_reduce_motion()
	_apply_all()
	quality_changed.emit(quality)


func set_reduce_motion(on: bool) -> void:
	if quality == null:
		return
	quality.reduce_motion = on
	if feel_config:
		feel_config.reduce_motion = on
	_apply_all()
	quality_changed.emit(quality)


func set_battery_saver(on: bool) -> void:
	if quality == null:
		return
	quality.battery_saver = on
	PowerPolicy.set_battery_saver(on)
	_apply_all()
	quality_changed.emit(quality)


func get_theme() -> Theme:
	if _theme == null and tokens:
		_theme = ShiftrThemeBuilder.build(tokens)
	return _theme


func apply_theme_to(root: Node) -> void:
	_applied_root = root
	var theme := get_theme()
	if theme == null:
		return
	_apply_theme_recursive(root, theme)


func spawn_ui_confirm(at_global: Vector2) -> void:
	if quality == null or not quality.ui_confirm_particles:
		return
	var amount := quality.effective_ui_confirm_amount()
	if amount <= 0:
		return
	if _confirm_pool == null:
		_confirm_pool = NodePool.new(_make_confirm_burst, 8)
	var p := _confirm_pool.acquire() as GPUParticles2D
	if p == null:
		return
	var host: Node = _ambient_host if _ambient_host else self
	host.add_child(p)
	p.global_position = at_global
	p.amount = amount
	p.preprocess = 0.0
	p.visible = true
	p.restart()
	p.emitting = true
	var lifetime := p.lifetime + 0.15
	get_tree().create_timer(lifetime).timeout.connect(
		func() -> void:
			if is_instance_valid(p):
				p.emitting = false
				p.visible = false
				_confirm_pool.release(p)
	)


func _make_confirm_burst() -> Node:
	if _confirm_scene == null:
		_confirm_scene = load("res://scenes/effects/ui_confirm_burst.tscn") as PackedScene
	if _confirm_scene:
		return _confirm_scene.instantiate()
	var gp := GPUParticles2D.new()
	gp.one_shot = true
	gp.explosiveness = 1.0
	gp.lifetime = 0.35
	gp.texture = SharedAtlas.soft_glow_texture()
	gp.process_material = SharedAtlas.make_particle_material(Color("2FE0C5"), 40.0, 100.0)
	return gp


func _sync_reduce_motion() -> void:
	if quality and feel_config and feel_config.reduce_motion:
		quality.reduce_motion = true
	if quality:
		PowerPolicy.set_battery_saver(quality.battery_saver)


func _ensure_layers() -> void:
	if _bg_layer == null:
		_bg_layer = CanvasLayer.new()
		_bg_layer.name = "BackgroundLayer"
		_bg_layer.layer = -10
		add_child(_bg_layer)
	if _bloom_layer == null:
		_bloom_layer = CanvasLayer.new()
		_bloom_layer.name = "BloomLayer"
		_bloom_layer.layer = 20
		add_child(_bloom_layer)
	if _ambient_host == null:
		_ambient_host = Node2D.new()
		_ambient_host.name = "AmbientHost"
		add_child(_ambient_host)


func _apply_all() -> void:
	if tokens == null or quality == null:
		return
	_theme = ShiftrThemeBuilder.build(tokens)
	if _applied_root:
		apply_theme_to(_applied_root)
	elif get_parent():
		apply_theme_to(get_parent())
	_apply_background()
	_apply_bloom()
	_apply_ambient()


func _apply_background() -> void:
	if _bg == null:
		var packed := load("res://scenes/ui/components/animated_shift_background.tscn") as PackedScene
		if packed:
			_bg = packed.instantiate() as AnimatedShiftBackground
			_bg_layer.add_child(_bg)
		else:
			_bg = AnimatedShiftBackground.new()
			_bg_layer.add_child(_bg)
	_bg.apply_tokens(tokens, quality)


func _apply_bloom() -> void:
	if not quality.effective_bloom():
		if _bloom_layer:
			for c in _bloom_layer.get_children():
				c.visible = false
		_bloom_rect = null
		_bloom_mat = null
		return
	# Soft-fail: never attach a broken bloom shader (RD null version -> white screen spam).
	var bloom_mat := _ShaderFx.load_material(
		"res://assets/shaders/materials/canvas_bloom.tres",
		"res://assets/shaders/source/canvas_bloom.gdshader"
	) as ShaderMaterial
	if bloom_mat == null:
		if _bloom_layer:
			for c in _bloom_layer.get_children():
				c.visible = false
		_bloom_rect = null
		_bloom_mat = null
		_bloom_copy = null
		return
	# Reuse nodes when possible — avoid free/realloc on every quality tweak.
	if _bloom_copy == null or not is_instance_valid(_bloom_copy):
		while _bloom_layer.get_child_count() > 0:
			var c := _bloom_layer.get_child(0)
			_bloom_layer.remove_child(c)
			c.free()
		_bloom_copy = BackBufferCopy.new()
		_bloom_copy.copy_mode = BackBufferCopy.COPY_MODE_VIEWPORT
		_bloom_layer.add_child(_bloom_copy)
		_bloom_rect = ColorRect.new()
		_bloom_rect.name = "BloomRect"
		_bloom_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		_bloom_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_bloom_rect.color = Color(1, 1, 1, 1)
		_bloom_mat = bloom_mat
		_bloom_rect.material = _bloom_mat
		_bloom_layer.add_child(_bloom_rect)
	else:
		_bloom_copy.visible = true
		if _bloom_rect:
			_bloom_rect.visible = true
		if _bloom_mat == null and _bloom_rect:
			_bloom_mat = _bloom_rect.material as ShaderMaterial
		if _bloom_mat == null:
			_bloom_mat = bloom_mat
			if _bloom_rect:
				_bloom_rect.material = _bloom_mat
	if _bloom_mat:
		_bloom_mat.set_shader_parameter("strength", quality.effective_bloom_strength() * tokens.bloom_strength_ref)
		_bloom_mat.set_shader_parameter("threshold", quality.bloom_threshold)
		_bloom_mat.set_shader_parameter("samples", quality.effective_bloom_samples())
		_bloom_mat.set_shader_parameter("quality_scale", quality.bloom_resolution_scale)
		_bloom_mat.set_shader_parameter("tint", Color(tokens.glow_tint.r, tokens.glow_tint.g, tokens.glow_tint.b, 1.0))


func _apply_ambient() -> void:
	var amount := quality.effective_ambient_amount()
	if amount <= 0:
		if _ambient and is_instance_valid(_ambient):
			_ambient.emitting = false
			_ambient.visible = false
		return
	if _ambient == null or not is_instance_valid(_ambient):
		var scene := load("res://scenes/effects/ambient_dust.tscn") as PackedScene
		if scene == null:
			return
		_ambient = scene.instantiate() as GPUParticles2D
		_ambient_host.add_child(_ambient)
	_ambient.visible = true
	_ambient.amount = amount
	_ambient.preprocess = quality.effective_particle_preprocess()
	_ambient.emitting = true
	var tex := SharedAtlas.soft_glow_texture()
	if tex and _ambient.texture == null:
		_ambient.texture = tex
	var vp := get_viewport().get_visible_rect().size
	_ambient.position = vp * 0.5


func _apply_theme_recursive(node: Node, theme: Theme) -> void:
	if node is Control:
		(node as Control).theme = theme
		return
	for child in node.get_children():
		if child is CanvasLayer:
			for gc in child.get_children():
				if gc is Control:
					(gc as Control).theme = theme
		elif child is Control:
			(child as Control).theme = theme


func _load_tokens() -> DesignTokens:
	var path := "res://resources/configs/visual/default_design_tokens.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is DesignTokens:
			return res as DesignTokens
	return DesignTokens.new()


func _load_quality_high() -> VisualQualityConfig:
	var path := "res://resources/configs/visual/quality_high.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is VisualQualityConfig:
			return (res as VisualQualityConfig).duplicate(true) as VisualQualityConfig
	return VisualQualityConfig.make_high()
