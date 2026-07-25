class_name PuzzleSolver
extends RefCounted
## Bidirectional BFS for Align (row/col circular shifts). Caps node expansion for mobile/CI.

var node_cap: int = PuzzleGenEnums.DEFAULT_SOLVER_NODE_CAP
var max_steps_per_shift: int = 1


func solve(start: BoardState, target: BoardState) -> SolveResult:
	assert(start != null and target != null)
	if start.width != target.width or start.height != target.height:
		return SolveResult.failure(&"size_mismatch")
	var start_occ := AlignStateCodec.from_board(start)
	var goal_occ := AlignStateCodec.from_board(target)
	return solve_occupants(start_occ, goal_occ, start.width, start.height)


func solve_occupants(
	start_occ: PackedStringArray,
	goal_occ: PackedStringArray,
	width: int,
	height: int
) -> SolveResult:
	if AlignStateCodec.equals(start_occ, goal_occ):
		return SolveResult.already_solved()

	var moves := AlignStateCodec.legal_moves(width, height, max_steps_per_shift)
	var result := _bidirectional_bfs(start_occ, goal_occ, width, height, moves)
	result.branching_estimate = float(moves.size())
	return result


func _bidirectional_bfs(
	start_occ: PackedStringArray,
	goal_occ: PackedStringArray,
	width: int,
	height: int,
	moves: Array[BoardCommand]
) -> SolveResult:
	var start_key := AlignStateCodec.key(start_occ)
	var goal_key := AlignStateCodec.key(goal_occ)

	# parent[key] = previous key; cmd_to[key] = command that produced key from parent.
	var f_parent: Dictionary = {start_key: ""}
	var f_cmd: Dictionary = {}
	var f_occ: Dictionary = {start_key: start_occ}
	var f_queue: Array[String] = [start_key]

	var b_parent: Dictionary = {goal_key: ""}
	var b_cmd: Dictionary = {}
	var b_occ: Dictionary = {goal_key: goal_occ}
	var b_queue: Array[String] = [goal_key]

	var nodes_expanded := 0
	var nodes_generated := 2
	var meet_key := ""
	var f_head := 0
	var b_head := 0

	while f_head < f_queue.size() and b_head < b_queue.size():
		if nodes_expanded >= node_cap:
			var r := SolveResult.failure(&"node_cap", nodes_expanded)
			r.timed_out = true
			r.nodes_generated = nodes_generated
			return r

		var expand_forward := (f_queue.size() - f_head) <= (b_queue.size() - b_head)
		if expand_forward:
			var key: String = f_queue[f_head]
			f_head += 1
			nodes_expanded += 1
			var occ: PackedStringArray = f_occ[key]
			for cmd in moves:
				var child := AlignStateCodec.apply_cmd(occ, width, height, cmd)
				var ck := AlignStateCodec.key(child)
				if f_parent.has(ck):
					continue
				f_parent[ck] = key
				f_cmd[ck] = cmd
				f_occ[ck] = child
				f_queue.append(ck)
				nodes_generated += 1
				if b_parent.has(ck):
					meet_key = ck
					break
			if meet_key != "":
				break
		else:
			var key2: String = b_queue[b_head]
			b_head += 1
			nodes_expanded += 1
			var occ2: PackedStringArray = b_occ[key2]
			for cmd in moves:
				var child2 := AlignStateCodec.apply_cmd(occ2, width, height, cmd)
				var ck2 := AlignStateCodec.key(child2)
				if b_parent.has(ck2):
					continue
				b_parent[ck2] = key2
				b_cmd[ck2] = cmd
				b_occ[ck2] = child2
				b_queue.append(ck2)
				nodes_generated += 1
				if f_parent.has(ck2):
					meet_key = ck2
					break
			if meet_key != "":
				break

	if meet_key == "":
		var miss := SolveResult.failure(&"unsolved", nodes_expanded)
		miss.nodes_generated = nodes_generated
		miss.timed_out = nodes_expanded >= node_cap
		return miss

	var path := _reconstruct(meet_key, f_parent, f_cmd, b_parent, b_cmd)
	var ok := SolveResult.new()
	ok.solved = true
	ok.optimal_is_exact = true
	ok.path = path
	ok.length = path.size()
	ok.nodes_expanded = nodes_expanded
	ok.nodes_generated = nodes_generated
	return ok


func _reconstruct(
	meet: String,
	f_parent: Dictionary,
	f_cmd: Dictionary,
	b_parent: Dictionary,
	b_cmd: Dictionary
) -> Array[BoardCommand]:
	var path: Array[BoardCommand] = []
	var k := meet
	var fwd_stack: Array[BoardCommand] = []
	while f_parent.has(k) and str(f_parent[k]) != "":
		fwd_stack.append((f_cmd[k] as BoardCommand).duplicate_command())
		k = str(f_parent[k])
	var i := fwd_stack.size() - 1
	while i >= 0:
		path.append(fwd_stack[i])
		i -= 1

	k = meet
	while b_parent.has(k) and str(b_parent[k]) != "":
		var edge: BoardCommand = b_cmd[k]
		path.append(edge.inverse())
		k = str(b_parent[k])
	return path
