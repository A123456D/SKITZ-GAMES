class_name PuzzleHint
extends RefCounted
## Progressive hint for Align puzzles (GDD frustration valve).

var stage: int = PuzzleGenEnums.HintStage.DIRECTION
var axis: StringName = &"" ## &"row" | &"col"
var index: int = -1
var dir: int = 0
var steps: int = 1
var command: BoardCommand = null
var blurb: String = ""
var legal: bool = true


func to_dict() -> Dictionary:
	return {
		"stage": stage,
		"axis": String(axis),
		"index": index,
		"dir": dir,
		"steps": steps,
		"command": command.to_dict() if command else {},
		"blurb": blurb,
		"legal": legal,
	}


static func from_dict(data: Dictionary) -> PuzzleHint:
	var h := PuzzleHint.new()
	h.stage = int(data.get("stage", 0))
	h.axis = StringName(str(data.get("axis", "")))
	h.index = int(data.get("index", -1))
	h.dir = int(data.get("dir", 0))
	h.steps = int(data.get("steps", 1))
	var cd: Variant = data.get("command", {})
	if cd is Dictionary and not cd.is_empty():
		h.command = BoardCommand.from_dict(cd)
	h.blurb = str(data.get("blurb", ""))
	h.legal = bool(data.get("legal", true))
	return h
