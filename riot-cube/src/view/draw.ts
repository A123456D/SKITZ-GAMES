import type { Goal, TileKind } from "../core/types";
import { stickerImage } from "./stickers";
import { uiButtonImage } from "./uiButtons";

export const W = 720;
export const H = 1280;

export type Layout = {
  pageX: number;
  pageY: number;
  pageW: number;
  pageH: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  cell: number;
  gap: number;
  stride: number;
  flipLeft: { x: number; y: number; w: number; h: number };
  flipRight: { x: number; y: number; w: number; h: number };
};

export function boardLayout(size: number): Layout {
  const pageX = 48;
  const pageW = W - 96;
  const pageY = 300;
  const pageH = 720;
  const margin = 36;
  const boardSize = Math.min(pageW - margin * 2, pageH - margin * 2 - 20);
  const gap = 10;
  const cell = (boardSize - gap * (size - 1)) / size;
  const stride = cell + gap;
  const boardX = pageX + (pageW - boardSize) / 2;
  const boardY = pageY + (pageH - boardSize) / 2;
  const flipH = 88;
  const flipW = 44;
  const flipY = boardY + boardSize / 2 - flipH / 2;
  return {
    pageX,
    pageY,
    pageW,
    pageH,
    boardX,
    boardY,
    boardSize,
    cell,
    gap,
    stride,
    flipLeft: { x: pageX - 8, y: flipY, w: flipW, h: flipH },
    flipRight: { x: pageX + pageW - flipW + 8, y: flipY, w: flipW, h: flipH },
  };
}

export function cellBase(layout: Layout, r: number, c: number): { x: number; y: number } {
  return {
    x: layout.boardX + c * layout.stride,
    y: layout.boardY + r * layout.stride,
  };
}

export function hitCell(
  layout: Layout,
  size: number,
  x: number,
  y: number,
): { r: number; c: number } | null {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const p = cellBase(layout, r, c);
      if (x >= p.x && x <= p.x + layout.cell && y >= p.y && y <= p.y + layout.cell) {
        return { r, c };
      }
    }
  }
  return null;
}

function hitRect(
  r: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function hitUiRect(
  r: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
): boolean {
  return hitRect(r, x, y);
}

export function hitFlip(
  layout: Layout,
  x: number,
  y: number,
): 1 | -1 | null {
  if (hitRect(layout.flipLeft, x, y)) return -1;
  if (hitRect(layout.flipRight, x, y)) return 1;
  return null;
}

export function hitRetry(x: number, y: number): boolean {
  return x >= 230 && x <= 490 && y >= 640 && y <= 694;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawDesk(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a1410");
  g.addColorStop(1, "#0c0a08");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawPage(ctx: CanvasRenderingContext2D, layout: Layout, flipT: number): void {
  const { pageX, pageY, pageW, pageH } = layout;
  ctx.save();
  // Perspective-ish squash during flip
  const cx = pageX + pageW / 2;
  const scaleX = Math.max(0.04, Math.abs(Math.cos(flipT * Math.PI)));
  ctx.translate(cx, pageY + pageH / 2);
  ctx.scale(scaleX, 1);
  ctx.translate(-cx, -(pageY + pageH / 2));

  // Page shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, pageX + 10, pageY + 14, pageW, pageH, 8);
  ctx.fill();

  // Lined notebook page
  const paper = ctx.createLinearGradient(pageX, pageY, pageX + pageW, pageY + pageH);
  paper.addColorStop(0, "#f7f1e4");
  paper.addColorStop(1, "#ebe2d0");
  ctx.fillStyle = paper;
  roundRect(ctx, pageX, pageY, pageW, pageH, 6);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Binder holes
  ctx.fillStyle = "#d8d0c0";
  for (let i = 0; i < 6; i++) {
    const hy = pageY + 60 + i * 100;
    ctx.beginPath();
    ctx.arc(pageX + 18, hy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Blue lines
  ctx.strokeStyle = "rgba(80,140,200,0.28)";
  ctx.lineWidth = 1.5;
  for (let y = pageY + 48; y < pageY + pageH - 20; y += 28) {
    ctx.beginPath();
    ctx.moveTo(pageX + 40, y);
    ctx.lineTo(pageX + pageW - 20, y);
    ctx.stroke();
  }
  // Red margin
  ctx.strokeStyle = "rgba(220,80,80,0.35)";
  ctx.beginPath();
  ctx.moveTo(pageX + 48, pageY + 20);
  ctx.lineTo(pageX + 48, pageY + pageH - 20);
  ctx.stroke();

  // Masking tape
  ctx.save();
  ctx.translate(pageX + 80, pageY - 6);
  ctx.rotate(-0.08);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#ffd60a";
  ctx.fillRect(0, 0, 110, 22);
  ctx.restore();
  ctx.save();
  ctx.translate(pageX + pageW - 140, pageY + pageH - 10);
  ctx.rotate(0.1);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#ff2d6a";
  ctx.fillRect(0, 0, 90, 20);
  ctx.restore();

  ctx.restore();
}

export function drawFlipButtons(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  face: number,
): void {
  const drawBtn = (
    r: { x: number; y: number; w: number; h: number },
    label: string,
  ) => {
    ctx.save();
    ctx.fillStyle = "#111";
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.strokeStyle = "#c8ff3d";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#c8ff3d";
    ctx.font = "800 28px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
    ctx.restore();
  };
  drawBtn(layout.flipLeft, "‹");
  drawBtn(layout.flipRight, "›");

  ctx.fillStyle = "#f3efe6";
  ctx.font = "700 16px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    face === 0 ? "FRONT" : "BACK",
    layout.pageX + layout.pageW / 2,
    layout.pageY + layout.pageH + 28,
  );
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  opts: {
    title: string;
    moves: number;
    score: number;
    goals: Goal[];
    sfxVol?: number;
  },
): void {
  // Title scrap
  ctx.fillStyle = "#f3efe6";
  roundRect(ctx, 36, 28, 210, 46, 5);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#ff2d6a";
  ctx.fillRect(46, 22, 48, 12);
  ctx.fillStyle = "#111";
  ctx.font = "800 24px 'Permanent Marker', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("RIOT CUBE", 50, 58);

  ctx.fillStyle = "#111";
  roundRect(ctx, 260, 30, 96, 42, 5);
  ctx.fill();
  ctx.fillStyle = "#c8ff3d";
  ctx.font = "700 12px 'Chakra Petch', sans-serif";
  ctx.fillText("MOVES", 274, 46);
  ctx.fillStyle = "#fff";
  ctx.font = "800 20px 'Chakra Petch', sans-serif";
  ctx.fillText(String(opts.moves), 274, 64);

  ctx.fillStyle = "#f3efe6";
  roundRect(ctx, 370, 28, 100, 46, 5);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.font = "700 12px 'Chakra Petch', sans-serif";
  ctx.fillText("SCORE", 384, 46);
  ctx.font = "800 20px 'Chakra Petch', sans-serif";
  ctx.fillText(String(opts.score), 384, 66);

  drawVolumeButton(ctx, opts.sfxVol ?? 0.4);

  ctx.fillStyle = "#f7f3ea";
  roundRect(ctx, 36, 88, 648, 96, 5);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.font = "800 15px 'Permanent Marker', sans-serif";
  ctx.fillText(opts.title + "  ·  GOALS", 56, 112);

  opts.goals.forEach((g, i) => {
    const gx = 56 + i * 160;
    const gy = 122;
    drawStickerSprite(ctx, g.kind, gx, gy, 36, 1, 0);
    ctx.fillStyle = "#111";
    ctx.font = "800 18px 'Chakra Petch', sans-serif";
    ctx.fillText(`${g.have}/${g.need}`, gx + 46, gy + 26);
  });
}

export const VOL_BTN = { x: 656, y: 28, w: 42, h: 46 };

export function hitVolumeButton(x: number, y: number): boolean {
  return (
    x >= VOL_BTN.x &&
    x <= VOL_BTN.x + VOL_BTN.w &&
    y >= VOL_BTN.y &&
    y <= VOL_BTN.y + VOL_BTN.h
  );
}

function drawVolumeButton(ctx: CanvasRenderingContext2D, vol: number): void {
  const { x, y, w, h } = VOL_BTN;
  ctx.fillStyle = "#f3efe6";
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.stroke();

  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.fillStyle = "#111";
  // Speaker body
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy - 5);
  ctx.lineTo(cx - 3, cy - 5);
  ctx.lineTo(cx + 3, cy - 10);
  ctx.lineTo(cx + 3, cy + 10);
  ctx.lineTo(cx - 3, cy + 5);
  ctx.lineTo(cx - 9, cy + 5);
  ctx.closePath();
  ctx.fill();

  if (vol <= 0.001) {
    ctx.strokeStyle = "#ff2d6a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 7);
    ctx.lineTo(cx + 13, cy + 7);
    ctx.moveTo(cx + 13, cy - 7);
    ctx.lineTo(cx + 6, cy + 7);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + 3, cy, 6, -0.6, 0.6);
    ctx.stroke();
    if (vol > 0.5) {
      ctx.beginPath();
      ctx.arc(cx + 3, cy, 10, -0.7, 0.7);
      ctx.stroke();
    }
  }
}

/** Draw sticker image without a square cell — floating on the page. */
export function drawStickerSprite(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  x: number,
  y: number,
  s: number,
  scale = 1,
  lift = 0,
  shadows = true,
): void {
  const img = stickerImage(kind);
  const cx = x + s / 2;
  const cy = y + s / 2 - lift;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  if (shadows) {
    if (lift > 0) {
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 16 + lift;
      ctx.shadowOffsetY = 8 + lift * 0.3;
    } else {
      ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
    }
  }

  if (img) {
    ctx.drawImage(img, x, y - lift, s, s);
  } else {
    ctx.fillStyle = "#f7f7f2";
    roundRect(ctx, x, y - lift, s, s, s * 0.2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = `800 ${Math.floor(s * 0.22)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(kind.slice(0, 3).toUpperCase(), cx, cy);
  }
  ctx.restore();
}

export function drawHint(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = "#1b1b1b";
  roundRect(ctx, 48, 1148, 624, 64, 5);
  ctx.fill();
  ctx.fillStyle = "#c8ff3d";
  ctx.fillRect(72, 1140, 44, 12);
  ctx.fillStyle = "#f3efe6";
  ctx.font = "600 15px 'Patrick Hand', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(text, 64, 1186);
}

/** Bottom play controls — D-pad twists selected lane; selector toggles row/col. */
export type PlayDock = {
  up: UiRect;
  down: UiRect;
  left: UiRect;
  right: UiRect;
  select: UiRect;
};

function drawDockImage(
  ctx: CanvasRenderingContext2D,
  r: UiRect,
  img: HTMLImageElement | null,
  fallback: () => void,
): void {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    return;
  }
  fallback();
}

function dockBtnFallback(
  ctx: CanvasRenderingContext2D,
  r: UiRect,
  label: string,
  opts?: { fill?: string; ink?: string },
): void {
  ctx.fillStyle = opts?.fill ?? "#111";
  roundRect(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.strokeStyle = "#c8ff3d";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = opts?.ink ?? "#c8ff3d";
  ctx.font = "800 28px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
}

export function drawPlayDock(
  ctx: CanvasRenderingContext2D,
  opts: { mode: "row" | "col"; index: number; size: number },
): PlayDock {
  const edge = 20;
  const btn = 78;
  const gap = 8;
  const padW = btn * 3 + gap * 2 + 20;
  const padH = btn * 3 + gap * 2 + 20;
  const y = H - edge - padH;

  // Left cluster — twist D-pad (big targets for mobile)
  ctx.fillStyle = "#1b1b1b";
  roundRect(ctx, edge, y, padW, padH, 10);
  ctx.fill();
  ctx.fillStyle = "#c8ff3d";
  ctx.fillRect(edge + 16, y - 8, 48, 12);

  const padCx = edge + padW / 2;
  const midY = y + 10 + btn + gap;
  const up: UiRect = { x: padCx - btn / 2, y: y + 10, w: btn, h: btn };
  const left: UiRect = { x: padCx - btn * 1.5 - gap, y: midY, w: btn, h: btn };
  const right: UiRect = { x: padCx + btn / 2 + gap, y: midY, w: btn, h: btn };
  const down: UiRect = {
    x: padCx - btn / 2,
    y: midY + btn + gap,
    w: btn,
    h: btn,
  };

  // Right cluster — row/col selector
  const sel = 112;
  const selW = sel + 28;
  const selH = padH;
  const selPanelX = W - edge - selW;
  ctx.fillStyle = "#1b1b1b";
  roundRect(ctx, selPanelX, y, selW, selH, 10);
  ctx.fill();
  ctx.fillStyle = "#c8ff3d";
  ctx.fillRect(selPanelX + selW - 64, y - 8, 48, 12);

  const select: UiRect = {
    x: selPanelX + (selW - sel) / 2,
    y: y + (selH - sel) / 2,
    w: sel,
    h: sel,
  };

  drawDockImage(ctx, up, uiButtonImage("orbit-up"), () =>
    dockBtnFallback(ctx, up, "˄"),
  );
  drawDockImage(ctx, left, uiButtonImage("orbit-left"), () =>
    dockBtnFallback(ctx, left, "‹"),
  );
  drawDockImage(ctx, right, uiButtonImage("orbit-right"), () =>
    dockBtnFallback(ctx, right, "›"),
  );
  drawDockImage(ctx, down, uiButtonImage("orbit-down"), () =>
    dockBtnFallback(ctx, down, "˅"),
  );

  const selLabel = opts.mode === "row" ? `R${opts.index + 1}` : `C${opts.index + 1}`;
  const selImg = uiButtonImage("select");
  drawDockImage(ctx, select, selImg, () =>
    dockBtnFallback(ctx, select, selLabel, { fill: "#c8ff3d", ink: "#111" }),
  );
  if (selImg) {
    ctx.fillStyle = "#111";
    ctx.font = "800 36px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(selLabel, select.x + select.w / 2, select.y + select.h / 2 + 2);
  }

  return { up, down, left, right, select };
}

export function drawEndOverlay(
  ctx: CanvasRenderingContext2D,
  opts: { won: boolean; score: number; stars: number; hasNext?: boolean },
): void {
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = opts.won ? "#f3efe6" : "#2a1a1a";
  roundRect(ctx, 120, 460, 480, 280, 8);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = opts.won ? "#111" : "#ff2d6a";
  ctx.font = "800 36px 'Permanent Marker', sans-serif";
  ctx.fillText(opts.won ? "CLEARED!" : "OUT OF MOVES", 150, 520);
  ctx.fillStyle = opts.won ? "#111" : "#f3efe6";
  ctx.font = "700 20px 'Chakra Petch', sans-serif";
  ctx.fillText(`SCORE  ${opts.score}`, 150, 560);
  if (opts.won) {
    ctx.font = "800 28px 'Permanent Marker', sans-serif";
    ctx.fillText("★".repeat(opts.stars) + "☆".repeat(3 - opts.stars), 150, 600);
  }
  ctx.fillStyle = "#ff2d6a";
  roundRect(ctx, 230, 640, 260, 54, 7);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "800 22px 'Chakra Petch', sans-serif";
  const label = opts.won ? (opts.hasNext ? "NEXT" : "AGAIN") : "RETRY";
  ctx.fillText(label, 310, 676);
}

export type UiRect = { x: number; y: number; w: number; h: number };

export const MENU_BTN: UiRect = { x: 490, y: 28, w: 72, h: 46 };

export function drawMenuButton(ctx: CanvasRenderingContext2D): void {
  const { x, y, w, h } = MENU_BTN;
  ctx.fillStyle = "#111";
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = "#c8ff3d";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#c8ff3d";
  ctx.font = "800 14px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("MENU", x + w / 2, y + h / 2 + 1);
}

function drawPaperButton(
  ctx: CanvasRenderingContext2D,
  r: UiRect,
  label: string,
  opts?: { fill?: string; text?: string; tape?: string },
): void {
  ctx.fillStyle = opts?.fill ?? "#f3efe6";
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.stroke();
  if (opts?.tape) {
    ctx.fillStyle = opts.tape;
    ctx.fillRect(r.x + 18, r.y - 8, 56, 14);
  }
  ctx.fillStyle = opts?.text ?? "#111";
  ctx.font = "800 26px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
}

export const HOME_PLAY: UiRect = { x: 150, y: 860, w: 420, h: 78 };
export const HOME_SETTINGS: UiRect = { x: 150, y: 960, w: 420, h: 70 };

let logoImg: HTMLImageElement | null = null;
let logoReady = false;

/** Preload home / brand logo (transparent PNG). */
export function loadLogo(): Promise<void> {
  if (logoReady) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      logoImg = img;
      logoReady = true;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = "./logo-riot-cube.png?v=4";
  });
}

export function drawHomeScreen(ctx: CanvasRenderingContext2D): void {
  drawDesk(ctx);

  // Brand logo (paper cube + RIOT CUBE wordmark)
  if (logoImg && logoReady) {
    const maxW = 520;
    const maxH = 520;
    const scale = Math.min(maxW / logoImg.width, maxH / logoImg.height);
    const lw = logoImg.width * scale;
    const lh = logoImg.height * scale;
    ctx.drawImage(logoImg, (W - lw) / 2, 120, lw, lh);
  } else {
    ctx.fillStyle = "#f3efe6";
    roundRect(ctx, 70, 220, 580, 160, 8);
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "800 64px 'Permanent Marker', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RIOT CUBE", W / 2, 310);
  }

  ctx.fillStyle = "#c8ff3d";
  ctx.font = "600 20px 'Patrick Hand', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Twist with the dock. Flip costs a move.", W / 2, 680);

  // Accent how-to strip
  ctx.fillStyle = "#1b1b1b";
  roundRect(ctx, 120, 710, 480, 120, 8);
  ctx.fill();
  ctx.fillStyle = "#c8ff3d";
  ctx.fillRect(160, 700, 70, 14);
  ctx.fillStyle = "#f3efe6";
  ctx.font = "600 17px 'Patrick Hand', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("• Dock / swipe twists — dry twists are free", 150, 748);
  ctx.fillText("• Match 3+ spends a move · flip costs one", 150, 778);
  ctx.fillText("• Only the face you look at scores", 150, 808);

  drawPaperButton(ctx, HOME_PLAY, "PLAY", {
    fill: "#ff2d6a",
    text: "#fff",
    tape: "#c8ff3d",
  });
  drawPaperButton(ctx, HOME_SETTINGS, "SETTINGS", {
    fill: "#f3efe6",
    text: "#111",
    tape: "#ff2d6a",
  });
}

export const PAUSE_RESUME: UiRect = { x: 160, y: 420, w: 400, h: 72 };
export const PAUSE_SETTINGS: UiRect = { x: 160, y: 520, w: 400, h: 68 };
export const PAUSE_HOME: UiRect = { x: 160, y: 610, w: 400, h: 68 };

export function drawPauseMenu(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#f3efe6";
  roundRect(ctx, 100, 300, 520, 440, 10);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#ff2d6a";
  ctx.fillRect(140, 288, 90, 18);

  ctx.fillStyle = "#111";
  ctx.font = "800 40px 'Permanent Marker', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MENU", W / 2, 370);

  drawPaperButton(ctx, PAUSE_RESUME, "RESUME", {
    fill: "#c8ff3d",
    text: "#111",
  });
  drawPaperButton(ctx, PAUSE_SETTINGS, "SETTINGS", {
    fill: "#f3efe6",
    text: "#111",
  });
  drawPaperButton(ctx, PAUSE_HOME, "HOME", {
    fill: "#111",
    text: "#c8ff3d",
  });
}

export const SETTINGS_VOL: UiRect = { x: 140, y: 430, w: 440, h: 80 };
export const SETTINGS_THEME: UiRect = { x: 140, y: 530, w: 440, h: 80 };
export const SETTINGS_BACK: UiRect = { x: 140, y: 640, w: 440, h: 70 };

export function drawSettingsScreen(
  ctx: CanvasRenderingContext2D,
  opts: { sfxVol: number; themeLabel: string },
): void {
  drawDesk(ctx);

  ctx.fillStyle = "#f3efe6";
  roundRect(ctx, 80, 220, 560, 560, 10);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#c8ff3d";
  ctx.fillRect(120, 208, 100, 18);

  ctx.fillStyle = "#111";
  ctx.font = "800 42px 'Permanent Marker', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SETTINGS", W / 2, 300);

  ctx.font = "600 18px 'Patrick Hand', sans-serif";
  ctx.fillStyle = "#333";
  ctx.fillText("Tap to cycle sound & sticker theme", W / 2, 350);

  const volLabel =
    opts.sfxVol <= 0.001 ? "MUTED" : opts.sfxVol < 0.55 ? "SOFT" : "NORMAL";
  drawPaperButton(ctx, SETTINGS_VOL, `SOUND  ·  ${volLabel}`, {
    fill: "#111",
    text: "#c8ff3d",
  });
  drawPaperButton(ctx, SETTINGS_THEME, `THEME  ·  ${opts.themeLabel}`, {
    fill: "#111",
    text: "#ff2d6a",
  });
  drawPaperButton(ctx, SETTINGS_BACK, "BACK", {
    fill: "#ff2d6a",
    text: "#fff",
  });
}

