class_name BoardConfig
extends Resource
## Authoring / runtime setup for a board instance (any width × height).

@export var width: int = 4:
	set(v):
		width = maxi(1, v)

@export var height: int = 4:
	set(v):
		height = maxi(1, v)

@export var history_capacity: int = BoardEnums.DEFAULT_HISTORY_CAPACITY:
	set(v):
		history_capacity = maxi(8, v)

@export var checkpoint_interval: int = BoardEnums.DEFAULT_CHECKPOINT_INTERVAL:
	set(v):
		checkpoint_interval = maxi(1, v)

## Optional catalog ids available on this board (documentation / tooling).
@export var allowed_occupant_ids: Array[StringName] = []
@export var allowed_modifier_ids: Array[StringName] = []


func to_dict() -> Dictionary:
	return {
		"width": width,
		"height": height,
		"history_capacity": history_capacity,
		"checkpoint_interval": checkpoint_interval,
		"allowed_occupant_ids": _names_to_strings(allowed_occupant_ids),
		"allowed_modifier_ids": _names_to_strings(allowed_modifier_ids),
	}


static func from_dict(data: Dictionary) -> BoardConfig:
	var c := BoardConfig.new()
	c.width = int(data.get("width", 4))
	c.height = int(data.get("height", 4))
	c.history_capacity = int(data.get("history_capacity", BoardEnums.DEFAULT_HISTORY_CAPACITY))
	c.checkpoint_interval = int(data.get("checkpoint_interval", BoardEnums.DEFAULT_CHECKPOINT_INTERVAL))
	c.allowed_occupant_ids = _strings_to_names(data.get("allowed_occupant_ids", []))
	c.allowed_modifier_ids = _strings_to_names(data.get("allowed_modifier_ids", []))
	return c


static func _names_to_strings(arr: Array) -> Array:
	var out: Array = []
	for item in arr:
		out.append(String(item))
	return out


static func _strings_to_names(arr: Variant) -> Array[StringName]:
	var out: Array[StringName] = []
	if arr is Array:
		for item in arr:
			out.append(StringName(str(item)))
	return out
