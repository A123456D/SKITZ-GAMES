class_name SwitchComponent
extends PuzzleComponent
## Sticky or pulse channel emitter. Toggle latches; pulse adds ephemeral strength for one recompute.

var channel: StringName = &"switch"
var toggle: bool = true
var activated: bool = false
## If true, any presser/movable entering toggles; if false, requires interact tag.
var trigger_on_enter: bool = true
var _pulse_pending: bool = false


func _on_setup() -> void:
	channel = get_param_string_name("channel", &"switch")
	toggle = get_param_bool("toggle", true)
	activated = get_param_bool("start_on", false)
	trigger_on_enter = get_param_bool("trigger_on_enter", true)


func on_setup(ctx: PuzzleContext) -> void:
	if toggle and activated:
		ctx.channels.set_latch(channel, true)


func on_enter(ctx: PuzzleContext, other: PuzzleObject) -> void:
	if not trigger_on_enter or other == null:
		return
	if not _is_presser(other):
		return
	_activate(ctx)


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"switch_activated":
		return activated
	return null


func force_activate(ctx: PuzzleContext) -> void:
	_activate(ctx)


func apply_pulse(ctx: PuzzleContext) -> void:
	if _pulse_pending:
		ctx.channels.add_strength(channel, 1)
		_pulse_pending = false


func _activate(ctx: PuzzleContext) -> void:
	if toggle:
		activated = ctx.channels.toggle_latch(channel)
	else:
		activated = true
		_pulse_pending = true
	ctx.emit(
		PuzzleEvent.make(PuzzleEvent.Kind.SWITCH_TOGGLED, owner_object.cell)
		.with_uid(owner_object.uid)
		.with_channel(channel)
		.with_payload({"activated": activated, "toggle": toggle})
	)


func _is_presser(other: PuzzleObject) -> bool:
	if other.has_component(&"presser") or other.has_component(&"movable") or other.has_component(&"actor"):
		return true
	return other.has_tag("presser") or other.has_tag("player")


func write_state(state: Dictionary) -> void:
	state["activated"] = activated


func read_state(state: Dictionary) -> void:
	if state.has("activated"):
		activated = bool(state["activated"])
