/** All sticker assets (kept for loading / rare cosmetics). */
export const TILE_KINDS = [
  "skull",
  "heart",
  "bolt",
  "star",
  "flame",
  "diamond",
  "headphones",
  "bomb",
  "spray",
  "smiley",
  "sneaker",
] as const;

export type TileKind = (typeof TILE_KINDS)[number];

/** Match-3 play pool — denser boards, real matches. */
export const PLAY_KINDS = [
  "skull",
  "headphones",
  "spray",
  "smiley",
  "flame",
  "sneaker",
] as const satisfies readonly TileKind[];

export type PlayKind = (typeof PLAY_KINDS)[number];

/** Empty cell during cascade / clear. */
export type Cell = TileKind | null;

export type Coord = { r: number; c: number };

export type TwistAxis = "row" | "col";

export type Twist = {
  axis: TwistAxis;
  index: number;
  /** +1 = right/down, -1 = left/up */
  dir: 1 | -1;
  /** How many cells to shift (default 1). */
  amount?: number;
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
  /** Optional fixed front face. */
  board?: TileKind[][];
  /** Optional fixed back face. */
  boardBack?: TileKind[][];
  /** Optional fixed right / left / top / bottom (faces 2–5). */
  boardRight?: TileKind[][];
  boardLeft?: TileKind[][];
  boardTop?: TileKind[][];
  boardBottom?: TileKind[][];
  /** Sticker pool for generated faces / refill (default PLAY_KINDS). */
  kinds?: readonly TileKind[];
  seed?: number;
  starScores: [number, number, number];
};

export type MatchGroup = {
  kind: TileKind;
  cells: Coord[];
};
