class_name StateFingerprint
extends RefCounted
## Compact, deterministic fingerprint of Align occupant layout for dedup / solver keys.

static func from_state(state: BoardState) -> String:
	assert(state != null)
	var parts: PackedStringArray = PackedStringArray()
	parts.append("%d:%d" % [state.width, state.height])
	for c in state.cells:
		parts.append(String(c.occupant_id))
	return "#".join(parts)


static func from_occupants(width: int, height: int, occupants: PackedStringArray) -> String:
	var parts: PackedStringArray = PackedStringArray()
	parts.append("%d:%d" % [width, height])
	for o in occupants:
		parts.append(str(o))
	return "#".join(parts)


## Fast 64-bit-ish mix for Dictionary keys (string still used for catalogs).
static func hash_u64(state: BoardState) -> int:
	var h := 1469598103934665603
	h = _mix(h, state.width)
	h = _mix(h, state.height)
	for c in state.cells:
		h = _mix(h, String(c.occupant_id).hash())
	return h


static func _mix(h: int, v: int) -> int:
	h ^= v
	h = (h * 1099511628211) & 0x7FFFFFFFFFFFFFFF
	return h
