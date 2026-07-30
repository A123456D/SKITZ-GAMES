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

export const COLS = 6;
export const ROWS = 8;

export type Cell = {
  kind: TileKind;
  id: number;
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
};

export type Board = Cell[][];

export type MatchGroup = {
  kind: TileKind;
  cells: Pos[];
};
