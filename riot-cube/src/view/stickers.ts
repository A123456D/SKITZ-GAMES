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
const STICKER_ASSET_VERSION = 15;

const cache = new Map<TileKind, HTMLImageElement>();
let loadedTheme: ThemeId | null = null;
let loadedAnimeMode: AnimeMode | null = null;
let loadedVersion = -1;
let loadPromise: Promise<void> | null = null;

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

  cache.clear();
  loadedTheme = theme;
  loadedAnimeMode = mode;
  loadedVersion = STICKER_ASSET_VERSION;
  const versionAtStart = STICKER_ASSET_VERSION;
  const pool = activePool(theme, mode);
  loadPromise = Promise.all(
    pool.map(
      (kind) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const primary = `${stickerPath(kind, theme)}?v=${STICKER_ASSET_VERSION}`;
          const commit = () => {
            if (
              loadedTheme === theme &&
              loadedAnimeMode === mode &&
              loadedVersion === versionAtStart
            ) {
              cache.set(kind, img);
            }
            resolve();
          };
          img.onload = commit;
          // No day fallback in dark mode — missing files stay missing.
          img.onerror = () => resolve();
          img.src = primary;
        }),
    ),
  ).then(() => {
    loadPromise = null;
  });
  return loadPromise;
}

export function stickerImage(kind: TileKind): HTMLImageElement | null {
  return cache.get(kind) ?? null;
}
