class_name BoardTileView
extends Control
## One visual cell — dark glass tile + emissive neon icon. Shared base StyleBox.

const PuzzleVisualsScript := preload("res://scripts/presentation/board/puzzle_visuals.gd")
const ObjectIconAtlasScript := preload("res://scripts/presentation/board/object_icon_atlas.gd")

signal pressed_cell(tile: BoardTileView)

static var _shared_empty_style: StyleBoxFlat

var grid_x: int = 0
var grid_y: int = 0
var occupant_id: StringName = &""
var cell_size: Vector2 = Vector2(72, 72)
var tokens: DesignTokens

var _panel: Panel
var _glow: ColorRect
var _orb: ColorRect
var _icon: TextureRect
var _label: Label
var _base_color: Color = Color(0.85, 0.88, 0.92)
var _flash_tween: Tween
var _state_tween: Tween
var _idle_pulse: float = 0.0
var _door_open: bool = false
var _switch_on: bool = false
var _hit_pulse: float = 0.0
var quality: VisualQualityConfig = null
var glow_enabled: bool = true


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = cell_size
	size = cell_size
	_panel = Panel.new()
	_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_panel)

	_glow = ColorRect.new()
	_glow.name = "Glow"
	_glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_glow.color = Color(1, 1, 1, 0)
	_glow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_glow.offset_left = -6
	_glow.offset_top = -6
	_glow.offset_right = 6
	_glow.offset_bottom = 6
	var mat_res := load("res://assets/shaders/materials/soft_glow.tres") as ShaderMaterial
	if mat_res:
		var mat := mat_res.duplicate() as ShaderMaterial
		mat.set_shader_parameter("glow_strength", 0.0)
		mat.set_shader_parameter("pulse", 0.4)
		_glow.material = mat
	add_child(_glow)

	_orb = ColorRect.new()
	_orb.name = "Orb"
	_orb.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_orb.color = Color(1, 1, 1, 0)
	add_child(_orb)

	_icon = TextureRect.new()
	_icon.name = "Icon"
	_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_icon.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	add_child(_icon)

	_label = Label.new()
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_label)
	_setup_style()
	gui_input.connect(_on_gui_input)
	set_process(false)


func setup(x: int, y: int, p_occupant: StringName, p_cell_size: Vector2, color: Color) -> void:
	grid_x = x
	grid_y = y
	occupant_id = p_occupant
	cell_size = p_cell_size
	_base_color = color
	_door_open = false
	_switch_on = false
	_hit_pulse = 0.0
	custom_minimum_size = cell_size
	size = cell_size
	visible = true
	if is_inside_tree():
		_apply_visual()


func reset_for_pool() -> void:
	TweenUtil.kill(_flash_tween)
	TweenUtil.kill(_state_tween)
	_flash_tween = null
	_state_tween = null
	occupant_id = &""
	grid_x = 0
	grid_y = 0
	_door_open = false
	_switch_on = false
	_hit_pulse = 0.0
	modulate = Color.WHITE
	if _panel:
		_panel.modulate = Color.WHITE
	if _icon:
		_icon.modulate = Color.WHITE
		_icon.scale = Vector2.ONE
	set_streak(Vector2.ZERO, 0.0, Color.WHITE)
	visible = false


func set_occupant(p_occupant: StringName, color: Color) -> void:
	occupant_id = p_occupant
	_base_color = color
	_apply_visual()


func set_blur(dir: Vector2, amount: float) -> void:
	var streak := get_node_or_null("Streak") as ColorRect
	if streak == null:
		return
	streak.set_instance_shader_parameter("blur_dir", dir)
	streak.set_instance_shader_parameter("blur_amount", amount)


func flash_land() -> void:
	if _panel == null:
		return
	_flash_tween = TweenUtil.replace(self, _flash_tween)
	if _flash_tween == null:
		return
	_flash_tween.tween_property(_panel, "modulate", Color(1.35, 1.3, 1.45, 1.0), 0.04)
	_flash_tween.tween_property(_panel, "modulate", Color.WHITE, 0.1)


func pulse_connection(strength: float = 1.1, duration: float = 0.18) -> void:
	## Extra land snap — cyan-purple connection bloom on settle.
	if _glow and _glow.material is ShaderMaterial:
		var mat := _glow.material as ShaderMaterial
		mat.set_shader_parameter("glow_strength", 0.9 * strength)
	pulse_glow(strength, duration)
	if _icon:
		_state_tween = TweenUtil.replace(self, _state_tween)
		if _state_tween:
			_icon.pivot_offset = _icon.size * 0.5
			_state_tween.tween_property(_icon, "scale", Vector2(1.12, 1.12), duration * 0.35).set_ease(Tween.EASE_OUT)
			_state_tween.tween_property(_icon, "scale", Vector2.ONE, duration * 0.65).set_ease(Tween.EASE_IN_OUT)


func pulse_secondary(direction: Vector2) -> void:
	var target: Control = _icon if _icon and _icon.visible else _label
	if target == null or direction.length_squared() < 0.0001:
		return
	MotionDeform.play_secondary_lag(target, self, 2.2, 0.055)


func pulse_glow(strength: float = 0.7, duration: float = 0.1) -> void:
	GlowPulse.pulse_modulate(_panel if _panel else self, strength, duration)


func pulse_receiver_hit() -> void:
	_hit_pulse = 1.0
	pulse_glow(1.35, 0.22)
	if _icon:
		_icon.modulate = Color(1.4, 1.2, 1.25, 1.0)


func set_door_open(open: bool, animate: bool = true) -> void:
	if _door_open == open and not animate:
		return
	_door_open = open
	var id := String(occupant_id)
	if id != "door" and id != "heavy_door":
		return
	TweenUtil.kill(_state_tween)
	if not animate:
		_apply_door_visual(1.0 if open else 0.0)
		return
	_state_tween = TweenUtil.replace(self, _state_tween)
	if _state_tween == null:
		_apply_door_visual(1.0 if open else 0.0)
		return
	var from := 0.0 if open else 1.0
	var to := 1.0 if open else 0.0
	_apply_door_visual(from)
	_state_tween.tween_method(_apply_door_visual, from, to, 0.22).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)


func set_switch_on(on: bool, animate: bool = true) -> void:
	_switch_on = on
	if String(occupant_id) != "switch" and String(occupant_id) != "pressure_plate":
		return
	var lit := Color(_base_color.r, _base_color.g, _base_color.b, 0.95) if on else Color(_base_color.r, _base_color.g, _base_color.b, 0.45)
	if _orb:
		_orb.color = Color(lit.r, lit.g, lit.b, 0.7 if on else 0.35)
	if _icon:
		_icon.modulate = Color(1.25, 1.15, 0.85, 1.0) if on else Color(0.75, 0.75, 0.8, 0.9)
	if animate:
		pulse_glow(1.0 if on else 0.45, 0.12)
		if _icon:
			MotionDeform.play_squash(_icon, Vector2(0.9, 0.9), 0.06, true, 0.08)


func _apply_door_visual(t: float) -> void:
	## t=0 closed, t=1 open
	if _icon:
		_icon.pivot_offset = _icon.size * 0.5
		_icon.scale = Vector2(1.0 - t * 0.55, 1.0)
		_icon.modulate = Color(1, 1, 1, 1.0 - t * 0.75)
	if _orb:
		_orb.color = Color(_base_color.r, _base_color.g, _base_color.b, 0.55 * (1.0 - t * 0.85))
	if _glow and _glow.material is ShaderMaterial:
		(_glow.material as ShaderMaterial).set_shader_parameter("glow_strength", 0.65 * (1.0 - t * 0.7))
	modulate = Color(1, 1, 1, 1.0 - t * 0.35)


func set_quality(p_quality: VisualQualityConfig) -> void:
	quality = p_quality
	glow_enabled = true
	if quality:
		glow_enabled = quality.soft_glow_enabled and quality.tier != VisualQualityConfig.Tier.LOW and not quality.reduce_motion
	_apply_glow(occupant_id == &"" or String(occupant_id).is_empty())


func _process(delta: float) -> void:
	if not glow_enabled or occupant_id == &"" or _glow == null or not _glow.visible:
		set_process(false)
		return
	_idle_pulse += delta
	if _hit_pulse > 0.0:
		_hit_pulse = maxf(0.0, _hit_pulse - delta * 2.8)
	var breathe := 0.55 + 0.2 * sin(_idle_pulse * 2.4 + float(grid_x + grid_y) * 0.35)
	breathe += _hit_pulse * 0.55
	if _door_open:
		breathe *= 0.35
	if _glow.material is ShaderMaterial:
		(_glow.material as ShaderMaterial).set_shader_parameter("glow_strength", breathe)


func _apply_visual() -> void:
	if _panel == null:
		return
	_setup_style()
	var empty := occupant_id == &"" or String(occupant_id).is_empty()
	var tex: Texture2D = null if empty else ObjectIconAtlasScript.texture_for(occupant_id)
	if _icon:
		_icon.texture = tex
		_icon.visible = tex != null
		_icon.modulate = Color.WHITE
		_icon.scale = Vector2.ONE
		if tex:
			var pad := cell_size.x * 0.14
			_icon.position = Vector2(pad, pad)
			_icon.size = cell_size - Vector2(pad, pad) * 2.0
			_icon.pivot_offset = _icon.size * 0.5
	## Glyph fallback only when atlas has no art (should be rare).
	_label.text = "" if empty or tex != null else PuzzleVisualsScript.glyph_for(occupant_id)
	_label.add_theme_color_override("font_color", Color(1, 1, 1, 0.95) if not empty and tex == null else Color(1, 1, 1, 0))
	_label.add_theme_font_size_override("font_size", int(maxi(14, int(cell_size.x * 0.38))))
	_layout_orb(empty)
	_apply_glow(empty)
	if _door_open:
		_apply_door_visual(1.0)
	elif _switch_on:
		set_switch_on(true, false)


func _layout_orb(empty: bool) -> void:
	if _orb == null:
		return
	if empty:
		_orb.visible = false
		return
	_orb.visible = true
	var pad := cell_size.x * 0.22
	_orb.position = Vector2(pad, pad)
	_orb.size = cell_size - Vector2(pad, pad) * 2.0
	_orb.color = Color(_base_color.r, _base_color.g, _base_color.b, 0.42)
	_orb.pivot_offset = _orb.size * 0.5


func _apply_glow(empty: bool) -> void:
	if _glow == null:
		return
	var show := not empty and glow_enabled
	_glow.visible = show
	if empty or not glow_enabled:
		set_process(false)
		if _glow.material is ShaderMaterial:
			(_glow.material as ShaderMaterial).set_shader_parameter("glow_strength", 0.0)
		return
	if _glow.material is ShaderMaterial:
		var mat := _glow.material as ShaderMaterial
		mat.set_shader_parameter("glow_color", _base_color)
		var idle := 0.45 if quality and quality.tier == VisualQualityConfig.Tier.MEDIUM else 0.65
		mat.set_shader_parameter("glow_strength", idle)
		mat.set_shader_parameter("core_opacity", 0.2)
	set_process(true)


func _setup_style() -> void:
	if _shared_empty_style == null:
		_shared_empty_style = StyleBoxFlat.new()
		_shared_empty_style.bg_color = Color(0.10, 0.09, 0.16, 0.92)
		_shared_empty_style.border_color = Color(0.55, 0.35, 0.95, 0.22)
		_shared_empty_style.set_border_width_all(1)
		_shared_empty_style.set_corner_radius_all(14)
		_shared_empty_style.shadow_color = Color(0, 0, 0, 0.28)
		_shared_empty_style.shadow_size = 4
		_shared_empty_style.shadow_offset = Vector2(0, 2)
	_panel.add_theme_stylebox_override("panel", _shared_empty_style)
	_panel.self_modulate = Color.WHITE
	_ensure_streak_rect()


func _ensure_streak_rect() -> void:
	var streak := get_node_or_null("Streak") as ColorRect
	if streak == null:
		streak = ColorRect.new()
		streak.name = "Streak"
		streak.mouse_filter = Control.MOUSE_FILTER_IGNORE
		streak.color = Color(1, 1, 1, 0.0)
		streak.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		var mat := SharedAtlas.tile_blur_material()
		if mat:
			streak.material = mat
		add_child(streak)
		move_child(streak, 0)
	elif streak.material == null:
		var mat2 := SharedAtlas.tile_blur_material()
		if mat2:
			streak.material = mat2


func set_streak(dir: Vector2, amount: float, color: Color) -> void:
	var streak := get_node_or_null("Streak") as ColorRect
	if streak == null:
		return
	if amount <= 0.01:
		streak.color.a = 0.0
		set_blur(Vector2.ZERO, 0.0)
		return
	streak.color = Color(color.r, color.g, color.b, clampf(amount * 0.35, 0.0, 0.45))
	var stretch := 1.0 + amount * 0.45
	if absf(dir.x) >= absf(dir.y):
		streak.scale = Vector2(stretch, 1.0)
		streak.pivot_offset = streak.size * 0.5
	else:
		streak.scale = Vector2(1.0, stretch)
		streak.pivot_offset = streak.size * 0.5
	set_blur(dir.normalized(), amount)


func _on_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		pressed_cell.emit(self)
	elif event is InputEventScreenTouch and event.pressed:
		pressed_cell.emit(self)
