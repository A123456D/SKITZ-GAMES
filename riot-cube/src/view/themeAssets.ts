import {
  getTheme,
  getThemeAssetDir,
  type ThemeAssetDir,
  type ThemeId,
} from "./theme";

export type ThemeArt = {
  bg: HTMLImageElement | null;
  btn: HTMLImageElement | null;
  loaded: boolean;
};

const art = new Map<ThemeAssetDir, ThemeArt>();
const started = new Set<ThemeAssetDir>();
let onReady: (() => void) | null = null;

function blank(): ThemeArt {
  return { bg: null, btn: null, loaded: false };
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Resolve which folder to use for get/reload (anime respects day/dark mode). */
function resolveDir(id?: ThemeId | ThemeAssetDir): ThemeAssetDir {
  if (id === "anime-dark") return "anime-dark";
  if (id === "classroom" || id === "grime" || id === "anime") {
    return getThemeAssetDir(id);
  }
  return getThemeAssetDir(getTheme());
}

function ensureDir(dir: ThemeAssetDir): void {
  if (started.has(dir)) return;
  started.add(dir);
  const base = `./themes/${dir}`;
  void (async () => {
    const [bg, btn] = await Promise.all([
      loadImg(`${base}/bg.jpg?v=8`),
      loadImg(`${base}/btn.jpg?v=8`),
    ]);
    art.set(dir, { bg, btn, loaded: true });
    onReady?.();
  })();
}

export function onThemeArtReady(cb: () => void): void {
  onReady = cb;
}

export function getThemeArt(id?: ThemeId | ThemeAssetDir): ThemeArt {
  return art.get(resolveDir(id)) ?? blank();
}

/** Kick off bg.jpg / btn.jpg loads for a theme (or exact anime-dark dir). */
export function ensureThemeArt(id?: ThemeId | ThemeAssetDir): void {
  ensureDir(resolveDir(id));
}

/** Prefetch both anime day and dark plates. */
export function ensureAnimeArtBoth(): void {
  ensureDir("anime");
  ensureDir("anime-dark");
}

export function reloadThemeArt(id?: ThemeId | ThemeAssetDir): void {
  const dir = resolveDir(id);
  started.delete(dir);
  art.delete(dir);
  ensureDir(dir);
}

/** Cover-fit drawImage into a W×H rect. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw <= 0 || ih <= 0) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}
