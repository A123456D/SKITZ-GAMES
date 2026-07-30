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

/**
 * Obstacles — classroom junk that covers / locks stickers.
 *
 * Soft (swap ok, no match until cleared): tape-x, tape-black, glue, wet
 * Hard (no swap): box, lock, tar, barbed
 */
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

/**
 * Power-ups — each solves a different board problem.
 * bomb: 3×3 blast for stuck clusters
 * plane: clear a row (tape stripes)
 * rocket: clear a column (locker stacks)
 * magnet: clear one sticker color (collection goals)
 * stapler: rip obstacles in 3×3 (locks/boxes)
 * disco: chaotic multi-clear (late game clutch)
 */
export const POWERUP_KINDS = [
  "bomb",
  "plane",
  "rocket",
  "magnet",
  "stapler",
  "disco",
] as const;

export type PowerUpKind = (typeof POWERUP_KINDS)[number];

export const POWER_BLURBS: Record<PowerUpKind, string> = {
  bomb: "3×3 BLAST — break a stuck cluster",
  plane: "ROW WIPE — shred a horizontal line",
  rocket: "COLUMN WIPE — shred a vertical stack",
  magnet: "COLOR PULL — clear one sticker type",
  stapler: "RIP OBSTACLES — peel tape/locks nearby",
  disco: "CHAOS CLEAR — random sticker riot",
};

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

export const OBSTACLE_SOFT: ReadonlySet<ObstacleKind> = new Set([
  "tape-x",
  "tape-black",
  "glue",
  "wet",
]);

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

export type Goal =
  | { type: "collect"; kind: TileKind; need: number; have: number }
  | {
      type: "clear";
      obstacle: ObstacleKind | "any";
      need: number;
      have: number;
    };

export type GoalDef =
  | { type: "collect"; kind: TileKind; need: number }
  | { type: "clear"; obstacle: ObstacleKind | "any"; need: number };

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
  | "bite"
  | "lanes"
  | "corners"
  | "hourglass"
  | "rift";

export type ZoneId = "desk" | "hall" | "yard" | "roof";

export type ObstaclePattern =
  | "scatter"
  | "row"
  | "col"
  | "border"
  | "cluster"
  | "checker"
  | "center"
  | "diagonals";

export type ObstacleSpec = {
  kind: ObstacleKind;
  pattern: ObstaclePattern;
  count: number;
};

export type LevelDef = {
  id: number;
  zone: ZoneId;
  name: string;
  /** One-line design intent shown on map / pre-level. */
  brief: string;
  moves: number;
  goals: GoalDef[];
  shape: BoardShapeId;
  /** How many colors in the bag (4–6). */
  colors: number;
  obstaclePlan: ObstacleSpec[];
  /** Starting power charges for this level (missing = 0). */
  powers: Partial<Record<PowerUpKind, number>>;
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
