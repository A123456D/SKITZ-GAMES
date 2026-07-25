extends UiScreen
## In-game level editor — glass chrome, command stack, workshop I/O.

const BoardViewScript = preload("res://scripts/tools/level_editor/editor_board_view.gd")

var _controller: LevelEditorController
var _board: EditorBoardView
var _status: Label
var _issues_list: VBoxContainer
var _analysis_label: Label
var _meta_title: LineEdit
var _layer_btn: Button
var _test_banner: Label
var _chrome: Control
var _palette_host: Control
var _side_host: Control
var _toolbar_host: Control
var _export_dialog_open: bool = false
var _last_export_path: String = "user://workshop_export.shiftr.json"


func _build() -> void:
	screen_id = UiRouter.SCREEN_LEVEL_EDITOR
	title = "Level Editor"
	shows_back = true
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	_controller = LevelEditorController.new()
	_controller.setup()
	_controller.document_changed.connect(_refresh)
	_controller.history_changed.connect(_refresh)
	_controller.issues_changed.connect(_on_issues)
	_controller.analysis_changed.connect(_on_analysis)
	_controller.test_mode_changed.connect(_on_test_mode)
	_controller.status_message.connect(_set_status)

	var root := MarginContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var m := tokens.space_md if tokens else 16
	root.add_theme_constant_override("margin_left", m)
	root.add_theme_constant_override("margin_right", m)
	root.add_theme_constant_override("margin_top", m + 8)
	root.add_theme_constant_override("margin_bottom", m)
	add_child(root)

	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	root.add_child(v)

	v.add_child(_build_header())

	_test_banner = Label.new()
	_test_banner.visible = false
	_test_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_test_banner.add_theme_color_override("font_color", tokens.accent_signal if tokens else Color("2FE0C5"))
	_test_banner.add_theme_font_size_override("font_size", scaled(tokens.font_body if tokens else 15))
	v.add_child(_test_banner)

	_chrome = VBoxContainer.new()
	_chrome.add_theme_constant_override("separation", 8)
	_chrome.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(_chrome)

	_chrome.add_child(_build_toolbar())
	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 12)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_chrome.add_child(body)

	_palette_host = _build_palette()
	body.add_child(_palette_host)
	body.add_child(_build_board_area())
	_side_host = _build_side_panel()
	body.add_child(_side_host)

	_status = Label.new()
	_status.text = "Ready"
	_status.add_theme_color_override("font_color", tokens.ink_muted if tokens else Color(0.6, 0.65, 0.7))
	_status.add_theme_font_size_override("font_size", scaled(tokens.font_caption if tokens else 13))
	v.add_child(_status)

	set_process_unhandled_input(true)
	resized.connect(_apply_responsive_layout)
	call_deferred("_apply_responsive_layout")
	_refresh()


func _apply_responsive_layout() -> void:
	## Desktop-first: three columns. Below ~700px virtual width, drop the analysis rail
	## so the board + palette remain usable on phones (still not ideal for authoring).
	var narrow := size.x > 0.0 and size.x < 700.0
	var testing := _controller != null and _controller.test_session.active
	if _side_host and not testing:
		_side_host.visible = not narrow
	if _palette_host and not testing:
		_palette_host.custom_minimum_size = Vector2(96 if narrow else 120, 0)
	## Palette brush hit targets stay ≥44 on narrow.
	if _palette_host and narrow:
		for child in _palette_host.find_children("*", "Button", true, false):
			var b := child as Button
			if b and b.custom_minimum_size.y > 0.0 and b.custom_minimum_size.y < 44.0:
				b.custom_minimum_size.y = 44.0


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_apply_responsive_layout()


func _build_header() -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)

	var back := Button.new()
	back.text = "←"
	back.custom_minimum_size = Vector2(48, 40)
	_style_ghost(back)
	back.pressed.connect(func() -> void:
		feel_press(back)
		if _controller.test_session.active:
			_controller.exit_test()
		else:
			pop()
	)
	row.add_child(back)

	var title_l := Label.new()
	title_l.text = "Create"
	title_l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_l.add_theme_color_override("font_color", tokens.ink_primary)
	title_l.add_theme_font_size_override("font_size", scaled(tokens.font_title if tokens else 22))
	row.add_child(title_l)

	_meta_title = LineEdit.new()
	_meta_title.placeholder_text = "Title"
	_meta_title.text = _controller.document.title
	_meta_title.custom_minimum_size = Vector2(160, 40)
	_meta_title.text_submitted.connect(func(t: String) -> void:
		_controller.apply_meta({"title": t})
	)
	row.add_child(_meta_title)
	return row


func _build_toolbar() -> Control:
	_toolbar_host = HBoxContainer.new()
	_toolbar_host.add_theme_constant_override("separation", 6)
	var row := _toolbar_host

	var tools := [
		["Brush", EditorTool.Id.BRUSH],
		["Erase", EditorTool.Id.ERASE],
		["Fill", EditorTool.Id.FILL],
		["Line", EditorTool.Id.LINE],
		["Rect", EditorTool.Id.RECT],
		["Select", EditorTool.Id.SELECT],
	]
	for t in tools:
		var b := _tool_btn(str(t[0]), int(t[1]))
		row.add_child(b)

	row.add_child(_vsep())

	row.add_child(_action_btn("Undo", func() -> void: _controller.undo()))
	row.add_child(_action_btn("Redo", func() -> void: _controller.redo()))
	row.add_child(_action_btn("Copy", func() -> void: _controller.copy_selection()))
	row.add_child(_action_btn("Paste", func() -> void: _controller.paste_selection()))

	row.add_child(_vsep())

	_layer_btn = _action_btn("Layer: Start", func() -> void:
		var next := EditorDocument.Layer.GOAL if _controller.document.active_layer == EditorDocument.Layer.START else EditorDocument.Layer.START
		_controller.set_layer(next)
		_layer_btn.text = "Layer: Goal" if next == EditorDocument.Layer.GOAL else "Layer: Start"
	)
	row.add_child(_layer_btn)

	row.add_child(_action_btn("Test", func() -> void: _controller.toggle_test()))
	row.add_child(_action_btn("Play", func() -> void: _controller.enter_test(true)))
	row.add_child(_action_btn("Validate", func() -> void: _controller.run_validation()))
	row.add_child(_action_btn("Analyze", func() -> void: _controller.run_analysis_async()))
	row.add_child(_action_btn("Export", func() -> void: _do_export()))
	row.add_child(_action_btn("Import", func() -> void: _do_import()))
	return row


func _on_test_mode(active: bool, instant: bool) -> void:
	_test_banner.visible = active
	_test_banner.text = (
		"INSTANT PLAY — swipe to shift · Esc to exit"
		if instant
		else "TEST MODE — swipe to shift · Space/Esc to exit"
	)
	var hide_chrome := active and instant
	if _toolbar_host:
		_toolbar_host.visible = not hide_chrome
	if _palette_host:
		_palette_host.visible = not hide_chrome
	if _side_host:
		_side_host.visible = not hide_chrome
	if _status:
		_status.visible = not hide_chrome
	_board.refresh()
	if not hide_chrome:
		_apply_responsive_layout()


func _build_palette() -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(120, 0)
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	if tokens:
		panel.add_theme_stylebox_override("panel", tokens.make_glass_style(false, false))

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	panel.add_child(col)

	var h := Label.new()
	h.text = "Palette"
	h.add_theme_color_override("font_color", tokens.ink_secondary)
	h.add_theme_font_size_override("font_size", scaled(tokens.font_caption if tokens else 13))
	col.add_child(h)

	for c in ["A", "B", "C", "D", "E", "F", ""]:
		var label := "Empty" if c == "" else "Color %s" % c
		var b := PaletteDragButton.new()
		b.text = label
		b.custom_minimum_size = Vector2(0, 40)
		_style_ghost(b)
		var color_id := StringName(c)
		b.configure_drag({"kind": "color", "id": String(color_id)}, label)
		b.pressed.connect(func() -> void:
			feel_press(b)
			_controller.set_paint_color(color_id)
			_set_status("Paint: %s" % ("empty" if c == "" else c))
		)
		col.add_child(b)

	var oh := Label.new()
	oh.text = "Objects"
	oh.add_theme_color_override("font_color", tokens.ink_secondary)
	oh.add_theme_font_size_override("font_size", scaled(tokens.font_caption if tokens else 13))
	col.add_child(oh)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.custom_minimum_size = Vector2(0, 160)
	col.add_child(scroll)
	var ocol := VBoxContainer.new()
	ocol.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ocol.add_theme_constant_override("separation", 4)
	scroll.add_child(ocol)

	for def in PuzzleCatalog.build_all():
		var is_floor := def.tags.has("floor")
		var b2 := PaletteDragButton.new()
		b2.text = def.display_name
		b2.custom_minimum_size = Vector2(0, 36)
		_style_ghost(b2)
		var did := def.id
		var floor_flag := is_floor
		var kind := "floor" if floor_flag else "object"
		b2.configure_drag({"kind": kind, "id": String(did)}, def.display_name)
		b2.pressed.connect(func() -> void:
			feel_press(b2)
			if floor_flag:
				_controller.set_paint_floor(did)
				_set_status("Floor: %s" % String(did))
			else:
				_controller.set_paint_object(did)
				_set_status("Object: %s" % String(did))
		)
		ocol.add_child(b2)

	var size_row := HBoxContainer.new()
	size_row.add_child(_action_btn("−", func() -> void:
		var d := _controller.document
		_controller.resize_board(maxi(d.width - 1, 2), maxi(d.height - 1, 2))
	))
	var sz := Label.new()
	sz.name = "SizeLabel"
	sz.text = "4×4"
	sz.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sz.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sz.add_theme_color_override("font_color", tokens.ink_primary)
	size_row.add_child(sz)
	size_row.add_child(_action_btn("+", func() -> void:
		var d2 := _controller.document
		_controller.resize_board(mini(d2.width + 1, 12), mini(d2.height + 1, 12))
	))
	col.add_child(size_row)
	return panel


func _build_board_area() -> Control:
	var wrap := PanelContainer.new()
	wrap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	wrap.size_flags_vertical = Control.SIZE_EXPAND_FILL
	if tokens:
		wrap.add_theme_stylebox_override("panel", tokens.make_glass_style(false, false))

	_board = BoardViewScript.new() as EditorBoardView
	_board.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_board.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_board.configure(tokens, _controller)
	_board.cell_pressed.connect(func(c: Vector2i, shift: bool) -> void: _controller.begin_pointer(c, shift))
	_board.cell_dragged.connect(func(c: Vector2i) -> void: _controller.drag_pointer(c))
	_board.cell_released.connect(func(c: Vector2i) -> void: _controller.end_pointer(c))
	_board.swipe_shift.connect(_on_swipe)
	wrap.add_child(_board)
	return wrap


func _build_side_panel() -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(200, 0)
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	if tokens:
		panel.add_theme_stylebox_override("panel", tokens.make_glass_style(false, false))

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	panel.add_child(col)

	var ah := Label.new()
	ah.text = "Difficulty"
	ah.add_theme_color_override("font_color", tokens.ink_secondary)
	ah.add_theme_font_size_override("font_size", scaled(tokens.font_caption if tokens else 13))
	col.add_child(ah)

	_analysis_label = Label.new()
	_analysis_label.text = "Run Analyze"
	_analysis_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_analysis_label.add_theme_color_override("font_color", tokens.ink_primary)
	_analysis_label.add_theme_font_size_override("font_size", scaled(tokens.font_caption if tokens else 13))
	col.add_child(_analysis_label)

	var ih := Label.new()
	ih.text = "Issues"
	ih.add_theme_color_override("font_color", tokens.ink_secondary)
	ih.add_theme_font_size_override("font_size", scaled(tokens.font_caption if tokens else 13))
	col.add_child(ih)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(scroll)
	_issues_list = VBoxContainer.new()
	_issues_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_issues_list.add_theme_constant_override("separation", 4)
	scroll.add_child(_issues_list)

	var hint := Label.new()
	hint.text = "Ctrl+Z/Y · Ctrl+C/V · 1–6 brush · Space test · Esc exit"
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hint.add_theme_color_override("font_color", tokens.ink_muted if tokens else Color(0.5, 0.55, 0.6))
	hint.add_theme_font_size_override("font_size", scaled(12))
	col.add_child(hint)
	return panel


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		var k := event as InputEventKey
		var ctrl := k.ctrl_pressed or k.meta_pressed
		if ctrl and k.keycode == KEY_Z and not k.shift_pressed:
			_controller.undo()
			accept_event()
		elif ctrl and (k.keycode == KEY_Y or (k.keycode == KEY_Z and k.shift_pressed)):
			_controller.redo()
			accept_event()
		elif ctrl and k.keycode == KEY_C:
			_controller.copy_selection()
			accept_event()
		elif ctrl and k.keycode == KEY_V:
			_controller.paste_selection()
			accept_event()
		elif ctrl and k.keycode == KEY_S:
			_do_export()
			accept_event()
		elif ctrl and k.keycode == KEY_O:
			_do_import()
			accept_event()
		elif k.keycode == KEY_SPACE:
			_controller.toggle_test()
			accept_event()
		elif k.keycode == KEY_ESCAPE:
			if _controller.test_session.active:
				_controller.exit_test()
				accept_event()
		elif k.keycode == KEY_B:
			_controller.set_tool(EditorTool.Id.BRUSH)
			accept_event()
		elif k.keycode == KEY_E:
			_controller.set_tool(EditorTool.Id.ERASE)
			accept_event()
		elif k.keycode == KEY_G:
			_controller.set_tool(EditorTool.Id.FILL)
			accept_event()
		elif k.keycode == KEY_L:
			_controller.set_tool(EditorTool.Id.LINE)
			accept_event()
		elif k.keycode == KEY_R:
			_controller.set_tool(EditorTool.Id.RECT)
			accept_event()
		elif k.keycode == KEY_M:
			_controller.set_tool(EditorTool.Id.SELECT)
			accept_event()
		elif k.keycode >= KEY_1 and k.keycode <= KEY_6:
			var colors := ["A", "B", "C", "D", "E", "F"]
			_controller.set_paint_color(StringName(colors[k.keycode - KEY_1]))
			_controller.set_tool(EditorTool.Id.BRUSH)
			accept_event()
		elif k.keycode == KEY_TAB:
			var next := EditorDocument.Layer.GOAL if _controller.document.active_layer == EditorDocument.Layer.START else EditorDocument.Layer.START
			_controller.set_layer(next)
			_layer_btn.text = "Layer: Goal" if next == EditorDocument.Layer.GOAL else "Layer: Start"
			accept_event()


func _on_swipe(is_row: bool, index: int, dir: int) -> void:
	if not _controller.test_session.active:
		return
	if is_row:
		_controller.test_session.shift_row(index, dir)
	else:
		_controller.test_session.shift_column(index, dir)
	_board.refresh()


func _do_export() -> void:
	var path := _last_export_path
	if _controller.save_file(path):
		## Also stash JSON to clipboard-friendly snippet in status.
		DisplayServer.clipboard_set(_controller.export_json())
		_set_status("Exported + copied JSON → %s" % path)


func _do_import() -> void:
	## Prefer clipboard workshop JSON; fall back to last export path.
	var clip := DisplayServer.clipboard_get()
	if clip.contains("shiftr_workshop_puzzle") or clip.contains("goal_occupants"):
		if _controller.import_json(clip):
			_meta_title.text = _controller.document.title
			_refresh()
			return
	if FileAccess.file_exists(_last_export_path):
		if _controller.load_file(_last_export_path):
			_meta_title.text = _controller.document.title
			_refresh()
			return
	_set_status("Import: paste workshop JSON to clipboard, or save a file first")


func _on_issues(result: Dictionary) -> void:
	for c in _issues_list.get_children():
		c.queue_free()
	var issues: Array = result.get("issues", [])
	if issues.is_empty():
		var ok := Label.new()
		ok.text = "No issues"
		ok.add_theme_color_override("font_color", tokens.accent_signal if tokens else Color("2FE0C5"))
		_issues_list.add_child(ok)
		return
	for item in issues:
		var lab := Label.new()
		var sev := str(item.get("severity", "info"))
		var msg := str(item.get("message", ""))
		lab.text = "[%s] %s" % [sev, msg]
		lab.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		var col := tokens.ink_secondary if tokens else Color(0.7, 0.75, 0.8)
		if sev == "error":
			col = tokens.accent_warn if tokens else Color("FF6A3D")
		elif sev == "warning":
			col = Color("F5C542")
		elif sev == "info":
			col = tokens.accent_signal if tokens else Color("2FE0C5")
		lab.add_theme_color_override("font_color", col)
		lab.add_theme_font_size_override("font_size", scaled(12))
		_issues_list.add_child(lab)


func _on_analysis(result: Dictionary) -> void:
	if not result.get("ok", false):
		_analysis_label.text = "Failed: %s" % str(result.get("error", "?"))
		return
	var band: Vector2 = result.get("band", Vector2.ZERO)
	_analysis_label.text = (
		"Score %.1f\nOptimal %s%s\nBand %.0f–%.0f\n%s"
		% [
			float(result.get("score", 0.0)),
			str(result.get("optimal_moves", -1)),
			" (exact)" if result.get("optimal_is_exact", false) else "",
			band.x,
			band.y,
			"In band" if result.get("in_band", false) else "Out of band",
		]
	)


func _refresh() -> void:
	if _board:
		_board.configure(tokens, _controller)
		_board.refresh()
	var sz := _chrome.find_child("SizeLabel", true, false) if _chrome else null
	if sz is Label and _controller:
		(sz as Label).text = "%d×%d" % [_controller.document.width, _controller.document.height]


func _set_status(text: String) -> void:
	if _status:
		_status.text = text


func _tool_btn(label: String, id: int) -> Button:
	var b := Button.new()
	b.text = label
	b.custom_minimum_size = Vector2(0, 40)
	_style_ghost(b)
	b.pressed.connect(func() -> void:
		feel_press(b)
		_controller.set_tool(id)
		_set_status("Tool: %s" % label)
	)
	return b


func _action_btn(label: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = label
	b.custom_minimum_size = Vector2(0, 40)
	_style_ghost(b)
	b.pressed.connect(func() -> void:
		feel_press(b)
		cb.call()
	)
	return b


func _style_ghost(b: Button) -> void:
	b.flat = true
	b.focus_mode = Control.FOCUS_ALL
	if tokens:
		b.add_theme_stylebox_override("normal", tokens.make_ghost_style())
		b.add_theme_stylebox_override("pressed", tokens.make_glass_style(true, false))
		b.add_theme_stylebox_override("hover", tokens.make_glass_style(false, false))
		b.add_theme_stylebox_override("focus", tokens.make_glass_style(false, true))
		b.add_theme_color_override("font_color", tokens.ink_secondary)
		b.add_theme_color_override("font_focus_color", tokens.accent_beam)
		b.add_theme_font_size_override("font_size", scaled(tokens.font_caption))


func _vsep() -> Control:
	var s := Control.new()
	s.custom_minimum_size = Vector2(8, 0)
	return s


func _apply_text_scale() -> void:
	pass
