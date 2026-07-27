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
  "eye",
  "mask",
] as const;

export type TileKind = (typeof TILE_KINDS)[number];

export type FaceStickers = readonly [
  TileKind,
  TileKind,
  TileKind,
  TileKind,
  TileKind,
  TileKind,
];

/**
 * One sticker kind per cube face (F B R L U D).
 * Solved cube = every sticker on a face matches that face’s kind.
 */
export const FACE_STICKERS: FaceStickers = [
  "skull",
  "heart",
  "bolt",
  "star",
  "flame",
  "diamond",
];

/** Shuffle TILE_KINDS and take 6 distinct kinds for the six faces. */
export function pickFaceStickers(rng: () => number): FaceStickers {
  const pool = TILE_KINDS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return [pool[0]!, pool[1]!, pool[2]!, pool[3]!, pool[4]!, pool[5]!];
}

export function stickerForColor(
  colorId: number,
  map: readonly TileKind[] = FACE_STICKERS,
): TileKind {
  return map[((colorId % 6) + 6) % 6]!;
}
