class_name BoardEnums
extends Object
## Shared enums / constants for the board simulation.
## No Node dependencies — safe for headless solvers and multiplayer peers.

enum Direction {
	POSITIVE = 1, ## Right (rows) or Down (columns)
	NEGATIVE = -1, ## Left (rows) or Up (columns)
}

enum CommandType {
	SHIFT_ROW = 1,
	SHIFT_COLUMN = 2,
	ROTATE = 3,
	SET_TILE = 4,
	CLEAR_HISTORY_MARKER = 5, ## Session-local; not networked
}

## Tile state is a bitfield so modes can compose flags without a giant enum.
enum TileStateFlags {
	NONE = 0,
	LOCKED = 1 << 0, ## Cannot leave its cell (Anchor)
	CORRECT = 1 << 1, ## Matches goal (presentation / Assist may set)
	FROZEN = 1 << 2, ## Temporarily immovable (events)
	HIGHLIGHTED = 1 << 3, ## Transient UI; strip before MP hash if needed
	CUSTOM_0 = 1 << 8,
	CUSTOM_1 = 1 << 9,
	CUSTOM_2 = 1 << 10,
	CUSTOM_3 = 1 << 11,
}

const EMPTY_OCCUPANT := &""
const SCHEMA_VERSION := 1

## History defaults tuned for long Endless / Zen sessions.
const DEFAULT_HISTORY_CAPACITY := 8192
const DEFAULT_CHECKPOINT_INTERVAL := 256
