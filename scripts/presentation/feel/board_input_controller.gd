class_name BoardInputController
extends Node
## Unified input → board intents. Touch/mouse swipe, keyboard (GDD §20), gamepad.
## Does not talk to BoardSim — emits intents for BoardFeelController to validate/queue.

signal shift_row_intent(row: int, dir: int, steps: int)
signal shift_column_intent(column: int, dir: int, steps: int)
signal selection_changed(row: int, column: int)
signal undo_intent
signal aim_changed(row: int, column: int, axis: StringName) ## axis: &"row" | &"col" | &"both"

enum FocusAxis { BOTH, ROW, COL }

var feel: ShiftFeelConfig = null
var board_view: BoardView = null

var selected_row: int = 0
var selected_col: int = 0
var focus_axis: FocusAxis = FocusAxis.BOTH

var _pressing: bool = false
var _press_pos: Vector2 = Vector2.ZERO
var _press_cell: Vector2i = Vector2i.ZERO
var _consumed_swipe: bool = false


func configure(p_feel: ShiftFeelConfig, p_board: BoardView) -> void:
	feel = p_feel
	board_view = p_board
	if board_view and not board_view.cell_pressed.is_connected(_on_cell_pressed):
		board_view.cell_pressed.connect(_on_cell_pressed)


func _ready() -> void:
	set_process_unhandled_input(true)


func _unhandled_input(event: InputEvent) -> void:
	if board_view == null:
		return

	# --- Pointer swipe (mouse + touch via screen / mouse emulation) ---
	if event is InputEventScreenTouch:
		var st := event as InputEventScreenTouch
		if st.pressed:
			_begin_press(st.position)
		else:
			_end_press(st.position)
		get_viewport().set_input_as_handled()
		return

	if event is InputEventScreenDrag:
		var sd := event as InputEventScreenDrag
		_update_drag(sd.position)
		get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var mb := event as InputEventMouseButton
		if mb.pressed:
			_begin_press(mb.position)
		else:
			_end_press(mb.position)
		return

	if event is InputEventMouseMotion and _pressing:
		_update_drag((event as InputEventMouseMotion).position)
		return

	# --- Project InputMap (see project.godot) ---
	if event.is_action_pressed("shift_row_left"):
		shift_row_intent.emit(selected_row, BoardEnums.Direction.NEGATIVE, 1)
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("shift_row_right"):
		shift_row_intent.emit(selected_row, BoardEnums.Direction.POSITIVE, 1)
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("shift_col_up"):
		shift_column_intent.emit(selected_col, BoardEnums.Direction.NEGATIVE, 1)
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("shift_col_down"):
		shift_column_intent.emit(selected_col, BoardEnums.Direction.POSITIVE, 1)
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("board_undo"):
		undo_intent.emit()
		get_viewport().set_input_as_handled()
		return

	# --- Keyboard (GDD §20.2) ---
	if event is InputEventKey and event.pressed and not event.echo:
		var key := event as InputEventKey
		match key.keycode:
			KEY_LEFT, KEY_A:
				_nudge_selection(-1, 0)
			KEY_RIGHT, KEY_D:
				_nudge_selection(1, 0)
			KEY_UP, KEY_W:
				_nudge_selection(0, -1)
			KEY_DOWN, KEY_S:
				_nudge_selection(0, 1)
			KEY_Q:
				shift_row_intent.emit(selected_row, BoardEnums.Direction.NEGATIVE, 1)
			KEY_E:
				shift_row_intent.emit(selected_row, BoardEnums.Direction.POSITIVE, 1)
			KEY_R:
				shift_column_intent.emit(selected_col, BoardEnums.Direction.NEGATIVE, 1)
			KEY_F:
				shift_column_intent.emit(selected_col, BoardEnums.Direction.POSITIVE, 1)
			KEY_Z:
				undo_intent.emit()
			KEY_TAB:
				focus_axis = ((focus_axis + 1) % 3) as FocusAxis
				_emit_aim()
			_:
				return
		get_viewport().set_input_as_handled()
		return

	# --- Gamepad ---
	if event is InputEventJoypadButton and event.pressed:
		var jb := event as InputEventJoypadButton
		match jb.button_index:
			JOY_BUTTON_DPAD_LEFT:
				_nudge_selection(-1, 0)
			JOY_BUTTON_DPAD_RIGHT:
				_nudge_selection(1, 0)
			JOY_BUTTON_DPAD_UP:
				_nudge_selection(0, -1)
			JOY_BUTTON_DPAD_DOWN:
				_nudge_selection(0, 1)
			JOY_BUTTON_X: # West — undo
				undo_intent.emit()
			JOY_BUTTON_LEFT_SHOULDER, JOY_BUTTON_RIGHT_SHOULDER:
				focus_axis = FocusAxis.ROW if focus_axis != FocusAxis.ROW else FocusAxis.COL
				_emit_aim()
			JOY_BUTTON_A:
				shift_row_intent.emit(selected_row, BoardEnums.Direction.POSITIVE, 1)
			JOY_BUTTON_B:
				shift_row_intent.emit(selected_row, BoardEnums.Direction.NEGATIVE, 1)
			JOY_BUTTON_Y:
				shift_column_intent.emit(selected_col, BoardEnums.Direction.NEGATIVE, 1)
			JOY_BUTTON_RIGHT_STICK: # fallback
				pass
			_:
				return
		get_viewport().set_input_as_handled()

	if event.is_action_pressed("ui_left"):
		shift_row_intent.emit(selected_row, BoardEnums.Direction.NEGATIVE, 1)
	elif event.is_action_pressed("ui_right"):
		shift_row_intent.emit(selected_row, BoardEnums.Direction.POSITIVE, 1)
	elif event.is_action_pressed("ui_up"):
		shift_column_intent.emit(selected_col, BoardEnums.Direction.NEGATIVE, 1)
	elif event.is_action_pressed("ui_down"):
		shift_column_intent.emit(selected_col, BoardEnums.Direction.POSITIVE, 1)


func _begin_press(screen_pos: Vector2) -> void:
	var local := _to_board_local(screen_pos)
	if not _in_board(local):
		_pressing = false
		return
	_pressing = true
	_consumed_swipe = false
	_press_pos = local
	_press_cell = _cell_at(local)
	selected_col = _press_cell.x
	selected_row = _press_cell.y
	_emit_aim()


func _update_drag(screen_pos: Vector2) -> void:
	if not _pressing or _consumed_swipe:
		return
	var local := _to_board_local(screen_pos)
	var delta := local - _press_pos
	var thresh := feel.swipe_threshold_px if feel else 28.0
	if delta.length() < thresh:
		return
	_consumed_swipe = true
	_pressing = false
	var bias := feel.swipe_axis_bias if feel else 0.35
	if absf(delta.x) >= absf(delta.y) * (1.0 + bias):
		var dir := BoardEnums.Direction.POSITIVE if delta.x > 0.0 else BoardEnums.Direction.NEGATIVE
		var steps := maxi(1, int(floor(absf(delta.x) / maxf(board_view.cell_size.x, 1.0))))
		steps = mini(steps, maxi(1, board_view.width - 1))
		shift_row_intent.emit(_press_cell.y, dir, steps)
	else:
		var dir2 := BoardEnums.Direction.POSITIVE if delta.y > 0.0 else BoardEnums.Direction.NEGATIVE
		var steps2 := maxi(1, int(floor(absf(delta.y) / maxf(board_view.cell_size.y, 1.0))))
		steps2 = mini(steps2, maxi(1, board_view.height - 1))
		shift_column_intent.emit(_press_cell.x, dir2, steps2)


func _end_press(screen_pos: Vector2) -> void:
	if not _pressing:
		return
	_pressing = false
	# Tap already handled via cell_pressed; swipe via drag.


func _on_cell_pressed(x: int, y: int) -> void:
	selected_col = x
	selected_row = y
	_emit_aim()


func _nudge_selection(dx: int, dy: int) -> void:
	if board_view == null or board_view.width <= 0:
		return
	selected_col = posmod(selected_col + dx, board_view.width)
	selected_row = posmod(selected_row + dy, board_view.height)
	_emit_aim()


func _emit_aim() -> void:
	selection_changed.emit(selected_row, selected_col)
	var axis := &"both"
	match focus_axis:
		FocusAxis.ROW:
			axis = &"row"
			if board_view:
				board_view.set_selection(selected_row, -1)
		FocusAxis.COL:
			axis = &"col"
			if board_view:
				board_view.set_selection(-1, selected_col)
		_:
			if board_view:
				board_view.set_selection(selected_row, selected_col)
	aim_changed.emit(selected_row, selected_col, axis)


func _to_board_local(screen_pos: Vector2) -> Vector2:
	return board_view.get_global_transform_with_canvas().affine_inverse() * screen_pos


func _in_board(local: Vector2) -> bool:
	var s := board_view.board_pixel_size()
	return local.x >= 0.0 and local.y >= 0.0 and local.x < s.x and local.y < s.y


func _cell_at(local: Vector2) -> Vector2i:
	var stride := board_view.cell_size + Vector2(board_view.gap, board_view.gap)
	var x := clampi(int(local.x / stride.x), 0, board_view.width - 1)
	var y := clampi(int(local.y / stride.y), 0, board_view.height - 1)
	return Vector2i(x, y)
