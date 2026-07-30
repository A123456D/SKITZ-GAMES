import { TILE_KINDS } from "../core/types";
import { getTheme, type ThemeId } from "./theme";

const VERSION = 13;
const cache = new Map<string, HTMLImageElement>();
let loadPromise: Promise<void> | null = null;
let loadedTheme: ThemeId | null = null;

function loadOne(src: string, key: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(key, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = `${src}?v=${VERSION}`;
  });
}

function stickerBase(theme: ThemeId): string {
  return theme === "edgy" ? "./themes/edgy/stickers" : "./stickers";
}

function uiJobs(theme: ThemeId): Array<[string, string]> {
  if (theme === "edgy") {
    return [
      ["./themes/edgy/ui/bg-menu.png", "ui:bg-menu"],
      ["./themes/edgy/ui/bg-play.png", "ui:bg-play"],
      ["./themes/edgy/ui/bg-map.png", "ui:bg-map"],
      ["./themes/edgy/ui/btn-play.png", "ui:btn-play"],
      ["./themes/edgy/ui/btn-paper.png", "ui:btn-paper"],
      ["./themes/edgy/ui/board-plate.png", "ui:board-plate"],
      ["./themes/edgy/ui/logo.png", "ui:logo"],
    ];
  }
  return [
    ["./ui/logo.png", "ui:logo"],
    ["./ui/bg-menu.png", "ui:bg-menu"],
    ["./ui/bg-play.png", "ui:bg-play"],
    ["./ui/bg-map.png", "ui:bg-map"],
    ["./ui/btn-play.png", "ui:btn-play"],
    ["./ui/btn-paper.png", "ui:btn-paper"],
    ["./ui/board-plate.png", "ui:board-plate"],
  ];
}

/** Load (or reload) art for the active theme. */
export function loadGameArt(forceTheme?: ThemeId): Promise<void> {
  const theme = forceTheme ?? getTheme();
  if (loadPromise && loadedTheme === theme && !forceTheme) return loadPromise;

  // Drop previous theme tiles/ui so we don't flash stale art.
  for (const key of [...cache.keys()]) {
    if (key.startsWith("tile:") || key.startsWith("ui:")) cache.delete(key);
  }

  const jobs: Promise<void>[] = [];
  const stickers = stickerBase(theme);
  for (const k of TILE_KINDS) {
    jobs.push(loadOne(`${stickers}/${k}.png`, `tile:${k}`));
  }

  // Shared packs (obstacles / powers / FX stay classroom for now).
  if (loadedTheme == null) {
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
  }

  for (const [src, key] of uiJobs(theme)) {
    jobs.push(loadOne(src, key));
  }

  loadedTheme = theme;
  loadPromise = Promise.all(jobs).then(() => {
    loadPromise = null;
  });
  return loadPromise;
}

/** Switch theme art + wait for loads. */
export async function reloadThemeArt(theme: ThemeId): Promise<void> {
  loadedTheme = null;
  loadPromise = null;
  await loadGameArt(theme);
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
