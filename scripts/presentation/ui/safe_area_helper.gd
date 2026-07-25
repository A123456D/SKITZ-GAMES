class_name SafeAreaHelper
extends RefCounted
## Converts DisplayServer safe-area (notch / home indicator) into Control margins
## in *viewport* coordinates (respects canvas_items stretch).

## Returns Vector4(left, top, right, bottom) in viewport pixels.
static func insets(from: CanvasItem = null) -> Vector4:
	var vp: Viewport = null
	if from:
		vp = from.get_viewport()
	if vp == null:
		var tree := Engine.get_main_loop() as SceneTree
		if tree:
			vp = tree.root
	if vp == null:
		return Vector4.ZERO

	var window_id: int = vp.get_window_id()
	var safe := Rect2(DisplayServer.get_display_safe_area())
	var win_pos := Vector2(DisplayServer.window_get_position(window_id))
	var win_size := Vector2(DisplayServer.window_get_size(window_id))
	if win_size.x < 1.0 or win_size.y < 1.0:
		return Vector4.ZERO

	var left_px := maxf(0.0, safe.position.x - win_pos.x)
	var top_px := maxf(0.0, safe.position.y - win_pos.y)
	var right_px := maxf(0.0, win_pos.x + win_size.x - safe.end.x)
	var bottom_px := maxf(0.0, win_pos.y + win_size.y - safe.end.y)

	# Physical window pixels â†’ viewport / content coordinates under stretch.
	var visible := vp.get_visible_rect().size
	var sx := visible.x / win_size.x
	var sy := visible.y / win_size.y
	return Vector4(left_px * sx, top_px * sy, right_px * sx, bottom_px * sy)


## Base token margins plus device safe insets. Returns Vector4i(left, top, right, bottom).
static func margins(
	from: CanvasItem,
	base_left: int,
	base_top: int,
	base_right: int,
	base_bottom: int
) -> Vector4i:
	var inset := insets(from)
	return Vector4i(
		base_left + int(ceil(inset.x)),
		base_top + int(ceil(inset.y)),
		base_right + int(ceil(inset.z)),
		base_bottom + int(ceil(inset.w))
	)


static func apply_to_margin_container(
	mc: MarginContainer,
	base_left: int,
	base_top: int,
	base_right: int,
	base_bottom: int
) -> void:
	if mc == null:
		return
	var m := margins(mc, base_left, base_top, base_right, base_bottom)
	mc.add_theme_constant_override("margin_left", m.x)
	mc.add_theme_constant_override("margin_top", m.y)
	mc.add_theme_constant_override("margin_right", m.z)
	mc.add_theme_constant_override("margin_bottom", m.w)
