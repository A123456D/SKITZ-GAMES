/** All sticker assets available in the game. */
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

/** How many sticker kinds are live in any one generation (keeps matches dense). */
export const PLAY_POOL_SIZE = 6;

/**
 * Rotate through every sticker asset across generations.
 * `mustInclude` (level goals) always stay in the pool.
 */
export function rotatingPlayKinds(
  generation: number,
  mustInclude: readonly TileKind[] = [],
  count = PLAY_POOL_SIZE,
): TileKind[] {
  const n = TILE_KINDS.length;
  const offset = ((generation % n) + n) % n;
  const out: TileKind[] = [];
  for (const k of mustInclude) {
    if (!out.includes(k)) out.push(k);
  }
  for (let i = 0; i < n && out.length < count; i++) {
    const k = TILE_KINDS[(offset + i) % n]!;
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

/** Default opening window (generation 0) — tests / quiet boards. */
export const PLAY_KINDS = rotatingPlayKinds(0);

export type PlayKind = TileKind;

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
  /**
   * Lock the sticker pool (no rotation). When omitted, each generation
   * rotates through TILE_KINDS while keeping goal stickers available.
   */
  kinds?: readonly TileKind[];
  seed?: number;
  starScores: [number, number, number];
};

export type MatchGroup = {
  kind: TileKind;
  cells: Coord[];
};
