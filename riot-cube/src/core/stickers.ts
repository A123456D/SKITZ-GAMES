/** Sticker art kinds used as Rubik face “colors”. */
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
  "eye",
] as const;

export type TileKind = (typeof TILE_KINDS)[number];

/**
 * One sticker kind per cube face (F B R L U D).
 * Solved cube = every sticker on a face matches that face’s kind.
 */
export const FACE_STICKERS: readonly [
  TileKind,
  TileKind,
  TileKind,
  TileKind,
  TileKind,
  TileKind,
] = ["skull", "heart", "bolt", "star", "flame", "diamond"];

export function stickerForColor(colorId: number): TileKind {
  return FACE_STICKERS[((colorId % 6) + 6) % 6]!;
}
