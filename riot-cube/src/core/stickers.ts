/** Sticker art kinds — names match the artwork in each theme pack. */
export const TILE_KINDS = [
  // Edgy
  "crack",
  "doll",
  "flare",
  "crown",
  "smile",
  "alien",
  "dice",
  "pin",
  "spray",
  "bolt",
  "eye",
  "melt",
  "knife",
  "eight",
  "nails",
  "flip",
  "blaze",
  "collar",
  "skull",
  "sting",
  "lock",
  "star",
  "bomb",
  // Anime day (unique / kept)
  "kitty",
  "goggles",
  "butterfly",
  "juice",
  "smirk",
  "kitsune",
  "peace",
  "school",
  "ramen",
  "ember",
  "handheld",
  "katana",
  "bubble",
  "tv",
  "controller",
  "crt",
  "skate",
  "panda",
  "raven",
  "volt",
  "idol",
  "patch",
  "familiar",
  "drake",
  "owl",
  "bot",
  // Anime dark (horror pack)
  "glitch",
  "punk",
  "hood",
  "mask",
  "eyepatch",
  "tears",
  "pill",
  "chain",
  "slime",
  "bunny",
  "candle",
  "crow",
  "bear",
  "poison",
  "heart",
  "hourglass",
  "soda",
  "grimoire",
  // Classroom
  "flame",
  "gem",
  "cans",
  "pizza",
  "rocket",
  "planet",
  "wave",
  "shroom",
  "note",
  "cactus",
  "camera",
  // Doodle creatures
  "jelly",
  "grump",
  "drop",
  "fire",
  "soot",
  "goo",
  "starry",
  "ice",
  "sprout",
  "bee",
  "bun",
  "triple",
  "bat",
  "spook",
  "stalks",
  "cloud",
  "meltblob",
  "bumpy",
  "sheep",
  "night",
  "purr",
  "uni",
  "splash",
  "dino",
  "bow",
  "toad",
  "pebble",
  "rainbow",
  "reaper",
  "king",
  "angel",
  "urchin",
  "swirl",
  "devil",
  // Relic / dark museum pack
  "bust",
  "organ",
  "serpent",
  "dripface",
  "iris",
  "koi",
  "moth",
  "ukiyo",
  "bloom",
  "kabuto",
  "pillar",
  "thunder",
  "regent",
  "rose",
  "shredder",
  "saturn",
  "geode",
  "cortex",
  "wakeup",
  "moon",
  "palm",
  "atlas",
  "omen",
  "vial",
] as const;

export type TileKind = (typeof TILE_KINDS)[number];

/** Edgy pack — razor blade removed; names match art. */
export const EDGY_STICKER_POOL = [
  "crack",
  "doll",
  "flare",
  "crown",
  "smile",
  "alien",
  "dice",
  "pin",
  "spray",
  "bolt",
  "eye",
  "melt",
  "knife",
  "eight",
  "nails",
  "flip",
  "blaze",
  "collar",
  "skull",
  "sting",
  "lock",
  "star",
  "bomb",
] as const satisfies readonly TileKind[];

/** Classroom pack — names match art. */
export const CLASSROOM_STICKER_POOL = [
  "skull",
  "star",
  "flame",
  "heart",
  "gem",
  "bolt",
  "cans",
  "smile",
  "spray",
  "bomb",
  "pizza",
  "rocket",
  "alien",
  "planet",
  "wave",
  "kitty",
  "skate",
  "shroom",
  "note",
  "cactus",
  "camera",
  "peace",
] as const satisfies readonly TileKind[];

/** Anime day pack — names match art. */
export const ANIME_STICKER_POOL = [
  "kitty",
  "goggles",
  "butterfly",
  "juice",
  "smirk",
  "kitsune",
  "peace",
  "school",
  "ramen",
  "ember",
  "handheld",
  "katana",
  "bubble",
  "tv",
  "controller",
  "crt",
  "skate",
  "panda",
  "raven",
  "spray",
  "volt",
  "idol",
  "blaze",
  "patch",
  "familiar",
  "drake",
  "owl",
  "bot",
] as const satisfies readonly TileKind[];

/** Anime dark horror pack — names match art. */
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
  "slime",
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

/** Doodle creature pack — names match art. */
export const DOODLE_STICKER_POOL = [
  "slime",
  "jelly",
  "grump",
  "drop",
  "fire",
  "soot",
  "goo",
  "starry",
  "ice",
  "sprout",
  "bee",
  "bun",
  "triple",
  "bat",
  "spook",
  "stalks",
  "cloud",
  "meltblob",
  "bumpy",
  "sheep",
  "night",
  "purr",
  "uni",
  "splash",
  "dino",
  "bow",
  "toad",
  "pebble",
  "rainbow",
  "reaper",
  "king",
  "angel",
  "urchin",
  "swirl",
  "devil",
] as const satisfies readonly TileKind[];

/** Relic / dark museum pack — names match art. */
export const RELIC_STICKER_POOL = [
  "bust",
  "organ",
  "serpent",
  "dripface",
  "iris",
  "koi",
  "moth",
  "ukiyo",
  "bloom",
  "kabuto",
  "pillar",
  "thunder",
  "regent",
  "rose",
  "shredder",
  "saturn",
  "geode",
  "cortex",
  "wakeup",
  "moon",
  "palm",
  "atlas",
  "omen",
  "vial",
] as const satisfies readonly TileKind[];

/** Unique sticker kinds available for a theme’s chooser / random pick. */
export function stickerPoolForTheme(
  theme: string,
  animeMode: "day" | "dark" = "day",
): readonly TileKind[] {
  if (theme === "classroom") return CLASSROOM_STICKER_POOL;
  if (theme === "doodle") return DOODLE_STICKER_POOL;
  if (theme === "relic") return RELIC_STICKER_POOL;
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
  "crack",
  "doll",
  "flare",
  "crown",
  "smile",
  "alien",
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

/** Stable first-six from a pool (not random) — used until the player picks. */
export function defaultFaceStickers(
  pool: readonly TileKind[] = EDGY_STICKER_POOL,
): FaceStickers {
  const src = pool.length >= 6 ? pool : EDGY_STICKER_POOL;
  return [
    src[0]!,
    src[1]!,
    src[2]!,
    src[3]!,
    src[4]!,
    src[5]!,
  ];
}

export function isValidFaceStickers(
  map: readonly TileKind[],
  pool: readonly TileKind[],
): boolean {
  if (map.length !== 6) return false;
  const set = new Set(map);
  if (set.size !== 6) return false;
  const allowed = new Set<string>(pool);
  for (const k of map) {
    if (!allowed.has(k)) return false;
  }
  return true;
}

/** Legacy single-set key — migrated into the active theme slot once. */
const FACE_STICKERS_KEY = "riotcube_face_stickers";
/** Per-theme (and anime day/dark) sticker picks. */
const FACE_STICKERS_BY_THEME_KEY = "riotcube_face_stickers_by_theme";

type StickersByTheme = Record<string, FaceStickers>;

function readStickersByTheme(): StickersByTheme {
  try {
    const raw = localStorage.getItem(FACE_STICKERS_BY_THEME_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StickersByTheme;
  } catch {
    return {};
  }
}

function writeStickersByTheme(map: StickersByTheme): void {
  try {
    localStorage.setItem(FACE_STICKERS_BY_THEME_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function parseStickerList(
  raw: unknown,
  pool: readonly TileKind[],
): FaceStickers | null {
  if (!Array.isArray(raw)) return null;
  const map = raw.filter((k): k is TileKind => typeof k === "string");
  if (!isValidFaceStickers(map, pool)) return null;
  return map as unknown as FaceStickers;
}

export function loadSavedFaceStickers(
  pool: readonly TileKind[],
  themeSlot: string,
): FaceStickers | null {
  try {
    const byTheme = readStickersByTheme();
    const slotted = parseStickerList(byTheme[themeSlot], pool);
    if (slotted) return slotted;

    // Migrate legacy global pick into this theme once.
    const legacyRaw = localStorage.getItem(FACE_STICKERS_KEY);
    if (legacyRaw) {
      const legacy = parseStickerList(JSON.parse(legacyRaw), pool);
      if (legacy) {
        byTheme[themeSlot] = legacy;
        writeStickersByTheme(byTheme);
        try {
          localStorage.removeItem(FACE_STICKERS_KEY);
        } catch {
          /* ignore */
        }
        return legacy;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveFaceStickers(map: FaceStickers, themeSlot: string): void {
  if (!themeSlot) return;
  const byTheme = readStickersByTheme();
  byTheme[themeSlot] = map;
  writeStickersByTheme(byTheme);
}

/** Prefer keep → saved for theme → stable defaults. Never random. */
export function resolveFaceStickers(
  pool: readonly TileKind[],
  keep?: readonly TileKind[] | null,
  themeSlot: string = "",
): FaceStickers {
  if (keep && isValidFaceStickers(keep, pool)) return keep as FaceStickers;
  if (themeSlot) {
    const saved = loadSavedFaceStickers(pool, themeSlot);
    if (saved) return saved;
  }
  return defaultFaceStickers(pool);
}

/** True when this theme already has a saved six-sticker set. */
export function hasSavedFaceStickers(
  pool: readonly TileKind[],
  themeSlot: string,
): boolean {
  return loadSavedFaceStickers(pool, themeSlot) != null;
}

export function stickerForColor(
  colorId: number,
  map: readonly TileKind[] = FACE_STICKERS,
): TileKind {
  return map[((colorId % 6) + 6) % 6]!;
}
