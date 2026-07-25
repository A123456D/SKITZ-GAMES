class_name BoardView
extends Control
## Renders BoardState as BoardTileView nodes + laser overlay + purple shift band.

const LaserBeamLayerScript := preload("res://scripts/presentation/board/laser_beam_layer.gd")
const PuzzleVisualsScript := preload("res://scripts/presentation/board/puzzle_visuals.gd")

signal cell_pressed(x: int, y: int)

@export var cell_size: Vector2 = Vector2(72, 72)
@export var gap: float = 8.0
@export var tokens: DesignTokens

var width: int = 0
var height: int = 0

var _by_source: Dictionary = {} ## source_index (int) -> BoardTileView
var _at: Dictionary = {} ## Vector2i -> BoardTileView
var _tile_pool: NodePool
var _highlight_row: int = -1
var _highlight_col: int = -1
var _band: Panel
var _arrow_a: Label
var _arrow_b: Label
var laser_layer: Node2D
var echo_layer: Node2D
var quality: VisualQualityConfig = null


func _ready() -> void:
	clip_contents = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	y_sort_enabled = false
	if tokens == null:
		tokens = _load_tokens()
	_tile_pool = NodePool.new(func() -> Node: return BoardTileView.new(), PerfBudgets.TILE_POOL_WARM)
	_build_band()
	laser_layer = LaserBeamLayerScript.new()
	laser_layer.name = "LaserBeams"
	laser_layer.configure(tokens, cell_size, gap)
	add_child(laser_layer)
	if laser_layer.has_signal("receiver_hit") and not laser_layer.receiver_hit.is_connected(_on_receiver_hit):
		laser_layer.receiver_hit.connect(_on_receiver_hit)
	var EchoScript := load("res://scripts/presentation/board/echo_moves_layer.gd") as Script
	if EchoScript:
		echo_layer = EchoScript.new()
		echo_layer.name = "EchoMoves"
		add_child(echo_layer)


func set_quality(p_quality: VisualQualityConfig) -> void:
	quality = p_quality
	if laser_layer and laser_layer.has_method("set_quality"):
		laser_layer.call("set_quality", quality)
	var glow_budget := PerfBudgets.ICON_GLOW_PROCESS_CAP
	if quality and quality.tier == VisualQualityConfig.Tier.LOW:
		glow_budget = 0
	elif quality and quality.tier == VisualQualityConfig.Tier.MEDIUM:
		glow_budget = int(glow_budget * 0.5)
	var glow_n := 0
	for t in _by_source.values():
		var tile := t as BoardTileView
		if tile == null:
			continue
		tile.set_quality(quality)
		## Cap how many tiles keep soft-glow process alive.
		if glow_budget <= 0:
			tile.glow_enabled = false
			tile.set_process(false)
		elif tile.occupant_id != &"" and String(tile.occupant_id) != "":
			glow_n += 1
			if glow_n > glow_budget:
				tile.glow_enabled = false
				tile.set_process(false)
	if echo_layer:
		echo_layer.set("reduce_motion", quality != null and (quality.reduce_motion or quality.tier == VisualQualityConfig.Tier.LOW))


func board_pixel_size() -> Vector2:
	return Vector2(
		float(width) * cell_size.x + float(maxi(0, width - 1)) * gap,
		float(height) * cell_size.y + float(maxi(0, height - 1)) * gap
	)


func cell_position(x: int, y: int) -> Vector2:
	return Vector2(
		float(x) * (cell_size.x + gap),
		float(y) * (cell_size.y + gap)
	)


func tile_at(x: int, y: int) -> BoardTileView:
	return _at.get(Vector2i(x, y), null) as BoardTileView


func tile_for_move(m: TileMove) -> BoardTileView:
	if m == null:
		return null
	if _by_source.has(m.source_index):
		return _by_source[m.source_index] as BoardTileView
	return tile_at(m.from_x, m.from_y)


func rebuild(state: BoardState) -> void:
	_clear_tiles()
	if state == null:
		return
	width = state.width
	height = state.height
	custom_minimum_size = board_pixel_size()
	size = custom_minimum_size
	var need := width * height
	if _tile_pool and _tile_pool.size_free() < need:
		_tile_pool.warm(need)
	for y in height:
		for x in width:
			var td := state.get_tile(x, y)
			var src := y * width + x
			var tile := _acquire_tile()
			var color := _color_for(td.occupant_id, src)
			add_child(tile)
			tile.tokens = tokens
			tile.setup(x, y, td.occupant_id, cell_size, color)
			if quality:
				tile.set_quality(quality)
			tile.position = cell_position(x, y)
			if not tile.pressed_cell.is_connected(_on_tile_pressed):
				tile.pressed_cell.connect(_on_tile_pressed)
			_by_source[src] = tile
			_at[Vector2i(x, y)] = tile
	_raise_overlays()
	_refresh_highlight()
	if laser_layer:
		laser_layer.configure(tokens, cell_size, gap)
		if laser_layer.has_method("set_quality"):
			laser_layer.call("set_quality", quality)
	if echo_layer and echo_layer.has_method("configure"):
		echo_layer.call("configure", tokens, cell_size, gap, width, height)
	if quality:
		set_quality(quality)


func sync_occupants(state: BoardState) -> void:
	if state == null:
		return
	for y in state.height:
		for x in state.width:
			var tile := tile_at(x, y)
			if tile == null:
				continue
			var td := state.get_tile(x, y)
			tile.set_occupant(td.occupant_id, _color_for(td.occupant_id, y * state.width + x))


func rematerialize_indices(moves: Array) -> void:
	for item in moves:
		if not (item is TileMove):
			continue
		var m: TileMove = item
		var tile := tile_for_move(m)
		if tile == null:
			continue
		tile.grid_x = m.to_x
		tile.grid_y = m.to_y
		tile.position = cell_position(m.to_x, m.to_y)
		tile.occupant_id = m.occupant_id

	var new_by_source: Dictionary = {}
	var new_at: Dictionary = {}
	for t in _by_source.values():
		var tile := t as BoardTileView
		if tile == null or not is_instance_valid(tile):
			continue
		var src := tile.grid_y * width + tile.grid_x
		new_by_source[src] = tile
		new_at[Vector2i(tile.grid_x, tile.grid_y)] = tile
	_by_source = new_by_source
	_at = new_at


func set_selection(row: int, col: int) -> void:
	_highlight_row = row
	_highlight_col = col
	_refresh_highlight()


func show_laser_events(events: Array) -> void:
	apply_puzzle_events(events)


func apply_puzzle_events(events: Array) -> void:
	if laser_layer:
		laser_layer.apply_events(events, self)
		_raise_overlays()
	for e in events:
		if not (e is PuzzleEvent):
			continue
		var pe: PuzzleEvent = e
		var tile := tile_at(pe.cell.x, pe.cell.y)
		match pe.kind:
			PuzzleEvent.Kind.DOOR_OPENED:
				if tile:
					tile.set_door_open(true, true)
			PuzzleEvent.Kind.DOOR_CLOSED:
				if tile:
					tile.set_door_open(false, true)
			PuzzleEvent.Kind.SWITCH_TOGGLED:
				if tile:
					var on := bool(pe.payload.get("activated", true))
					tile.set_switch_on(on, true)
			PuzzleEvent.Kind.LASER_RECEIVER_HIT:
				if tile:
					tile.pulse_receiver_hit()
			PuzzleEvent.Kind.OBJECT_DESTROYED, PuzzleEvent.Kind.BURN:
				if tile:
					tile.pulse_glow(1.2, 0.2)
			PuzzleEvent.Kind.OBJECT_SPAWNED:
				var spawn_tile := tile_at(pe.to_cell.x, pe.to_cell.y)
				if spawn_tile:
					spawn_tile.pulse_glow(1.0, 0.16)
			PuzzleEvent.Kind.COUNTDOWN_TICK:
				if tile:
					tile.pulse_glow(0.7, 0.08)


func pulse_connection_land() -> void:
	## Soft band + tile connection snap after a shift lands.
	if _band and _band.visible:
		var tw := create_tween()
		tw.tween_property(_band, "modulate", Color(1.35, 1.2, 1.5, 1.0), 0.05)
		tw.tween_property(_band, "modulate", Color.WHITE, 0.16)
	for t in _by_source.values():
		var tile := t as BoardTileView
		if tile and is_instance_valid(tile) and tile.occupant_id != &"":
			tile.pulse_connection(0.95, 0.14)


func _on_receiver_hit(cell: Vector2i) -> void:
	var tile := tile_at(cell.x, cell.y)
	if tile:
		tile.pulse_receiver_hit()


func clear_lasers() -> void:
	if laser_layer:
		laser_layer.clear_beams()


func _build_band() -> void:
	_band = Panel.new()
	_band.name = "ShiftBand"
	_band.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_band.visible = false
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.66, 0.33, 0.97, 0.20)
	sb.border_color = Color(0.72, 0.48, 1.0, 0.55)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(14)
	sb.shadow_color = Color(0.66, 0.33, 0.97, 0.35)
	sb.shadow_size = 10
	_band.add_theme_stylebox_override("panel", sb)
	add_child(_band)

	_arrow_a = _make_arrow()
	_arrow_b = _make_arrow()
	add_child(_arrow_a)
	add_child(_arrow_b)


func _make_arrow() -> Label:
	var l := Label.new()
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.visible = false
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.add_theme_color_override("font_color", Color(0.85, 0.7, 1.0, 0.95))
	l.add_theme_font_size_override("font_size", 22)
	return l


func _raise_overlays() -> void:
	if echo_layer:
		move_child(echo_layer, get_child_count() - 1)
	if _band:
		move_child(_band, get_child_count() - 1)
	if _arrow_a:
		move_child(_arrow_a, get_child_count() - 1)
	if _arrow_b:
		move_child(_arrow_b, get_child_count() - 1)
	if laser_layer:
		move_child(laser_layer, get_child_count() - 1)


func record_echo(cmd: BoardCommand) -> void:
	if echo_layer and echo_layer.has_method("record_shift"):
		echo_layer.call("record_shift", cmd)


func capture_echo_board(state: BoardState) -> void:
	if echo_layer and echo_layer.has_method("capture_board_state"):
		echo_layer.call("capture_board_state", state)


func _refresh_highlight() -> void:
	if _band == null:
		return
	if _highlight_row < 0 and _highlight_col < 0:
		_band.visible = false
		_arrow_a.visible = false
		_arrow_b.visible = false
		return
	_band.visible = true
	_arrow_a.visible = true
	_arrow_b.visible = true
	var band_col := tokens.shift_band if tokens else Color(0.66, 0.33, 0.97, 0.22)
	var sb := _band.get_theme_stylebox("panel") as StyleBoxFlat
	if sb:
		sb.bg_color = band_col
	if _highlight_row >= 0 and _highlight_col < 0:
		_band.position = cell_position(0, _highlight_row) - Vector2(4, 2)
		_band.size = Vector2(board_pixel_size().x + 8, cell_size.y + 4)
		_arrow_a.text = "←"
		_arrow_b.text = "→"
		_arrow_a.position = _band.position + Vector2(-4, cell_size.y * 0.2)
		_arrow_b.position = _band.position + Vector2(_band.size.x - 20, cell_size.y * 0.2)
		_arrow_a.size = Vector2(28, cell_size.y * 0.6)
		_arrow_b.size = Vector2(28, cell_size.y * 0.6)
	elif _highlight_col >= 0 and _highlight_row < 0:
		_band.position = cell_position(_highlight_col, 0) - Vector2(2, 4)
		_band.size = Vector2(cell_size.x + 4, board_pixel_size().y + 8)
		_arrow_a.text = "↑"
		_arrow_b.text = "↓"
		_arrow_a.position = _band.position + Vector2(cell_size.x * 0.2, -4)
		_arrow_b.position = _band.position + Vector2(cell_size.x * 0.2, _band.size.y - 24)
		_arrow_a.size = Vector2(cell_size.x * 0.6, 28)
		_arrow_b.size = Vector2(cell_size.x * 0.6, 28)
	else:
		_band.position = Vector2.ZERO
		_band.size = board_pixel_size()
		_arrow_a.visible = false
		_arrow_b.visible = false


func _color_for(occupant: StringName, _salt: int) -> Color:
	return PuzzleVisualsScript.color_for(occupant, tokens)


func _acquire_tile() -> BoardTileView:
	if _tile_pool == null:
		_tile_pool = NodePool.new(func() -> Node: return BoardTileView.new(), PerfBudgets.TILE_POOL_WARM)
	var tile := _tile_pool.acquire() as BoardTileView
	if tile == null:
		tile = BoardTileView.new()
	tile.visible = true
	return tile


func _clear_tiles() -> void:
	for t in _by_source.values():
		var tile := t as BoardTileView
		if tile == null or not is_instance_valid(tile):
			continue
		if tile.pressed_cell.is_connected(_on_tile_pressed):
			tile.pressed_cell.disconnect(_on_tile_pressed)
		tile.reset_for_pool()
		if _tile_pool:
			_tile_pool.release(tile)
		elif tile.get_parent():
			tile.get_parent().remove_child(tile)
			tile.queue_free()
	_by_source.clear()
	_at.clear()


func _on_tile_pressed(tile: BoardTileView) -> void:
	cell_pressed.emit(tile.grid_x, tile.grid_y)


func _load_tokens() -> DesignTokens:
	var path := "res://resources/configs/visual/default_design_tokens.tres"
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is DesignTokens:
			return res as DesignTokens
	return DesignTokens.new()


func _exit_tree() -> void:
	if _tile_pool:
		_tile_pool.clear(true)
