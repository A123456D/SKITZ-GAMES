import { TILE_KINDS, type TileKind } from "../core/stickers";
import { getTheme, stickerPath, type ThemeId } from "./theme";

/** Bump when replacing theme sticker PNGs so SW / memory cache cannot stick. */
const STICKER_ASSET_VERSION = 4;

const cache = new Map<TileKind, HTMLImageElement>();
let loadedTheme: ThemeId | null = null;
let loadedVersion = -1;
let loadPromise: Promise<void> | null = null;

export function loadStickers(forceTheme?: ThemeId): Promise<void> {
  const theme = forceTheme ?? getTheme();
  if (
    loadedTheme === theme &&
    loadedVersion === STICKER_ASSET_VERSION &&
    cache.size === TILE_KINDS.length
  ) {
    return Promise.resolve();
  }
  if (loadPromise && loadedTheme === theme && loadedVersion === STICKER_ASSET_VERSION) {
    return loadPromise;
  }

  cache.clear();
  loadedTheme = theme;
  loadedVersion = STICKER_ASSET_VERSION;
  const versionAtStart = STICKER_ASSET_VERSION;
  loadPromise = Promise.all(
    TILE_KINDS.map(
      (kind) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (loadedTheme === theme && loadedVersion === versionAtStart) {
              cache.set(kind, img);
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `${stickerPath(kind, theme)}?v=${STICKER_ASSET_VERSION}`;
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
