import {
  stickerPoolForTheme,
  type TileKind,
} from "../core/stickers";
import {
  getAnimeMode,
  getTheme,
  stickerPath,
  type AnimeMode,
  type ThemeId,
} from "./theme";

/** Bump when replacing theme sticker PNGs so SW / memory cache cannot stick. */
const STICKER_ASSET_VERSION = 16;

const cache = new Map<TileKind, HTMLImageElement>();
let loadedTheme: ThemeId | null = null;
let loadedAnimeMode: AnimeMode | null = null;
let loadedVersion = -1;
let loadPromise: Promise<void> | null = null;
let loadToken = 0;

function activePool(theme: ThemeId, mode: AnimeMode): readonly TileKind[] {
  return stickerPoolForTheme(theme, theme === "anime" ? mode : "day");
}

function cacheKeyMatches(theme: ThemeId, mode: AnimeMode): boolean {
  if (
    loadedTheme !== theme ||
    loadedAnimeMode !== mode ||
    loadedVersion !== STICKER_ASSET_VERSION
  ) {
    return false;
  }
  const pool = activePool(theme, mode);
  return pool.every((k) => cache.has(k));
}

export function loadStickers(forceTheme?: ThemeId): Promise<void> {
  const theme = forceTheme ?? getTheme();
  const mode = theme === "anime" ? getAnimeMode() : "day";
  if (cacheKeyMatches(theme, mode)) {
    return Promise.resolve();
  }
  if (
    loadPromise &&
    loadedTheme === theme &&
    loadedAnimeMode === mode &&
    loadedVersion === STICKER_ASSET_VERSION
  ) {
    return loadPromise;
  }

  const token = ++loadToken;
  loadedTheme = theme;
  loadedAnimeMode = mode;
  loadedVersion = STICKER_ASSET_VERSION;
  const pool = activePool(theme, mode);
  const next = new Map<TileKind, HTMLImageElement>();

  loadPromise = Promise.all(
    pool.map(
      (kind) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const primary = `${stickerPath(kind, theme)}?v=${STICKER_ASSET_VERSION}`;
          img.onload = () => {
            if (token === loadToken) next.set(kind, img);
            resolve();
          };
          // No day fallback in dark mode — missing files stay missing.
          img.onerror = () => resolve();
          img.src = primary;
        }),
    ),
  ).then(() => {
    if (token !== loadToken) return;
    cache.clear();
    for (const [k, img] of next) cache.set(k, img);
    loadPromise = null;
  });
  return loadPromise;
}

export function stickerImage(kind: TileKind): HTMLImageElement | null {
  return cache.get(kind) ?? null;
}
