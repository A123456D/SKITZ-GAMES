import type { ObstacleKind, PowerUpKind, TileKind } from "../core/types";
import { OBSTACLE_KINDS, POWERUP_KINDS, TILE_KINDS } from "../core/types";

const VERSION = 2;
const stickers = new Map<string, HTMLImageElement>();
let loadPromise: Promise<void> | null = null;

function loadOne(src: string, key: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      stickers.set(key, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = `${src}?v=${VERSION}`;
  });
}

export function loadGameArt(): Promise<void> {
  if (loadPromise) return loadPromise;
  const jobs: Promise<void>[] = [];
  for (const k of TILE_KINDS) {
    jobs.push(loadOne(`./stickers/${k}.png`, `tile:${k}`));
  }
  for (const k of OBSTACLE_KINDS) {
    jobs.push(loadOne(`./obstacles/${k}.png`, `obs:${k}`));
  }
  for (const k of POWERUP_KINDS) {
    jobs.push(loadOne(`./powerups/${k}.png`, `pow:${k}`));
  }
  for (const k of [
    "pop-skull",
    "swap-star",
    "match-hearts",
  ]) {
    jobs.push(loadOne(`./fx/${k}.png`, `fx:${k}`));
  }
  for (const k of [
    "confetti-a",
    "confetti-b",
    "confetti-c",
    "confetti-d",
    "splat-a",
    "splat-b",
    "puff-a",
    "puff-b",
    "star-a",
    "bits",
  ]) {
    jobs.push(loadOne(`./particles/${k}.png`, `pt:${k}`));
  }
  loadPromise = Promise.all(jobs).then(() => {
    loadPromise = null;
  });
  return loadPromise;
}

export function tileImage(kind: TileKind): HTMLImageElement | null {
  return stickers.get(`tile:${kind}`) ?? null;
}

export function obstacleImage(kind: ObstacleKind): HTMLImageElement | null {
  return stickers.get(`obs:${kind}`) ?? null;
}

export function powerImage(kind: PowerUpKind): HTMLImageElement | null {
  return stickers.get(`pow:${kind}`) ?? null;
}

export function fxImage(name: string): HTMLImageElement | null {
  return stickers.get(`fx:${name}`) ?? null;
}

export function particleImage(name: string): HTMLImageElement | null {
  return stickers.get(`pt:${name}`) ?? null;
}

/** @deprecated use loadGameArt */
export function loadStickers(): Promise<void> {
  return loadGameArt();
}

export function stickerImage(kind: TileKind): HTMLImageElement | null {
  return tileImage(kind);
}
