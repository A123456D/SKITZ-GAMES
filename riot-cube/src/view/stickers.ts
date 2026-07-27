import { TILE_KINDS, type TileKind } from "../core/stickers";
import { getTheme, stickerPath, type ThemeId } from "./theme";

const cache = new Map<TileKind, HTMLImageElement>();
let loadedTheme: ThemeId | null = null;
let loadPromise: Promise<void> | null = null;

export function loadStickers(forceTheme?: ThemeId): Promise<void> {
  const theme = forceTheme ?? getTheme();
  if (loadedTheme === theme && cache.size === TILE_KINDS.length) {
    return Promise.resolve();
  }
  if (loadPromise && loadedTheme === theme) return loadPromise;

  cache.clear();
  loadedTheme = theme;
  loadPromise = Promise.all(
    TILE_KINDS.map(
      (kind) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            cache.set(kind, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `${stickerPath(kind, theme)}?v=2`;
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
