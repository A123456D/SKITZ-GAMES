class_name ControllerNav
extends RefCounted
## Builds vertical focus neighbor graphs for menu columns and shows glyph hints.

const GLYPH_ACCEPT := "A / Enter"
const GLYPH_BACK := "B / Esc"
const GLYPH_NAV := "D-pad / Stick"


static func link_vertical(controls: Array) -> void:
	## controls: Array of Control (focusable or containers with focusable children). Wraps top/bottom.
	var focusable: Array[Control] = []
	for c in controls:
		if c is Control:
			var resolved := _resolve_focusable(c as Control)
			if resolved:
				focusable.append(resolved)
	var n := focusable.size()
	if n == 0:
		return
	for i in range(n):
		var cur := focusable[i]
		var prev := focusable[(i - 1 + n) % n]
		var next := focusable[(i + 1) % n]
		cur.focus_neighbor_top = cur.get_path_to(prev)
		cur.focus_neighbor_bottom = cur.get_path_to(next)
		cur.focus_previous = cur.get_path_to(prev)
		cur.focus_next = cur.get_path_to(next)


static func _resolve_focusable(c: Control) -> Control:
	if c.focus_mode != Control.FOCUS_NONE:
		return c
	for child in c.get_children():
		if child is Control:
			var inner := _resolve_focusable(child as Control)
			if inner:
				return inner
	return null


static func focus_first(controls: Array) -> void:
	for c in controls:
		if c is Control:
			var resolved := _resolve_focusable(c as Control)
			if resolved:
				resolved.grab_focus()
				return


static func collect_buttons(root: Node) -> Array:
	var out: Array = []
	_walk(root, out)
	return out


static func _walk(n: Node, out: Array) -> void:
	if n is BaseButton:
		out.append(n)
	for c in n.get_children():
		_walk(c, out)


static func hint_text() -> String:
	return "%s  ·  %s  ·  %s" % [GLYPH_NAV, GLYPH_ACCEPT, GLYPH_BACK]
