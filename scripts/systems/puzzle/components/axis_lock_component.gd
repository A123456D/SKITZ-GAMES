class_name AxisLockComponent
extends PuzzleComponent
## Constrains an object to ride only certain shift axes.
## horizontal → row shifts carry the object; column shifts cycle other cells around it.
## vertical → column shifts carry; row shifts cycle around it.
## both → no constraint (component present for tagging / queries).
## BoardSim stays pure — AxisLockFilter plans cycle rewrite or reject.

const MODE_HORIZONTAL := &"horizontal"
const MODE_VERTICAL := &"vertical"
const MODE_BOTH := &"both"

var mode: StringName = MODE_HORIZONTAL


func _on_setup() -> void:
	mode = get_param_string_name("mode", MODE_HORIZONTAL)
	if mode != MODE_HORIZONTAL and mode != MODE_VERTICAL and mode != MODE_BOTH:
		mode = MODE_HORIZONTAL


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"axis_lock_mode":
		return mode
	if query_id == &"allows_axis_delta":
		var dx := int(args.get("dx", 0))
		var dy := int(args.get("dy", 0))
		return allows_delta(dx, dy)
	if query_id == &"allows_shift_command":
		return allows_command_type(int(args.get("type", -1)))
	return null


func allows_delta(dx: int, dy: int) -> bool:
	if dx == 0 and dy == 0:
		return true
	match mode:
		MODE_HORIZONTAL:
			return dy == 0
		MODE_VERTICAL:
			return dx == 0
		MODE_BOTH:
			return true
		_:
			return dy == 0


func allows_command_type(command_type: int) -> bool:
	match mode:
		MODE_HORIZONTAL:
			return command_type == BoardEnums.CommandType.SHIFT_ROW
		MODE_VERTICAL:
			return command_type == BoardEnums.CommandType.SHIFT_COLUMN
		MODE_BOTH:
			return true
		_:
			return command_type == BoardEnums.CommandType.SHIFT_ROW


func write_state(state: Dictionary) -> void:
	state["mode"] = String(mode)


func read_state(state: Dictionary) -> void:
	if state.has("mode"):
		mode = StringName(str(state["mode"]))
