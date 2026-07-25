class_name InputRemapProfile
extends Resource
## Remappable gamepad / keyboard bindings. Apply via InputMap at runtime.

@export var profile_name: String = "default"
## action -> Array of event dictionaries (serialized InputEvent)
@export var bindings: Dictionary = {}


static func make_default() -> InputRemapProfile:
	var p := InputRemapProfile.new()
	p.profile_name = "default"
	p.bindings = {
		"ui_accept": [{"type": "joy", "button": JOY_BUTTON_A}, {"type": "key", "keycode": KEY_ENTER}],
		"ui_cancel": [{"type": "joy", "button": JOY_BUTTON_B}, {"type": "key", "keycode": KEY_ESCAPE}],
		"shift_row_left": [{"type": "key", "keycode": KEY_Q}, {"type": "joy", "button": JOY_BUTTON_B}],
		"shift_row_right": [{"type": "key", "keycode": KEY_E}, {"type": "joy", "button": JOY_BUTTON_A}],
		"shift_col_up": [{"type": "key", "keycode": KEY_R}, {"type": "joy", "button": JOY_BUTTON_Y}],
		"shift_col_down": [{"type": "key", "keycode": KEY_F}],
		"board_undo": [{"type": "key", "keycode": KEY_Z}, {"type": "joy", "button": JOY_BUTTON_X}],
	}
	return p


func apply_to_input_map() -> void:
	for action in bindings.keys():
		var name := String(action)
		if not InputMap.has_action(name):
			InputMap.add_action(name)
		InputMap.action_erase_events(name)
		var list: Variant = bindings[action]
		if not (list is Array):
			continue
		for item in list:
			if not (item is Dictionary):
				continue
			var ev := _event_from_dict(item)
			if ev:
				InputMap.action_add_event(name, ev)


func _event_from_dict(d: Dictionary) -> InputEvent:
	match str(d.get("type", "")):
		"key":
			var k := InputEventKey.new()
			k.keycode = int(d.get("keycode", 0)) as Key
			return k
		"joy":
			var j := InputEventJoypadButton.new()
			j.button_index = int(d.get("button", 0)) as JoyButton
			return j
	return null
