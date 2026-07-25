class_name SolveResult
extends RefCounted
## Output of PuzzleSolver.solve.

var solved: bool = false
var optimal_is_exact: bool = false
## Path of BoardCommand from start → goal (empty if unsolved / already solved).
var path: Array[BoardCommand] = []
var length: int = -1
var nodes_expanded: int = 0
var nodes_generated: int = 0
var timed_out: bool = false
var branching_estimate: float = 0.0
var error: StringName = &""


static func failure(p_error: StringName, nodes: int = 0) -> SolveResult:
	var r := SolveResult.new()
	r.solved = false
	r.error = p_error
	r.nodes_expanded = nodes
	r.length = -1
	return r


static func already_solved() -> SolveResult:
	var r := SolveResult.new()
	r.solved = true
	r.optimal_is_exact = true
	r.length = 0
	r.path = []
	return r


func first_command() -> BoardCommand:
	if path.is_empty():
		return null
	return path[0]
