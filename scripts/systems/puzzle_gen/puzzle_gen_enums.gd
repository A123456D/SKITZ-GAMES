class_name PuzzleGenEnums
extends Object
## Shared constants for Align puzzle generation / solving.

enum PatternFamily {
	SOLID_BLOCKS = 0,
	STRIPES = 1,
	CHECKER = 2,
	FRAME = 3,
	LETTER = 4,
}

enum HintStage {
	DIRECTION = 0, ## Row vs column only
	LINE = 1, ## Which row/col index
	FULL_MOVE = 2, ## Full BoardCommand
}

## Default solver node cap — keeps mobile / CI bounded.
const DEFAULT_SOLVER_NODE_CAP := 80_000
## Max scramble retries when score falls outside difficulty band.
const DEFAULT_REGEN_ATTEMPTS := 12
## Tile palette used by Align generators (maps to occupant_id).
const DEFAULT_PALETTE: PackedStringArray = ["A", "B", "C", "D", "E", "F"]
