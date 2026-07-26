/**
 * Optional per-theme art (backgrounds + knob face textures). Loaded lazily;
 * draw code falls back to procedural paint until a theme's art is ready, then
 * invalidates its caches so the richer art appears.
 */

import type { ThemeId } from "./palette";

export type ThemeArt = {
  bg: HTMLImageElement | null;
  knob: HTMLImageElement | null;
  grit: HTMLImageElement | null;
  banner: HTMLImageElement | null;
  loaded: boolean;
};

function blank(): ThemeArt {
  return { bg: null, knob: null, grit: null, banner: null, loaded: false };
}

const art: Record<ThemeId, ThemeArt> = {
  paper: blank(),
  mono: blank(),
  retro: blank(),
  punk: blank(),
};

const HAS_GRIT: Partial<Record<ThemeId, boolean>> = { punk: true };
const HAS_BANNER: Partial<Record<ThemeId, boolean>> = {};
/** Themes that skip the optional knob texture (procedural face only). */
const SKIP_KNOB: Partial<Record<ThemeId, boolean>> = { mono: true };
/** Themes that paint their backdrop procedurally (skip heavy/outdated bg.png). */
const SKIP_BG: Partial<Record<ThemeId, boolean>> = { mono: true };

/** Coarse pointers / small viewports skip optional multi-MB art for smoother mobile play. */
function preferLightArt(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    if (Math.min(window.innerWidth, window.innerHeight) < 700) return true;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof mem === "number" && mem > 0 && mem <= 4) return true;
  } catch {
    /* ignore */
  }
  return false;
}

const started: Partial<Record<ThemeId, boolean>> = {};
let onReady: (() => void) | null = null;

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function onThemeArtReady(cb: () => void): void {
  onReady = cb;
}

export function getThemeArt(id: ThemeId): ThemeArt {
  return art[id];
}

/** Kick off loads for one theme's art — safe to call repeatedly. */
export function ensureThemeArt(id: ThemeId): void {
  if (started[id] || typeof Image === "undefined") return;
  started[id] = true;
  const light = preferLightArt();
  const dir = `./themes/${id}`;
  void (async () => {
    // Punk's generated backdrop is core to its identity, so retain it on mobile.
    // Grit and knob textures remain optional there to keep memory use controlled.
    const loadBackground = !SKIP_BG[id] && (!light || id === "punk");
    const [bg, knobs, grit, banner] = await Promise.all([
      loadBackground ? loadImg(`${dir}/bg.png`) : Promise.resolve(null),
      SKIP_KNOB[id] || light ? Promise.resolve(null) : loadImg(`${dir}/knob.png`),
      HAS_GRIT[id] && !light ? loadImg(`${dir}/grit.png`) : Promise.resolve(null),
      HAS_BANNER[id] && !light ? loadImg(`${dir}/banner.png`) : Promise.resolve(null),
    ]);
    const slot = art[id];
    slot.bg = bg;
    slot.knob = knobs;
    slot.grit = grit;
    slot.banner = banner;
    slot.loaded = true;
    onReady?.();
  })();
}
