class_name EditorValidator
extends RefCounted
## Authoring validation: Align solvability + object-graph sanity checks.
## Issues are structured for the Issues panel UI.

class Issue:
	extends RefCounted
	var code: StringName = &""
	var severity: StringName = &"error" ## error | warning | info
	var message: String = ""
	var cell: Vector2i = Vector2i(-1, -1)

	func _init(p_code: StringName, p_message: String, p_severity: StringName = &"error", p_cell: Vector2i = Vector2i(-1, -1)) -> void:
		code = p_code
		message = p_message
		severity = p_severity
		cell = p_cell

	func to_dict() -> Dictionary:
		return {
			"code": String(code),
			"severity": String(severity),
			"message": message,
			"cell": {"x": cell.x, "y": cell.y},
		}


var solver: PuzzleSolver = null
var align_validator: PuzzleValidator = null


func _init(p_solver: PuzzleSolver = null) -> void:
	solver = p_solver if p_solver else PuzzleSolver.new()
	align_validator = PuzzleValidator.new(solver)


func validate(doc: EditorDocument) -> Dictionary:
	return validate_detailed(doc)


func validate_detailed(doc: EditorDocument) -> Dictionary:
	var issues: Array = []
	if doc == null:
		issues.append(Issue.new(&"null_document", "No document loaded."))
		return _pack(issues, null)

	_check_empty(doc, issues)
	_check_start_equals_goal(doc, issues)
	var solve := _check_align_solvable(doc, issues)
	_check_teleporters(doc, issues)
	_check_doors_channels(doc, issues)
	_check_lasers(doc, issues)
	_check_orphans(doc, issues)
	return _pack(issues, solve)


func _check_empty(doc: EditorDocument, issues: Array) -> void:
	var start_empty := true
	var goal_empty := true
	for c in doc.start_cells:
		if not c.is_empty() and not String(c.occupant_id).is_empty():
			start_empty = false
			break
	for c in doc.goal_cells:
		if not c.is_empty() and not String(c.occupant_id).is_empty():
			goal_empty = false
			break
	if start_empty:
		issues.append(Issue.new(&"empty_start", "Start board has no occupants.", &"error"))
	if goal_empty:
		issues.append(Issue.new(&"empty_goal", "Goal board has no occupants.", &"error"))


func _check_start_equals_goal(doc: EditorDocument, issues: Array) -> void:
	var a := doc.occupants_packed(EditorDocument.Layer.START)
	var b := doc.occupants_packed(EditorDocument.Layer.GOAL)
	if a.size() != b.size():
		return
	var same := true
	for i in a.size():
		if a[i] != b[i]:
			same = false
			break
	if same:
		issues.append(Issue.new(&"start_equals_goal", "Start already matches goal (already solved).", &"error"))


func _check_align_solvable(doc: EditorDocument, issues: Array) -> SolveResult:
	var puzzle := doc.to_puzzle_def()
	if not puzzle.is_well_formed():
		issues.append(Issue.new(&"malformed", "Puzzle dimensions do not match occupant arrays.", &"error"))
		return null
	## Skip heavy solve when empty / already solved flagged.
	for issue in issues:
		var code: StringName = issue.code
		if code in [&"empty_start", &"empty_goal", &"start_equals_goal"]:
			return null
	solver.node_cap = PuzzleGenEnums.DEFAULT_SOLVER_NODE_CAP
	var solve := solver.solve(puzzle.build_start_state(), puzzle.build_goal_state())
	if solve.solved:
		issues.append(
			Issue.new(
				&"solvable",
				"Solvable in %d move(s)%s." % [solve.length, " (exact)" if solve.optimal_is_exact else ""],
				&"info"
			)
		)
	elif solve.timed_out:
		issues.append(Issue.new(&"solver_timeout", "Solver timed out — may still be solvable.", &"warning"))
	else:
		issues.append(Issue.new(&"unsolvable", "No solution found within search limits.", &"error"))
	return solve


func _check_teleporters(doc: EditorDocument, issues: Array) -> void:
	var links: Dictionary = {} ## link_id -> Array[Vector2i]
	_collect_component_cells(doc, &"teleporter", "link_id", links)
	for link_id in links.keys():
		var cells: Array = links[link_id]
		if cells.size() == 1:
			var p: Vector2i = cells[0]
			issues.append(
				Issue.new(
					&"orphan_teleporter",
					"Teleporter link '%s' has only one pad." % link_id,
					&"error",
					p
				)
			)
		elif cells.size() > 2:
			issues.append(
				Issue.new(
					&"teleporter_overlinked",
					"Teleporter link '%s' has %d pads (expected 2)." % [link_id, cells.size()],
					&"warning",
					cells[0]
				)
			)


func _check_doors_channels(doc: EditorDocument, issues: Array) -> void:
	var door_channels: Dictionary = {}
	var switch_channels: Dictionary = {}
	_scan_channel(doc, &"door", "channel", door_channels)
	_scan_channel(doc, &"switch", "channel", switch_channels)
	_scan_channel(doc, &"pressure_plate", "channel", switch_channels)
	_scan_channel(doc, &"laser_receiver", "channel", switch_channels)

	for ch in door_channels.keys():
		if String(ch).is_empty():
			for p in door_channels[ch]:
				issues.append(Issue.new(&"door_without_channel", "Door has empty channel.", &"error", p))
		elif not switch_channels.has(ch):
			var p2: Vector2i = door_channels[ch][0]
			issues.append(
				Issue.new(
					&"door_unpowered",
					"Door channel '%s' has no switch / plate / receiver." % ch,
					&"warning",
					p2
				)
			)


func _check_lasers(doc: EditorDocument, issues: Array) -> void:
	var emitters: Array[Vector2i] = []
	var receivers: Array[Vector2i] = []
	for layer in [EditorDocument.Layer.START]:
		for y in doc.height:
			for x in doc.width:
				var cell := doc.get_cell(x, y, layer)
				var def := str(cell.puzzle.get("def", ""))
				if def == "laser_emitter":
					emitters.append(Vector2i(x, y))
				elif def == "laser_receiver":
					receivers.append(Vector2i(x, y))
	if emitters.is_empty() and not receivers.is_empty():
		issues.append(Issue.new(&"receiver_no_emitter", "Laser receiver(s) present but no emitter.", &"warning", receivers[0]))
	if not emitters.is_empty() and receivers.is_empty():
		issues.append(Issue.new(&"emitter_no_receiver", "Laser emitter(s) present but no receiver.", &"warning", emitters[0]))
	## Blocked emitter: immediate wall neighbour in facing dir is a soft warning.
	for e in emitters:
		var cell := doc.get_cell(e.x, e.y)
		var st: Variant = cell.puzzle.get("state", {})
		var dir := 0
		if st is Dictionary and st.has("laser_emitter"):
			var bucket: Variant = st["laser_emitter"]
			if bucket is Dictionary:
				dir = int(bucket.get("dir", 0))
		## Default params from catalog use dir in component params — check puzzle state or def.
		var blocked := _laser_immediately_blocked(doc, e, dir)
		if blocked:
			issues.append(
				Issue.new(&"laser_no_path", "Emitter at (%d,%d) may have no clear beam path." % [e.x, e.y], &"warning", e)
			)


func _check_orphans(doc: EditorDocument, issues: Array) -> void:
	## Switch with no matching door is a soft warning.
	var door_channels: Dictionary = {}
	var switch_channels: Dictionary = {}
	_scan_channel(doc, &"door", "channel", door_channels)
	_scan_channel(doc, &"switch", "channel", switch_channels)
	for ch in switch_channels.keys():
		if String(ch).is_empty():
			continue
		if not door_channels.has(ch):
			issues.append(
				Issue.new(
					&"orphan_switch",
					"Switch channel '%s' has no door." % ch,
					&"warning",
					switch_channels[ch][0]
				)
			)


func _laser_immediately_blocked(doc: EditorDocument, origin: Vector2i, dir: int) -> bool:
	var delta := Vector2i(1, 0)
	match dir:
		0:
			delta = Vector2i(1, 0) ## E
		1:
			delta = Vector2i(0, 1) ## S
		2:
			delta = Vector2i(-1, 0) ## W
		3:
			delta = Vector2i(0, -1) ## N
	var p := origin + delta
	if not doc.in_bounds(p.x, p.y):
		return true
	var cell := doc.get_cell(p.x, p.y)
	var def := str(cell.puzzle.get("def", ""))
	return def in ["wall", "door", "heavy_door", "mirror", "mirror_backslash", "laser_emitter"]


func _collect_component_cells(doc: EditorDocument, def_id: StringName, param_key: String, into: Dictionary) -> void:
	for y in doc.height:
		for x in doc.width:
			for layer in [EditorDocument.Layer.START, EditorDocument.Layer.GOAL]:
				var cell := doc.get_cell(x, y, layer)
				_ingest_blob(cell.puzzle, def_id, param_key, Vector2i(x, y), into)
				_ingest_blob(cell.floor_puzzle, def_id, param_key, Vector2i(x, y), into)


func _ingest_blob(blob: Dictionary, def_id: StringName, param_key: String, pos: Vector2i, into: Dictionary) -> void:
	if str(blob.get("def", "")) != String(def_id):
		return
	var link := _param_from_blob(blob, String(def_id), param_key)
	if not into.has(link):
		into[link] = []
	into[link].append(pos)


func _scan_channel(doc: EditorDocument, def_id: StringName, param_key: String, into: Dictionary) -> void:
	for y in doc.height:
		for x in doc.width:
			var cell := doc.get_cell(x, y, EditorDocument.Layer.START)
			for blob in [cell.puzzle, cell.floor_puzzle]:
				if str(blob.get("def", "")) != String(def_id):
					continue
				## Prefer runtime state, else catalog default channel via known defaults.
				var ch := _param_from_blob(blob, String(def_id), param_key)
				if ch == "" and String(def_id) in ["door", "switch", "pressure_plate", "laser_receiver"]:
					ch = "door"
				if not into.has(ch):
					into[ch] = []
				into[ch].append(Vector2i(x, y))


func _param_from_blob(blob: Dictionary, component_id: String, key: String) -> String:
	var st: Variant = blob.get("state", {})
	if st is Dictionary and st.has(component_id):
		var bucket: Variant = st[component_id]
		if bucket is Dictionary and bucket.has(key):
			return str(bucket[key])
	## Catalog defaults live only on defs — editor blobs may omit state.
	return str(blob.get(key, ""))


func _pack(issues: Array, solve: SolveResult) -> Dictionary:
	var errors := 0
	var warnings := 0
	var list: Array = []
	for issue in issues:
		list.append(issue.to_dict())
		if issue.severity == &"error":
			errors += 1
		elif issue.severity == &"warning":
			warnings += 1
	return {
		"ok": errors == 0,
		"errors": errors,
		"warnings": warnings,
		"issues": list,
		"solve": solve,
	}
