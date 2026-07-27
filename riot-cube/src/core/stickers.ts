/** Sticker art kinds used as Rubik face “colors”. */
export const TILE_KINDS = [
  // Shared / edgy base pack
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
  // Anime add-on pack (kept when new sheets are added)
  "controller",
  "crt",
  "skate",
  "panda",
  "raven",
  "spray",
  "hero",
  "mage",
  "blaze",
  "patch",
  "familiar",
  "drake",
  "owl",
  "bot",
  // Classroom add-on pack
  "pizza",
  "rocket",
  "alien",
  "planet",
  "wave",
  "kittyw",
  "board",
  "shroom",
  "note",
  "cactus",
  "camera",
  "peace",
] as const;

export type TileKind = (typeof TILE_KINDS)[number];

/** Edgy uses the original shared 24-kind pack only. */
export const EDGY_STICKER_POOL = [
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
] as const satisfies readonly TileKind[];

/** Prior classroom pack + newly added sheet (additive). */
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
  "pizza",
  "rocket",
  "alien",
  "planet",
  "wave",
  "kittyw",
  "board",
  "shroom",
  "note",
  "cactus",
  "camera",
  "peace",
] as const satisfies readonly TileKind[];

/** Prior anime day pack + newly added sheets (additive). */
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
  "controller",
  "crt",
  "skate",
  "panda",
  "raven",
  "spray",
  "hero",
  "mage",
  "blaze",
  "patch",
  "familiar",
  "drake",
  "owl",
  "bot",
] as const satisfies readonly TileKind[];

/** Horror anime-dark sheet — 24 unique; do not mix with day add-ons. */
export const ANIME_DARK_STICKER_POOL = [
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
] as const satisfies readonly TileKind[];

/** Unique sticker kinds available for a theme’s chooser / random pick. */
export function stickerPoolForTheme(
  theme: string,
  animeMode: "day" | "dark" = "day",
): readonly TileKind[] {
  if (theme === "classroom") return CLASSROOM_STICKER_POOL;
  if (theme === "anime") {
    return animeMode === "dark" ? ANIME_DARK_STICKER_POOL : ANIME_STICKER_POOL;
  }
  return EDGY_STICKER_POOL;
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
  pool: readonly TileKind[] = EDGY_STICKER_POOL,
): FaceStickers {
  const src = pool.length >= 6 ? pool : EDGY_STICKER_POOL;
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
