/** Sticker art kinds used as Rubik face “colors”. */
export const TILE_KINDS = [
  "glitch",
  "punk",
  "hood",
  "ramen",
  "mask",
  "katana",
  "eyepatch",
  "tears",
  "butterfly",
  "bolt",
  "pill",
  "chain",
  "ghost",
  "bunny",
  "tv",
  "candle",
  "crow",
  "bear",
  "poison",
  "heart",
  "eye",
  "hourglass",
  "soda",
  "grimoire",
] as const;

export type TileKind = (typeof TILE_KINDS)[number];

/**
 * Classroom: 12 unique sticker arts from the classroom sheet.
 * Anime has 14 unique crops from the day packs.
 */
export const CLASSROOM_STICKER_POOL = [
  "glitch",
  "punk",
  "hood",
  "ramen",
  "mask",
  "katana",
  "tears",
  "bolt",
  "candle",
  "pill",
  "chain",
  "butterfly",
] as const satisfies readonly TileKind[];

export const ANIME_STICKER_POOL = [
  "bear",
  "bolt",
  "butterfly",
  "candle",
  "chain",
  "eye",
  "eyepatch",
  "grimoire",
  "heart",
  "hood",
  "hourglass",
  "katana",
  "tears",
  "tv",
] as const satisfies readonly TileKind[];

/** Unique sticker kinds available for a theme’s chooser / random pick. */
export function stickerPoolForTheme(theme: string): readonly TileKind[] {
  if (theme === "classroom") return CLASSROOM_STICKER_POOL;
  if (theme === "anime") return ANIME_STICKER_POOL;
  return TILE_KINDS;
}

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
  "glitch",
  "punk",
  "hood",
  "ramen",
  "mask",
  "katana",
];

/** Shuffle a kind pool and take 6 distinct kinds for the six faces. */
export function pickFaceStickers(
  rng: () => number,
  pool: readonly TileKind[] = TILE_KINDS,
): FaceStickers {
  const src = pool.length >= 6 ? pool : TILE_KINDS;
  const shuffled = src.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  return [
    shuffled[0]!,
    shuffled[1]!,
    shuffled[2]!,
    shuffled[3]!,
    shuffled[4]!,
    shuffled[5]!,
  ];
}

export function stickerForColor(
  colorId: number,
  map: readonly TileKind[] = FACE_STICKERS,
): TileKind {
  return map[((colorId % 6) + 6) % 6]!;
}
