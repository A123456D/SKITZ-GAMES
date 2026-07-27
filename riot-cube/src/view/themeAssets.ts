import { getTheme, type ThemeId } from "./theme";

export type ThemeArt = {
  bg: HTMLImageElement | null;
  btn: HTMLImageElement | null;
  loaded: boolean;
};

const art = new Map<ThemeId, ThemeArt>();
const started = new Set<ThemeId>();
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

export function onThemeArtReady(cb: () => void): void {
  onReady = cb;
}

export function getThemeArt(id: ThemeId = getTheme()): ThemeArt {
  return art.get(id) ?? blank();
}

/** Kick off bg.jpg / btn.jpg loads for a theme. */
export function ensureThemeArt(id: ThemeId = getTheme()): void {
  if (started.has(id)) return;
  started.add(id);
  const dir = `./themes/${id}`;
  void (async () => {
    const [bg, btn] = await Promise.all([
      loadImg(`${dir}/bg.jpg?v=6`),
      loadImg(`${dir}/btn.jpg?v=6`),
    ]);
    art.set(id, { bg, btn, loaded: true });
    onReady?.();
  })();
}

export function reloadThemeArt(id: ThemeId = getTheme()): void {
  started.delete(id);
  art.delete(id);
  ensureThemeArt(id);
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
