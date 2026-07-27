import { TILE_KINDS, type TileKind } from "../core/stickers";
import {
  getAnimeMode,
  getTheme,
  stickerPath,
  type AnimeMode,
  type ThemeId,
} from "./theme";

/** Bump when replacing theme sticker PNGs so SW / memory cache cannot stick. */
const STICKER_ASSET_VERSION = 10;

const cache = new Map<TileKind, HTMLImageElement>();
let loadedTheme: ThemeId | null = null;
let loadedAnimeMode: AnimeMode | null = null;
let loadedVersion = -1;
let loadPromise: Promise<void> | null = null;

function cacheKeyMatches(theme: ThemeId, mode: AnimeMode): boolean {
  return (
    loadedTheme === theme &&
    loadedAnimeMode === mode &&
    loadedVersion === STICKER_ASSET_VERSION &&
    cache.size === TILE_KINDS.length
  );
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
  loadPromise = Promise.all(
    TILE_KINDS.map(
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
          img.onerror = () => {
            // Anime-dark stickers optional until uploaded — fall back to day pack.
            if (theme === "anime" && mode === "dark") {
              const fallback = new Image();
              fallback.onload = () => {
                if (
                  loadedTheme === theme &&
                  loadedAnimeMode === mode &&
                  loadedVersion === versionAtStart
                ) {
                  cache.set(kind, fallback);
                }
                resolve();
              };
              fallback.onerror = () => resolve();
              fallback.src = `./themes/anime/${kind}.png?v=${STICKER_ASSET_VERSION}`;
              return;
            }
            resolve();
          };
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
