class_name MoveHistory
extends RefCounted
## Undo/redo optimized for thousands of moves.
##
## Memory strategy:
## - Ring buffer of compact HistoryEntry (command dict â‰ˆ 40â€“80 B + rare SET_TILE delta).
## - Capacity C â‡’ O(C) memory, independent of total lifetime moves.
## - Periodic BoardState checkpoints every `checkpoint_interval` applied commands
##   (ring of snapshots) for fast rebuild / non-invertible future ops â€” NOT used per move.
## - Undo/redo of shift/rotate: O(n) where n = row or column length (inverse command).
## - Never deep-copies the full board on each move.

var capacity: int = BoardEnums.DEFAULT_HISTORY_CAPACITY
var checkpoint_interval: int = BoardEnums.DEFAULT_CHECKPOINT_INTERVAL

## Ring of HistoryEntry
var _entries: Array = []
var _head: int = 0 ## Next write index in ring
var _count: int = 0 ## Entries currently in ring
var _undo_depth: int = 0 ## How many undos from the tip (0 = at tip)

## Checkpoint ring: Dictionary { "seq": int, "state": Dictionary }
var _checkpoints: Array = []
var _checkpoint_capacity: int = 64
var _applied_total: int = 0 ## Lifetime successful applies (for checkpoint seq)


func setup(p_capacity: int = BoardEnums.DEFAULT_HISTORY_CAPACITY, p_checkpoint_interval: int = BoardEnums.DEFAULT_CHECKPOINT_INTERVAL) -> void:
	capacity = maxi(8, p_capacity)
	checkpoint_interval = maxi(1, p_checkpoint_interval)
	_entries.clear()
	_entries.resize(capacity)
	_head = 0
	_count = 0
	_undo_depth = 0
	_checkpoints.clear()
	_applied_total = 0


func clear() -> void:
	setup(capacity, checkpoint_interval)


func can_undo() -> bool:
	return _undoable_count() > 0


func can_redo() -> bool:
	return _undo_depth > 0


func undoable_count() -> int:
	return _undoable_count()


func redoable_count() -> int:
	return _undo_depth


func length() -> int:
	return _count


func _undoable_count() -> int:
	return _count - _undo_depth


func record(
	cmd: BoardCommand,
	previous_tile: BoardTileData = null,
	state_for_checkpoint: BoardState = null,
	previous_tiles: Array = [],
	redo_tiles: Array = [],
	cycle_meta: Dictionary = {}
) -> void:
	## Truncate redo branch.
	if _undo_depth > 0:
		_truncate_redo_branch()

	var entry := HistoryEntry.new()
	entry.command = cmd.duplicate_command()
	entry.previous_tile = previous_tile.duplicate_tile() if previous_tile else null
	for t in previous_tiles:
		if t is BoardTileData:
			entry.previous_tiles.append((t as BoardTileData).duplicate_tile())
	for t2 in redo_tiles:
		if t2 is BoardTileData:
			entry.redo_tiles.append((t2 as BoardTileData).duplicate_tile())
	entry.cycle_meta = cycle_meta.duplicate(true) if not cycle_meta.is_empty() else {}

	_entries[_head] = entry
	_head = (_head + 1) % capacity
	if _count < capacity:
		_count += 1
	# else: oldest overwritten (ring advance drops it)

	_applied_total += 1
	if state_for_checkpoint != null and checkpoint_interval > 0:
		if _applied_total % checkpoint_interval == 0:
			_push_checkpoint(state_for_checkpoint)


func peek_undo() -> HistoryEntry:
	if not can_undo():
		return null
	return _entry_at(_undoable_count() - 1)


func peek_redo() -> HistoryEntry:
	if not can_redo():
		return null
	return _entry_at(_undoable_count())


func mark_undone() -> HistoryEntry:
	if not can_undo():
		return null
	var entry := peek_undo()
	_undo_depth += 1
	return entry


func mark_redone() -> HistoryEntry:
	if not can_redo():
		return null
	var entry := peek_redo()
	_undo_depth -= 1
	return entry


func build_inverse_command(entry: HistoryEntry) -> BoardCommand:
	assert(entry != null and entry.command != null)
	var cmd := entry.command
	if cmd.type == BoardEnums.CommandType.SET_TILE:
		assert(entry.previous_tile != null)
		return BoardCommand.set_tile(entry.previous_tile)
	return cmd.inverse()


func _entry_at(logical_index: int) -> HistoryEntry:
	## logical_index 0 = oldest in ring, _count-1 = newest.
	assert(logical_index >= 0 and logical_index < _count)
	var start := (_head - _count + capacity) % capacity
	var idx := (start + logical_index) % capacity
	return _entries[idx]


func _truncate_redo_branch() -> void:
	## Drop entries after the current undo cursor by shrinking count.
	_count = _undoable_count()
	_head = ((_head - _undo_depth) % capacity + capacity) % capacity
	_undo_depth = 0


func _push_checkpoint(state: BoardState) -> void:
	_checkpoints.append({
		"seq": _applied_total,
		"state": state.to_dict(),
	})
	while _checkpoints.size() > _checkpoint_capacity:
		_checkpoints.pop_front()


func latest_checkpoint() -> Dictionary:
	if _checkpoints.is_empty():
		return {}
	return _checkpoints[_checkpoints.size() - 1]


func to_dict() -> Dictionary:
	var entry_dicts: Array = []
	for i in _count:
		entry_dicts.append(_entry_at(i).to_dict())
	var cps: Array = []
	for cp in _checkpoints:
		cps.append(cp)
	return {
		"capacity": capacity,
		"checkpoint_interval": checkpoint_interval,
		"undo_depth": _undo_depth,
		"applied_total": _applied_total,
		"entries": entry_dicts,
		"checkpoints": cps,
	}


func load_dict(data: Dictionary) -> void:
	capacity = int(data.get("capacity", BoardEnums.DEFAULT_HISTORY_CAPACITY))
	checkpoint_interval = int(data.get("checkpoint_interval", BoardEnums.DEFAULT_CHECKPOINT_INTERVAL))
	setup(capacity, checkpoint_interval)
	_applied_total = int(data.get("applied_total", 0))
	_undo_depth = int(data.get("undo_depth", 0))
	var arr: Variant = data.get("entries", [])
	if arr is Array:
		for item in arr:
			if item is Dictionary:
				var entry := HistoryEntry.from_dict(item)
				_entries[_head] = entry
				_head = (_head + 1) % capacity
				_count += 1
				if _count > capacity:
					_count = capacity
	var cps: Variant = data.get("checkpoints", [])
	if cps is Array:
		_checkpoints = cps.duplicate(true)
	# Clamp undo depth
	if _undo_depth > _count:
		_undo_depth = _count


## Approximate bytes if every entry were a shift command (for docs / telemetry).
func estimate_memory_bytes() -> int:
	# Rough: ~64 B command + 32 B overhead per entry + checkpoints
	var entry_bytes := _count * 96
	var cp_bytes := 0
	for cp in _checkpoints:
		if cp is Dictionary and cp.has("state"):
			# Rough tile dump estimate
			var st: Variant = cp["state"]
			if st is Dictionary:
				var cells: Variant = st.get("cells", [])
				if cells is Array:
					cp_bytes += cells.size() * 128
	return entry_bytes + cp_bytes
