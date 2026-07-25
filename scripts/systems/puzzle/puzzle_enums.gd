class_name PuzzleEnums
extends Object
## Shared constants for the puzzle engine. No Node deps â€” safe for headless / MP.

## Cardinal directions as Vector2i-compatible ints: dx, dy packed helpers below.
enum Dir {
	EAST = 0,
	SOUTH = 1,
	WEST = 2,
	NORTH = 3,
}

enum TimeMode {
	NONE = 0,
	## Store a short pocket of recent cell snapshots for local rewind.
	REWIND_POCKET = 1,
	## Actors / fire in radius advance only every N engine ticks.
	SLOW = 2,
	## Actors in radius skip patrol steps while active.
	CHRONOLOCK = 3,
}

enum MagnetPolarity {
	ATTRACT = 1,
	REPEL = -1,
}

## BoardTileData.payload key for puzzle blob.
const PAYLOAD_KEY := &"pz"

## Max laser path cells (including emitter) â€” mobile-safe O(beams * cap).
const LASER_PATH_CAP := 64
## Max follow-up mutation passes per player command (ice chains, gravity cascades).
const RESOLVE_PASS_CAP := 16
## Default discrete tick length in milliseconds (frame-independent).
const DEFAULT_TICK_MS := 100

const DIR_VECTORS: Array[Vector2i] = [
	Vector2i(1, 0), ## EAST
	Vector2i(0, 1), ## SOUTH
	Vector2i(-1, 0), ## WEST
	Vector2i(0, -1), ## NORTH
]


static func dir_to_vec(dir: int) -> Vector2i:
	var i := posmod(dir, 4)
	return DIR_VECTORS[i]


static func vec_to_dir(v: Vector2i) -> int:
	for i in DIR_VECTORS.size():
		if DIR_VECTORS[i] == v:
			return i
	return Dir.EAST


static func opposite_dir(dir: int) -> int:
	return posmod(dir + 2, 4)


## Mirror `/` (slash): reflects Eâ†”N, Wâ†”S.
static func reflect_slash(dir: int) -> int:
	match posmod(dir, 4):
		Dir.EAST:
			return Dir.NORTH
		Dir.NORTH:
			return Dir.EAST
		Dir.WEST:
			return Dir.SOUTH
		Dir.SOUTH:
			return Dir.WEST
		_:
			return dir


## Mirror `\` (backslash): reflects Eâ†”S, Wâ†”N.
static func reflect_backslash(dir: int) -> int:
	match posmod(dir, 4):
		Dir.EAST:
			return Dir.SOUTH
		Dir.SOUTH:
			return Dir.EAST
		Dir.WEST:
			return Dir.NORTH
		Dir.NORTH:
			return Dir.WEST
		_:
			return dir
