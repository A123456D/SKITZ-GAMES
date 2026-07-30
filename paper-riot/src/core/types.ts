/** Classroom stickers used as match tiles (Riot Cube classroom pack). */
export const TILE_KINDS = [
  "skull",
  "star",
  "flame",
  "heart",
  "bolt",
  "gem",
] as const;

export type TileKind = (typeof TILE_KINDS)[number];

export const OBSTACLE_KINDS = [
  "tape-x",
  "tape-black",
  "box",
  "tar",
  "glue",
  "lock",
  "wet",
  "barbed",
] as const;

export type ObstacleKind = (typeof OBSTACLE_KINDS)[number];

export const POWERUP_KINDS = [
  "bomb",
  "plane",
  "magnet",
  "rocket",
  "stapler",
  "disco",
] as const;

export type PowerUpKind = (typeof POWERUP_KINDS)[number];

/** Hits to clear when an adjacent match pops. */
export const OBSTACLE_HITS: Record<ObstacleKind, number> = {
  "tape-x": 1,
  "tape-black": 1,
  box: 2,
  tar: 1,
  glue: 2,
  lock: 2,
  wet: 1,
  barbed: 1,
};

export const COLS = 6;
export const ROWS = 8;

export type Cell = {
  kind: TileKind;
  id: number;
  obstacle?: ObstacleKind;
  hits?: number;
};

export type Pos = { c: number; r: number };

export type Goal = {
  kind: TileKind;
  need: number;
  have: number;
};

export type LevelDef = {
  id: number;
  moves: number;
  goals: { kind: TileKind; need: number }[];
  /** Extra obstacle spawns on new board. */
  obstacles?: number;
};

export type Board = Cell[][];

export type MatchGroup = {
  kind: TileKind;
  cells: Pos[];
};

export type PowerInventory = Record<PowerUpKind, number>;
