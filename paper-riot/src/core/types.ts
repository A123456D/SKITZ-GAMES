/** Matchable classroom stickers — expanded from Riot Cube pack. */
export const TILE_KINDS = [
  "skull",
  "star",
  "flame",
  "heart",
  "bolt",
  "gem",
  "pizza",
  "spray",
  "skate",
  "soda",
  "ghost",
  "peace",
] as const;

export type TileKind = (typeof TILE_KINDS)[number];

/**
 * Obstacles — classroom junk covering stickers. Each kind has a unique rule:
 *
 * Soft (can swap, still block matching until peeled):
 *   tape-x     — 1 adjacent peel (tutorial cover)
 *   tape-black — 2 peels; immune to rocket line clears
 *   wet        — 1 peel; slips one extra cell after a swap
 *   glue       — 2 peels; pins the cell so it will not fall
 *
 * Hard (cannot swap):
 *   box    — 2 cracks; immune to rocket line clears
 *   lock   — 2 cracks; only adjacent matches of size ≥4 (or powers)
 *   tar    — 2 cracks; after cascades settle, may spread to a neighbor
 *   barbed — 1 crack; adjacent matches do nothing — needs a power tool
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

export const OBSTACLE_LABELS: Record<ObstacleKind | "any", string> = {
  "tape-x": "PINK TAPE",
  "tape-black": "BLACK TAPE",
  box: "BOX",
  tar: "TAR",
  glue: "GLUE",
  lock: "LOCK",
  wet: "WET",
  barbed: "BARBED",
  any: "JUNK",
};

export const OBSTACLE_BLURBS: Record<ObstacleKind, string> = {
  "tape-x": "Soft cover — match beside it once to peel",
  "tape-black": "Heavy tape — 2 peels; rockets bounce off",
  wet: "Slick smear — peels once; slips after you swap it",
  glue: "Sticky pin — 2 peels; glued stickers will not fall",
  box: "Solid crate — 2 cracks; rockets bounce off",
  lock: "Combo lock — needs a match of 4+ (or a blast)",
  tar: "Creeping goo — 2 cracks; spreads if you leave it",
  barbed: "Wire fence — matches won't cut it; use a power",
};

/** Plane / rocket skip these solid covers. */
export const OBSTACLE_LINE_IMMUNE: ReadonlySet<ObstacleKind> = new Set([
  "tape-black",
  "box",
]);

/** Adjacent matches never damage these — powers only. */
export const OBSTACLE_MATCH_IMMUNE: ReadonlySet<ObstacleKind> = new Set([
  "barbed",
]);

/** Minimum adjacent match size required to crack a lock. */
export const LOCK_MIN_MATCH = 4;

/**
 * Power-ups — mechanics match the classroom tool fantasy.
 * bomb: explode a 3×3 cluster
 * plane: swap any two stickers; only clears if that swap makes a match
 * rocket: launch up a full column
 * magnet: pull every sticker of the tapped type
 * stapler: staple a 2×2 paper packet and rip it off the board
 * disco: disco bomb party — clear a few tiles and bank +5 moves
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
  bomb: "BOMB — explode a 3×3 cluster",
  plane: "PLANE — swap two stickers (must match)",
  rocket: "ROCKET — blast up the whole column",
  magnet: "MAGNET — pull every sticker of that type",
  stapler: "STAPLER — staple a 2×2 packet and rip it off",
  disco: "DISCO — party clear + bank 5 moves",
};

export const OBSTACLE_HITS: Record<ObstacleKind, number> = {
  "tape-x": 1,
  "tape-black": 2,
  wet: 1,
  glue: 2,
  box: 2,
  lock: 2,
  tar: 2,
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
  /**
   * How many sticker types in the bag (4–10).
   * Goal collect kinds are ALWAYS forced into the bag.
   */
  colors: number;
  /** Optional explicit palette; otherwise first N of TILE_KINDS + goals. */
  palette?: TileKind[];
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

/** Build the spawn bag for a level — goals can never be missing. */
export function paletteForLevel(def: {
  colors: number;
  goals: GoalDef[];
  palette?: TileKind[];
}): TileKind[] {
  const n = Math.max(4, Math.min(TILE_KINDS.length, def.colors));
  const base = def.palette?.length
    ? [...def.palette]
    : (TILE_KINDS.slice(0, n) as TileKind[]);
  const bag = new Set<TileKind>(base);
  for (const g of def.goals) {
    if (g.type === "collect") bag.add(g.kind);
  }
  return [...bag];
}
