import type { Goal, TileKind } from "../core/types";
import { stickerImage } from "./stickers";

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
  return x >= 200 && x <= 520 && y >= 660 && y <= 730;
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
  },
): void {
  // Title scrap
  ctx.fillStyle = "#f3efe6";
  roundRect(ctx, 40, 36, 280, 64, 6);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#ff2d6a";
  ctx.fillRect(52, 28, 70, 18);
  ctx.fillStyle = "#111";
  ctx.font = "800 34px 'Permanent Marker', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("RIOT CUBE", 58, 78);

  ctx.fillStyle = "#111";
  roundRect(ctx, 360, 40, 150, 58, 6);
  ctx.fill();
  ctx.fillStyle = "#c8ff3d";
  ctx.font = "700 18px 'Chakra Petch', sans-serif";
  ctx.fillText("MOVES", 378, 64);
  ctx.fillStyle = "#fff";
  ctx.font = "800 28px 'Chakra Petch', sans-serif";
  ctx.fillText(String(opts.moves), 378, 90);

  ctx.fillStyle = "#f3efe6";
  roundRect(ctx, 530, 36, 150, 62, 6);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.font = "700 16px 'Chakra Petch', sans-serif";
  ctx.fillText("SCORE", 548, 60);
  ctx.font = "800 26px 'Chakra Petch', sans-serif";
  ctx.fillText(String(opts.score), 548, 88);

  ctx.fillStyle = "#f7f3ea";
  roundRect(ctx, 40, 120, 640, 150, 6);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.font = "800 22px 'Permanent Marker', sans-serif";
  ctx.fillText(opts.title + "  ·  GOALS", 70, 158);

  opts.goals.forEach((g, i) => {
    const gx = 70 + i * 200;
    const gy = 175;
    drawStickerSprite(ctx, g.kind, gx, gy, 52, 1, 0);
    ctx.fillStyle = "#111";
    ctx.font = "800 26px 'Chakra Petch', sans-serif";
    ctx.fillText(`${g.have}/${g.need}`, gx + 64, gy + 36);
  });
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
): void {
  const img = stickerImage(kind);
  const cx = x + s / 2;
  const cy = y + s / 2 - lift;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  if (lift > 0) {
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 16 + lift;
    ctx.shadowOffsetY = 8 + lift * 0.3;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
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
  roundRect(ctx, 48, 1080, 624, 100, 6);
  ctx.fill();
  ctx.fillStyle = "#c8ff3d";
  ctx.fillRect(80, 1070, 64, 18);
  ctx.fillStyle = "#f3efe6";
  ctx.font = "600 22px 'Patrick Hand', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(text, 72, 1138);
}

export function drawEndOverlay(
  ctx: CanvasRenderingContext2D,
  opts: { won: boolean; score: number; stars: number },
): void {
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = opts.won ? "#f3efe6" : "#2a1a1a";
  roundRect(ctx, 90, 420, 540, 360, 8);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = opts.won ? "#111" : "#ff2d6a";
  ctx.font = "800 48px 'Permanent Marker', sans-serif";
  ctx.fillText(opts.won ? "CLEARED!" : "OUT OF MOVES", 130, 500);
  ctx.fillStyle = opts.won ? "#111" : "#f3efe6";
  ctx.font = "700 28px 'Chakra Petch', sans-serif";
  ctx.fillText(`SCORE  ${opts.score}`, 130, 560);
  if (opts.won) {
    ctx.font = "800 36px 'Permanent Marker', sans-serif";
    ctx.fillText("★".repeat(opts.stars) + "☆".repeat(3 - opts.stars), 130, 620);
  }
  ctx.fillStyle = "#ff2d6a";
  roundRect(ctx, 200, 660, 320, 70, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "800 32px 'Chakra Petch', sans-serif";
  ctx.fillText(opts.won ? "AGAIN" : "RETRY", 300, 708);
}
