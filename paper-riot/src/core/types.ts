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

/** Max board size (shapes carve holes inside this). */
export const COLS = 7;
export const ROWS = 9;

export type Cell = {
  kind: TileKind;
  id: number;
  obstacle?: ObstacleKind;
  hits?: number;
};

export type Pos = { c: number; r: number };

/** true = playable slot. */
export type BoardMask = boolean[][];

/** null = empty playable OR unused; only read where mask is true. */
export type Board = (Cell | null)[][];

export type Goal = {
  kind: TileKind;
  need: number;
  have: number;
};

export type BoardShapeId =
  | "rect"
  | "square"
  | "donut"
  | "plus"
  | "diamond"
  | "heart"
  | "stairs"
  | "pillars"
  | "narrow"
  | "bite";

export type ZoneId = "desk" | "hall" | "yard" | "roof";

export type LevelDef = {
  id: number;
  zone: ZoneId;
  name: string;
  moves: number;
  goals: { kind: TileKind; need: number }[];
  shape: BoardShapeId;
  /** How many colors in the bag (4–6). */
  colors: number;
  obstacles: number;
  /** Map node position 0..1 within zone path. */
  mapT: number;
};

export type MatchGroup = {
  kind: TileKind;
  cells: Pos[];
};

export type PowerInventory = Record<PowerUpKind, number>;

export type Progress = {
  /** Highest unlocked level id (1-based). */
  unlocked: number;
  /** Stars per level id (0–3). */
  stars: Record<number, number>;
  lives: number;
  gems: number;
};
