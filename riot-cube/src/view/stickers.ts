import type { TileKind } from "../core/types";
import { TILE_KINDS } from "../core/types";

const cache = new Map<TileKind, HTMLImageElement>();
let loaded = false;
let loadPromise: Promise<void> | null = null;

export function loadStickers(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;
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
          img.src = `./stickers/${kind}.png`;
        }),
    ),
  ).then(() => {
    loaded = true;
  });
  return loadPromise;
}

export function stickerImage(kind: TileKind): HTMLImageElement | null {
  return cache.get(kind) ?? null;
}
