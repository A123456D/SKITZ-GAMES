import { TILE_KINDS } from "../core/types";

const VERSION = 8;
const cache = new Map<string, HTMLImageElement>();
let loadPromise: Promise<void> | null = null;

function loadOne(src: string, key: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(key, img);
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
  for (const k of [
    "tape-x",
    "tape-black",
    "box",
    "tar",
    "glue",
    "lock",
    "wet",
    "barbed",
  ]) {
    jobs.push(loadOne(`./obstacles/${k}.png`, `obs:${k}`));
  }
  for (const k of ["bomb", "plane", "magnet", "rocket", "stapler", "disco"]) {
    jobs.push(loadOne(`./powerups/${k}.png`, `pow:${k}`));
  }
  for (const k of [
    "pop-skull",
    "swap-star",
    "match-hearts",
    "match-skulls",
    "match-bolts",
    "match-stars",
    "match-bomb",
  ]) {
    jobs.push(loadOne(`./fx/${k}.png`, `fx:${k}`));
  }
  for (const k of [
    "confetti-a",
    "confetti-b",
    "confetti-c",
    "confetti-d",
    "confetti-e",
    "confetti-f",
    "splat-a",
    "splat-b",
    "splat-c",
    "puff-a",
    "puff-b",
    "puff-c",
    "puff-d",
    "puff-e",
    "star-a",
    "star-b",
    "star-c",
    "bits",
  ]) {
    jobs.push(loadOne(`./particles/${k}.png`, `pt:${k}`));
  }
  for (const [file, key] of [
    ["logo.png", "ui:logo"],
    ["bg-menu.png", "ui:bg-menu"],
    ["bg-play.png", "ui:bg-play"],
    ["bg-map.png", "ui:bg-map"],
    ["btn-play.png", "ui:btn-play"],
    ["btn-paper.png", "ui:btn-paper"],
    ["board-plate.png", "ui:board-plate"],
  ] as const) {
    jobs.push(loadOne(`./ui/${file}`, key));
  }

  loadPromise = Promise.all(jobs).then(() => {
    loadPromise = null;
  });
  return loadPromise;
}

export function img(key: string): HTMLImageElement | null {
  return cache.get(key) ?? null;
}

export function tileImage(kind: string) {
  return img(`tile:${kind}`);
}
export function obstacleImage(kind: string) {
  return img(`obs:${kind}`);
}
export function powerImage(kind: string) {
  return img(`pow:${kind}`);
}
export function fxImage(name: string) {
  return img(`fx:${name}`);
}
export function particleImage(name: string) {
  return img(`pt:${name}`);
}
export function uiImage(name: string) {
  return img(`ui:${name}`);
}

export function loadStickers() {
  return loadGameArt();
}
export function stickerImage(kind: string) {
  return tileImage(kind);
}
