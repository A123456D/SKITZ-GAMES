/** Tile kinds for Phase 1 flat board. */
export const TILE_KINDS = [
  "skull",
  "heart",
  "bolt",
  "star",
  "flame",
  "diamond",
] as const;

export type TileKind = (typeof TILE_KINDS)[number];

/** Empty cell during cascade / clear. */
export type Cell = TileKind | null;

export type Coord = { r: number; c: number };

export type TwistAxis = "row" | "col";

export type Twist = {
  axis: TwistAxis;
  index: number;
  /** +1 = right/down, -1 = left/up */
  dir: 1 | -1;
};

export type Goal = {
  kind: TileKind;
  need: number;
  have: number;
};

export type LevelDef = {
  id: string;
  title: string;
  size: number;
  moves: number;
  goals: { kind: TileKind; need: number }[];
  /** Optional fixed board; otherwise generated. */
  board?: TileKind[][];
  seed?: number;
  /** Score thresholds for 1/2/3 stars. */
  starScores: [number, number, number];
};

export type MatchGroup = {
  kind: TileKind;
  cells: Coord[];
};
