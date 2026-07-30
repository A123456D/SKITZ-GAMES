import type { TileKind } from "../core/types";
import { TILE_KINDS } from "../core/types";

const STICKER_VERSION = 1;
const cache = new Map<TileKind, HTMLImageElement>();
let loadPromise: Promise<void> | null = null;

export function stickerSrc(kind: TileKind): string {
  return `./stickers/${kind}.png?v=${STICKER_VERSION}`;
}

export function loadStickers(): Promise<void> {
  if (TILE_KINDS.every((k) => cache.has(k))) return Promise.resolve();
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
          img.src = stickerSrc(kind);
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
