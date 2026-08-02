extends Control

const CRTypes := preload("res://scripts/core/types.gd")
const CRCards := preload("res://scripts/core/cards.gd")
const CRMatch := preload("res://scripts/core/match.gd")
const CRAi := preload("res://scripts/core/ai.gd")
const CRArt := preload("res://scripts/ui/art.gd")
const CRCardFace := preload("res://scripts/ui/card_face.gd")
const CRCascadeFx := preload("res://scripts/ui/cascade_fx.gd")

var match_state = CRMatch.new()
var selected_hand: int = -1
var ai_delay: float = 0.55
var _board_origin := Vector2.ZERO
var _cell_w := 170.0
var _cell_h := 178.0
var _gap := 10.0

var _bg: TextureRect
var _logo: TextureRect
var _title: Label
var _subtitle: Label
var _hud_panel: Panel
var _hud_you: Label
var _hud_opp: Label
var _hud_round: Label
var _hud_timer: Label
var _you_icon: TextureRect
var _opp_icon: TextureRect
var _energy_label: Label
var _energy_bar: ProgressBar
var _board_panel: Panel
var _board_grid: GridContainer
var _hand_row: HBoxContainer
var _pass_btn: Button
var _skip_btn: Button
var _menu: VBoxContainer
var _play_btn: Button
var _faction_box: VBoxContainer
var _overlay: ColorRect
var _overlay_label: Label
var _fx
var _tile_btns: Array = []
var _inspect: ColorRect
var _inspect_face
var _inspect_title: Label
var _inspect_meta: Label
var _inspect_ability: Label
var _inspect_owner: Label
var _hand_tip: Label
var _inspect_open: bool = false
var _music: AudioStreamPlayer
var _music_bed: String = ""


func _ready() -> void:
	CRArt.warm()
	_build_ui()
	_setup_music()
	match_state.changed.connect(_refresh)
	match_state.create_menu()
	_refresh()
	_sync_music()


func _build_ui() -> void:
	set_anchors_and_offsets_preset(PRESET_FULL_RECT)

	_bg = TextureRect.new()
	_bg.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	_bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	_bg.texture = CRArt.ui("ui-bg-chamber.png")
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg)

	var dim := ColorRect.new()
	dim.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	dim.color = Color(0.027, 0.035, 0.059, 0.35)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(dim)

	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 22)
	margin.add_theme_constant_override("margin_right", 22)
	margin.add_theme_constant_override("margin_top", 20)
	margin.add_theme_constant_override("margin_bottom", 18)
	add_child(margin)

	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 10)
	margin.add_child(root)

	# Title row
	var title_row := HBoxContainer.new()
	title_row.alignment = BoxContainer.ALIGNMENT_CENTER
	title_row.add_theme_constant_override("separation", 12)
	root.add_child(title_row)

	_logo = TextureRect.new()
	_logo.custom_minimum_size = Vector2(56, 56)
	_logo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_logo.texture = CRArt.ui("ui-logo-badge.png")
	title_row.add_child(_logo)

	var title_col := VBoxContainer.new()
	title_row.add_child(title_col)
	_title = Label.new()
	_title.text = "CHAIN REACTOR"
	_title.add_theme_font_override("font", CRArt.title_font())
	_title.add_theme_font_size_override("font_size", 30)
	_title.add_theme_color_override("font_color", CRArt.COLOR_TEXT)
	title_col.add_child(_title)
	_subtitle = Label.new()
	_subtitle.text = "BUILD 01 · PROTOTYPE"
	_subtitle.add_theme_font_override("font", CRArt.body_font())
	_subtitle.add_theme_font_size_override("font_size", 12)
	_subtitle.add_theme_color_override("font_color", CRArt.COLOR_ENERGY)
	title_col.add_child(_subtitle)
	var tagline := Label.new()
	tagline.text = "PLACE · CHAIN · OVERTHROW"
	tagline.add_theme_font_override("font", CRArt.body_font())
	tagline.add_theme_font_size_override("font_size", 11)
	tagline.add_theme_color_override("font_color", CRArt.COLOR_MUTED)
	title_col.add_child(tagline)

	# HUD
	_hud_panel = Panel.new()
	_hud_panel.custom_minimum_size = Vector2(0, 88)
	var hud_tex := CRArt.ui("ui-hud-panel.png")
	if hud_tex:
		_hud_panel.add_theme_stylebox_override("panel", CRArt.nine_slice_style(hud_tex, 40))
	root.add_child(_hud_panel)

	var hud_m := MarginContainer.new()
	hud_m.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	hud_m.add_theme_constant_override("margin_left", 16)
	hud_m.add_theme_constant_override("margin_right", 16)
	hud_m.add_theme_constant_override("margin_top", 10)
	hud_m.add_theme_constant_override("margin_bottom", 10)
	_hud_panel.add_child(hud_m)

	var hud_row := HBoxContainer.new()
	hud_row.add_theme_constant_override("separation", 8)
	hud_m.add_child(hud_row)

	var you_box := HBoxContainer.new()
	you_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	you_box.add_theme_constant_override("separation", 8)
	hud_row.add_child(you_box)
	_you_icon = TextureRect.new()
	_you_icon.custom_minimum_size = Vector2(36, 36)
	_you_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_you_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	you_box.add_child(_you_icon)
	_hud_you = Label.new()
	_hud_you.text = "0"
	_hud_you.add_theme_font_override("font", CRArt.title_font())
	_hud_you.add_theme_font_size_override("font_size", 34)
	_hud_you.add_theme_color_override("font_color", CRArt.COLOR_CYAN)
	you_box.add_child(_hud_you)

	var mid := VBoxContainer.new()
	mid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hud_row.add_child(mid)
	_hud_round = Label.new()
	_hud_round.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hud_round.add_theme_font_override("font", CRArt.bold_font())
	_hud_round.add_theme_font_size_override("font_size", 16)
	_hud_round.add_theme_color_override("font_color", CRArt.COLOR_TEXT)
	mid.add_child(_hud_round)
	_hud_timer = Label.new()
	_hud_timer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hud_timer.add_theme_font_override("font", CRArt.title_font())
	_hud_timer.add_theme_font_size_override("font_size", 22)
	_hud_timer.add_theme_color_override("font_color", CRArt.COLOR_CYAN)
	mid.add_child(_hud_timer)

	var opp_box := HBoxContainer.new()
	opp_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	opp_box.alignment = BoxContainer.ALIGNMENT_END
	opp_box.add_theme_constant_override("separation", 8)
	hud_row.add_child(opp_box)
	_hud_opp = Label.new()
	_hud_opp.text = "0"
	_hud_opp.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_hud_opp.add_theme_font_override("font", CRArt.title_font())
	_hud_opp.add_theme_font_size_override("font_size", 34)
	_hud_opp.add_theme_color_override("font_color", CRArt.COLOR_ENEMY)
	opp_box.add_child(_hud_opp)
	_opp_icon = TextureRect.new()
	_opp_icon.custom_minimum_size = Vector2(36, 36)
	_opp_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_opp_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	opp_box.add_child(_opp_icon)

	_energy_label = Label.new()
	_energy_label.add_theme_font_override("font", CRArt.body_font())
	_energy_label.add_theme_font_size_override("font_size", 13)
	_energy_label.add_theme_color_override("font_color", CRArt.COLOR_MUTED)
	root.add_child(_energy_label)

	_energy_bar = ProgressBar.new()
	_energy_bar.custom_minimum_size = Vector2(0, 18)
	_energy_bar.show_percentage = false
	_energy_bar.max_value = 6
	var eg := StyleBoxFlat.new()
	eg.bg_color = Color("1a2233")
	eg.corner_radius_top_left = 6
	eg.corner_radius_top_right = 6
	eg.corner_radius_bottom_left = 6
	eg.corner_radius_bottom_right = 6
	_energy_bar.add_theme_stylebox_override("background", eg)
	var ef := StyleBoxFlat.new()
	ef.bg_color = CRArt.COLOR_ENERGY
	ef.corner_radius_top_left = 6
	ef.corner_radius_top_right = 6
	ef.corner_radius_bottom_left = 6
	ef.corner_radius_bottom_right = 6
	_energy_bar.add_theme_stylebox_override("fill", ef)
	root.add_child(_energy_bar)

	# Board
	_board_panel = Panel.new()
	_board_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var board_tex := CRArt.ui("ui-board-panel.png")
	if board_tex:
		_board_panel.add_theme_stylebox_override("panel", CRArt.nine_slice_style(board_tex, 40))
	root.add_child(_board_panel)

	var board_m := MarginContainer.new()
	board_m.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	board_m.add_theme_constant_override("margin_left", 14)
	board_m.add_theme_constant_override("margin_right", 14)
	board_m.add_theme_constant_override("margin_top", 14)
	board_m.add_theme_constant_override("margin_bottom", 14)
	_board_panel.add_child(board_m)

	_board_grid = GridContainer.new()
	_board_grid.columns = CRTypes.COLS
	_board_grid.add_theme_constant_override("h_separation", int(_gap))
	_board_grid.add_theme_constant_override("v_separation", int(_gap))
	_board_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_board_grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	board_m.add_child(_board_grid)
	_build_board_cells()

	_fx = CRCascadeFx.new()
	_fx.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	_fx.configure(_cell_center_global)
	_fx.finished.connect(_on_cascade_finished)
	_board_panel.add_child(_fx)

	_hand_row = HBoxContainer.new()
	_hand_row.alignment = BoxContainer.ALIGNMENT_CENTER
	_hand_row.add_theme_constant_override("separation", 12)
	_hand_row.custom_minimum_size = Vector2(0, 260)
	root.add_child(_hand_row)

	var btn_row := HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_CENTER
	btn_row.add_theme_constant_override("separation", 16)
	root.add_child(btn_row)

	_pass_btn = _make_tex_button("PASS", CRArt.ui("ui-btn-pass.png"))
	_pass_btn.pressed.connect(func() -> void:
		if match_state.phase == "playing":
			match_state.pass_turn()
			selected_hand = -1
	)
	btn_row.add_child(_pass_btn)

	_skip_btn = _make_tex_button("SKIP FX", CRArt.ui("ui-btn-ghost.png"))
	_skip_btn.pressed.connect(func() -> void: _fx.skip())
	btn_row.add_child(_skip_btn)

	# Menu overlay area
	_menu = VBoxContainer.new()
	_menu.set_anchors_preset(PRESET_CENTER)
	_menu.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_menu.grow_vertical = Control.GROW_DIRECTION_BOTH
	_menu.add_theme_constant_override("separation", 14)
	_menu.offset_left = -200
	_menu.offset_right = 200
	_menu.offset_top = -160
	_menu.offset_bottom = 160
	add_child(_menu)

	_play_btn = _make_tex_button("PLAY", CRArt.ui("ui-btn-primary.png"), Vector2(320, 72))
	_play_btn.pressed.connect(_on_play)
	_menu.add_child(_play_btn)

	_faction_box = VBoxContainer.new()
	_faction_box.add_theme_constant_override("separation", 12)
	_faction_box.visible = false
	_menu.add_child(_faction_box)
	for item in [
		["volt", "VOLT SYNDICATE"],
		["prismatic", "PRISMATIC ORDER"],
		["void", "VOID ARCHITECTS"],
	]:
		var b := _make_faction_button(str(item[0]), str(item[1]))
		_faction_box.add_child(b)

	_overlay = ColorRect.new()
	_overlay.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	_overlay.color = Color(0, 0, 0, 0.72)
	_overlay.visible = false
	_overlay.gui_input.connect(_on_overlay_input)
	add_child(_overlay)
	_overlay_label = Label.new()
	_overlay_label.set_anchors_preset(PRESET_CENTER)
	_overlay_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay_label.grow_vertical = Control.GROW_DIRECTION_BOTH
	_overlay_label.offset_left = -240
	_overlay_label.offset_right = 240
	_overlay_label.offset_top = -90
	_overlay_label.offset_bottom = 90
	_overlay_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_overlay_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_overlay_label.add_theme_font_override("font", CRArt.title_font())
	_overlay_label.add_theme_font_size_override("font_size", 28)
	_overlay_label.add_theme_color_override("font_color", CRArt.COLOR_TEXT)
	_overlay.add_child(_overlay_label)

	_hand_tip = Label.new()
	_hand_tip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hand_tip.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_hand_tip.add_theme_font_override("font", CRArt.body_font())
	_hand_tip.add_theme_font_size_override("font_size", 12)
	_hand_tip.add_theme_color_override("font_color", CRArt.COLOR_MUTED)
	_hand_tip.visible = false
	var tip_idx := _hand_row.get_index() + 1
	_hand_row.get_parent().add_child(_hand_tip)
	_hand_row.get_parent().move_child(_hand_tip, tip_idx)

	_build_inspect_panel()


func _build_inspect_panel() -> void:
	_inspect = ColorRect.new()
	_inspect.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	_inspect.color = Color(0.02, 0.03, 0.06, 0.82)
	_inspect.visible = false
	_inspect.gui_input.connect(func(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and ev.pressed:
			_hide_inspect()
	)
	add_child(_inspect)

	var panel := Panel.new()
	panel.set_anchors_preset(PRESET_CENTER)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	panel.offset_left = -300
	panel.offset_right = 300
	panel.offset_top = -340
	panel.offset_bottom = 340
	var hud_tex := CRArt.ui("ui-hud-panel.png")
	if hud_tex:
		panel.add_theme_stylebox_override("panel", CRArt.nine_slice_style(hud_tex, 40))
	else:
		var flat := StyleBoxFlat.new()
		flat.bg_color = Color("0c1220")
		flat.set_corner_radius_all(16)
		flat.border_color = CRArt.COLOR_CYAN
		flat.set_border_width_all(2)
		panel.add_theme_stylebox_override("panel", flat)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_inspect.add_child(panel)

	var m := MarginContainer.new()
	m.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	m.add_theme_constant_override("margin_left", 20)
	m.add_theme_constant_override("margin_right", 20)
	m.add_theme_constant_override("margin_top", 18)
	m.add_theme_constant_override("margin_bottom", 18)
	panel.add_child(m)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	m.add_child(col)

	_inspect_owner = Label.new()
	_inspect_owner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_inspect_owner.add_theme_font_override("font", CRArt.bold_font())
	_inspect_owner.add_theme_font_size_override("font_size", 13)
	_inspect_owner.add_theme_color_override("font_color", CRArt.COLOR_MUTED)
	col.add_child(_inspect_owner)

	_inspect_face = CRCardFace.new()
	_inspect_face.custom_minimum_size = Vector2(220, 340)
	_inspect_face.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	col.add_child(_inspect_face)

	_inspect_title = Label.new()
	_inspect_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_inspect_title.add_theme_font_override("font", CRArt.title_font())
	_inspect_title.add_theme_font_size_override("font_size", 22)
	_inspect_title.add_theme_color_override("font_color", CRArt.COLOR_TEXT)
	col.add_child(_inspect_title)

	_inspect_meta = Label.new()
	_inspect_meta.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_inspect_meta.add_theme_font_override("font", CRArt.body_font())
	_inspect_meta.add_theme_font_size_override("font_size", 13)
	_inspect_meta.add_theme_color_override("font_color", CRArt.COLOR_CYAN)
	col.add_child(_inspect_meta)

	_inspect_ability = Label.new()
	_inspect_ability.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_inspect_ability.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_inspect_ability.add_theme_font_override("font", CRArt.body_font())
	_inspect_ability.add_theme_font_size_override("font_size", 14)
	_inspect_ability.add_theme_color_override("font_color", CRArt.COLOR_TEXT)
	col.add_child(_inspect_ability)

	var close := _make_tex_button("CLOSE / TAP OUTSIDE", CRArt.ui("ui-btn-ghost.png"), Vector2(280, 52))
	close.pressed.connect(_hide_inspect)
	col.add_child(close)

	var hint := Label.new()
	hint.text = "Tip: tap any board card to inspect"
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.add_theme_font_override("font", CRArt.body_font())
	hint.add_theme_font_size_override("font_size", 11)
	hint.add_theme_color_override("font_color", CRArt.COLOR_MUTED)
	col.add_child(hint)


func _show_inspect(def_id: String, opts: Dictionary = {}) -> void:
	var def: Dictionary = CRCards.get_card(def_id)
	var owner := str(opts.get("owner", ""))
	var power := int(opts.get("power", -1))
	_inspect_face.setup(def_id, {
		"owner": owner,
		"power": power,
		"compact": false,
	})
	_inspect_title.text = str(def["name"])
	_inspect_meta.text = "%s · COST %d · PWR %d · %s" % [
		CRCards.node_title(str(def["node"])),
		int(def["cost"]),
		power if power >= 0 else int(def["power"]),
		CRCards.arrows_hint(def),
	]
	_inspect_ability.text = CRCards.ability_text(def)
	if owner == "enemy":
		_inspect_owner.text = "OPPONENT CARD"
		_inspect_owner.add_theme_color_override("font_color", CRArt.COLOR_ENEMY)
	elif owner == "player":
		_inspect_owner.text = "YOUR CARD"
		_inspect_owner.add_theme_color_override("font_color", CRArt.COLOR_CYAN)
	else:
		_inspect_owner.text = "CARD INFO"
		_inspect_owner.add_theme_color_override("font_color", CRArt.COLOR_MUTED)
	_inspect_open = true
	_inspect.visible = true


func _hide_inspect() -> void:
	_inspect_open = false
	_inspect.visible = false


func _make_tex_button(text: String, tex: Texture2D, min_size: Vector2 = Vector2(180, 56)) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = min_size
	b.add_theme_font_override("font", CRArt.title_font())
	b.add_theme_font_size_override("font_size", 18)
	b.add_theme_color_override("font_color", CRArt.COLOR_TEXT)
	b.add_theme_color_override("font_hover_color", CRArt.COLOR_CYAN)
	if tex:
		var sb := CRArt.nine_slice_style(tex, 32)
		b.add_theme_stylebox_override("normal", sb)
		var sbh := sb.duplicate()
		b.add_theme_stylebox_override("hover", sbh)
		b.add_theme_stylebox_override("pressed", sb)
	return b


func _make_faction_button(faction: String, label: String) -> Button:
	var b := _make_tex_button(label, CRArt.ui("ui-btn-ghost.png"), Vector2(360, 70))
	b.icon = CRArt.faction_tex(faction)
	b.expand_icon = true
	b.add_theme_constant_override("icon_max_width", 40)
	b.pressed.connect(_on_faction.bind(faction))
	return b


func _build_board_cells() -> void:
	while _board_grid.get_child_count() > 0:
		var c := _board_grid.get_child(0)
		_board_grid.remove_child(c)
		c.free()
	_tile_btns.clear()
	for row in CRTypes.ROWS:
		for col in CRTypes.COLS:
			var holder := Panel.new()
			holder.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			holder.size_flags_vertical = Control.SIZE_EXPAND_FILL
			holder.custom_minimum_size = Vector2(150, 160)
			var empty_tex := CRArt.ui("ui-tile-empty.png")
			if empty_tex:
				holder.add_theme_stylebox_override("panel", CRArt.nine_slice_style(empty_tex, 24))
			else:
				var flat := StyleBoxFlat.new()
				flat.bg_color = Color("0a0d14")
				flat.border_color = Color(CRArt.COLOR_CYAN, 0.25)
				flat.set_border_width_all(1)
				flat.set_corner_radius_all(10)
				holder.add_theme_stylebox_override("panel", flat)

			var btn := Button.new()
			btn.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
			btn.flat = true
			btn.focus_mode = Control.FOCUS_NONE
			btn.pressed.connect(_on_tile.bind(col, row))
			holder.add_child(btn)

			var face := CRCardFace.new()
			face.set_anchors_and_offsets_preset(PRESET_FULL_RECT)
			face.offset_left = 6
			face.offset_top = 6
			face.offset_right = -6
			face.offset_bottom = -6
			face.visible = false
			face.mouse_filter = Control.MOUSE_FILTER_IGNORE
			holder.add_child(face)

			_board_grid.add_child(holder)
			_tile_btns.append({"holder": holder, "btn": btn, "face": face, "col": col, "row": row})


func _cell_center_global(pos: Vector2i) -> Vector2:
	for t in _tile_btns:
		if int(t["col"]) == pos.x and int(t["row"]) == pos.y:
			var holder: Control = t["holder"]
			return holder.get_global_rect().get_center() - _fx.global_position
	return Vector2(size.x * 0.5, size.y * 0.4)


func _process(dt: float) -> void:
	if match_state.phase == "playing":
		match_state.tick_timer(dt)
		_hud_timer.text = "%ds" % int(ceil(match_state.turn_seconds_left))
	elif match_state.phase == "ai_thinking":
		ai_delay -= dt
		if ai_delay <= 0.0:
			_run_ai_turn()


func _run_ai_turn() -> void:
	var move: Dictionary = CRAi.choose_move(match_state)
	if move.get("pass", false):
		match_state.pass_turn()
		selected_hand = -1
		ai_delay = 0.55
		return
	var result: Dictionary = match_state.play_card(int(move["hand_index"]), move["pos"], true)
	selected_hand = -1
	ai_delay = 0.55
	if bool(result.get("ok", false)):
		_start_cascade(result.get("events", []), CRArt.COLOR_ENEMY)
	else:
		match_state.finish_cascade()


func _start_cascade(events: Array, color: Color) -> void:
	_skip_btn.visible = true
	_fx.start(events, color)
	_refresh()


func _on_cascade_finished() -> void:
	_skip_btn.visible = false
	match_state.finish_cascade()
	selected_hand = -1
	ai_delay = 0.55


func _on_play() -> void:
	match_state.phase = "faction_pick"
	_refresh()


func _on_faction(faction: String) -> void:
	match_state.start_match(faction, CRAi.pick_enemy_faction(faction))
	selected_hand = -1
	ai_delay = 0.55
	_you_icon.texture = CRArt.faction_tex(faction)
	_opp_icon.texture = CRArt.faction_tex(str(match_state.players["enemy"]["faction"]))


func _on_tile(col: int, row: int) -> void:
	if _inspect_open:
		_hide_inspect()
		return
	if match_state.phase == "match_over" or match_state.phase == "menu" or match_state.phase == "faction_pick":
		return
	var cell = match_state.board[row][col]
	if cell != null:
		_show_inspect(str(cell["def_id"]), {
			"owner": str(cell["owner"]),
			"power": int(cell["power"]),
		})
		return
	if match_state.phase != "playing":
		return
	if selected_hand < 0:
		return
	var result: Dictionary = match_state.play_card(selected_hand, Vector2i(col, row), true)
	if bool(result.get("ok", false)):
		selected_hand = -1
		_start_cascade(result.get("events", []), CRArt.COLOR_CYAN)


func _on_hand(idx: int) -> void:
	if match_state.phase != "playing":
		return
	if selected_hand == idx:
		# Second tap on same hand card → full inspect
		var hand: Array = match_state.players["player"]["hand"]
		if idx >= 0 and idx < hand.size():
			_show_inspect(str(hand[idx]), {"owner": "player"})
		return
	selected_hand = idx
	_refresh_hand()
	_refresh_hand_tip()


func _refresh_hand_tip() -> void:
	if selected_hand < 0 or match_state.phase != "playing":
		_hand_tip.visible = false
		return
	var hand: Array = match_state.players["player"]["hand"]
	if selected_hand >= hand.size():
		_hand_tip.visible = false
		return
	var def: Dictionary = CRCards.get_card(str(hand[selected_hand]))
	_hand_tip.text = "%s — %s  ·  tap again for details · tap empty tile to place · tap enemy card to inspect" % [
		str(def["name"]),
		CRCards.ability_text(def),
	]
	_hand_tip.visible = true


func _on_overlay_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and match_state.phase == "match_over":
		match_state.create_menu()
		selected_hand = -1


func _refresh() -> void:
	_sync_music()
	var sc: Dictionary = match_state.scores()
	_hud_you.text = str(sc["player"])
	_hud_opp.text = str(sc["enemy"])
	_hud_round.text = "ROUND %d/6" % match_state.round_n
	_hud_timer.text = "%ds" % int(ceil(match_state.turn_seconds_left))
	_energy_bar.max_value = maxi(1, match_state.energy_max)
	_energy_bar.value = match_state.energy
	_energy_label.text = "ENERGY %d/%d" % [match_state.energy, match_state.energy_max]

	var in_menu: bool = match_state.phase == "menu" or match_state.phase == "faction_pick"
	var cascading: bool = match_state.phase == "cascading" or _fx.playing
	_menu.visible = in_menu
	_play_btn.visible = match_state.phase == "menu"
	_faction_box.visible = match_state.phase == "faction_pick"
	_board_panel.visible = not in_menu
	_hand_row.visible = not in_menu and match_state.phase != "match_over"
	_pass_btn.visible = match_state.phase == "playing"
	_skip_btn.visible = cascading
	_hud_panel.visible = not in_menu or match_state.phase == "faction_pick"
	_energy_label.visible = not in_menu
	_energy_bar.visible = not in_menu
	_logo.visible = in_menu
	_subtitle.visible = in_menu
	_overlay.visible = match_state.phase == "match_over"
	if match_state.phase == "match_over":
		match match_state.winner:
			"player":
				_overlay_label.text = "VICTORY\n%d — %d\nTAP TO CONTINUE" % [sc["player"], sc["enemy"]]
			"enemy":
				_overlay_label.text = "DEFEAT\n%d — %d\nTAP TO CONTINUE" % [sc["player"], sc["enemy"]]
			_:
				_overlay_label.text = "DRAW\n%d — %d\nTAP TO CONTINUE" % [sc["player"], sc["enemy"]]

	if not in_menu:
		_you_icon.texture = CRArt.faction_tex(str(match_state.players["player"]["faction"]))
		_opp_icon.texture = CRArt.faction_tex(str(match_state.players["enemy"]["faction"]))

	_refresh_board()
	_refresh_hand()
	_refresh_hand_tip()
	if match_state.phase == "menu" or match_state.phase == "faction_pick" or match_state.phase == "match_over":
		_hide_inspect()


func _refresh_board() -> void:
	for t in _tile_btns:
		var face = t["face"]
		var cell = match_state.board[int(t["row"])][int(t["col"])]
		if cell == null:
			face.visible = false
		else:
			face.visible = true
			face.setup(str(cell["def_id"]), {
				"owner": str(cell["owner"]),
				"power": int(cell["power"]),
				"compact": true,
			})


func _refresh_hand() -> void:
	while _hand_row.get_child_count() > 0:
		var c := _hand_row.get_child(0)
		_hand_row.remove_child(c)
		c.free()
	if match_state.phase == "menu" or match_state.phase == "faction_pick":
		return
	var hand: Array = match_state.players["player"]["hand"]
	for hi in hand.size():
		var def: Dictionary = CRCards.get_card(str(hand[hi]))
		var face := CRCardFace.new()
		face.custom_minimum_size = Vector2(155, 250)
		var affordable: bool = int(def["cost"]) <= match_state.energy
		face.setup(str(hand[hi]), {
			"owner": "player",
			"selected": hi == selected_hand,
			"dimmed": match_state.phase != "playing" or not affordable,
			"interactive": match_state.phase == "playing",
			"disabled": match_state.phase != "playing" or not affordable,
		})
		face.pressed_card.connect(_on_hand.bind(hi))
		_hand_row.add_child(face)

func _setup_music() -> void:
	_music = AudioStreamPlayer.new()
	_music.volume_db = -8.0
	add_child(_music)


func _sync_music() -> void:
	if _music == null:
		return
	var bed := "menu"
	if match_state.phase != "menu" and match_state.phase != "faction_pick":
		bed = "match"
	if _music_bed == bed and _music.playing:
		return
	var path := "res://assets/audio/glitch-circuit-a.mp3" if bed == "menu" else "res://assets/audio/glitch-circuit-b.mp3"
	var stream = load(path)
	if stream == null:
		return
	if stream is AudioStreamMP3:
		(stream as AudioStreamMP3).loop = true
	_music.stream = stream
	_music_bed = bed
	_music.play()
