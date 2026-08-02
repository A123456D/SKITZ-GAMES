const UI_FILES = [
  "ui-bg-chamber.png",
  "ui-card-frame.png",
  "ui-btn-primary.png",
  "ui-btn-ghost.png",
  "ui-btn-pass.png",
  "ui-hud-panel.png",
  "ui-board-panel.png",
  "ui-energy-bar.png",
  "ui-tile-empty.png",
  "ui-logo-badge.png",
  "ui-icon-menu.png",
  "ui-icon-settings.png",
  "faction-volt.png",
  "faction-prismatic.png",
  "faction-void.png",
] as const;

export type UiKey = (typeof UI_FILES)[number];

const cache = new Map<string, HTMLImageElement>();
let loadPromise: Promise<void> | null = null;

export function preloadUiArt(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all(
    UI_FILES.map(
      (file) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            cache.set(file, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `./assets/ui/${file}`;
        }),
    ),
  ).then(() => undefined);
  return loadPromise;
}

export function ui(key: UiKey): HTMLImageElement | null {
  return cache.get(key) ?? null;
}

export function factionSymbol(faction: string): HTMLImageElement | null {
  if (faction === "volt") return ui("faction-volt.png");
  if (faction === "prismatic") return ui("faction-prismatic.png");
  if (faction === "void") return ui("faction-void.png");
  return null;
}

export function drawNineSlice(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  slice = 48,
): void {
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const s = Math.min(slice, Math.floor(sw / 3), Math.floor(sh / 3));
  const dw = Math.min(s, Math.floor(w / 3));
  const dh = Math.min(s, Math.floor(h / 3));

  const sx = [0, s, sw - s];
  const sy = [0, s, sh - s];
  const sws = [s, sw - 2 * s, s];
  const shs = [s, sh - 2 * s, s];
  const dx = [x, x + dw, x + w - dw];
  const dy = [y, y + dh, y + h - dh];
  const dws = [dw, w - 2 * dw, dw];
  const dhs = [dh, h - 2 * dh, dh];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (sws[col] <= 0 || shs[row] <= 0 || dws[col] <= 0 || dhs[row] <= 0) continue;
      ctx.drawImage(
        img,
        sx[col],
        sy[row],
        sws[col],
        shs[row],
        dx[col],
        dy[row],
        dws[col],
        dhs[row],
      );
    }
  }
}
