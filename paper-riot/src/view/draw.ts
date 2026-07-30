import { COLS, ROWS, type TileKind } from "../core/types";
import type { Session } from "../core/session";
import { stickerImage } from "./stickers";
import { Palette } from "./theme";

export const W = 720;
export const H = 1280;

export type UiRect = { x: number; y: number; w: number; h: number };

export const HOME_PLAY: UiRect = { x: 110, y: 430, w: 500, h: 78 };
export const HOME_DAILY: UiRect = { x: 110, y: 528, w: 500, h: 72 };
export const HOME_SHOP: UiRect = { x: 110, y: 616, w: 500, h: 72 };
export const HOME_COLLECTION: UiRect = { x: 110, y: 704, w: 500, h: 72 };
export const HOME_SETTINGS: UiRect = { x: 110, y: 792, w: 500, h: 72 };

export const PAUSE_BTN: UiRect = { x: 620, y: 36, w: 64, h: 64 };

export type BoardLayout = {
  x: number;
  y: number;
  cell: number;
  gap: number;
};

export function boardLayout(): BoardLayout {
  const gap = 6;
  const width = 640;
  const cell = (width - gap * (COLS - 1)) / COLS;
  const height = cell * ROWS + gap * (ROWS - 1);
  return {
    x: (W - width) / 2,
    y: 340,
    cell,
    gap,
  };
}

export function hitUi(r: UiRect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function cellAt(
  layout: BoardLayout,
  x: number,
  y: number,
): { c: number; r: number } | null {
  const localX = x - layout.x;
  const localY = y - layout.y;
  if (localX < 0 || localY < 0) return null;
  const stride = layout.cell + layout.gap;
  const c = Math.floor(localX / stride);
  const r = Math.floor(localY / stride);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  const inCellX = localX - c * stride;
  const inCellY = localY - r * stride;
  if (inCellX > layout.cell || inCellY > layout.cell) return null;
  return { c, r };
}

export function cellCenter(
  layout: BoardLayout,
  c: number,
  r: number,
): { x: number; y: number } {
  return {
    x: layout.x + c * (layout.cell + layout.gap) + layout.cell / 2,
    y: layout.y + r * (layout.cell + layout.gap) + layout.cell / 2,
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number,
): void {
  const r = Math.min(rad, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tornPaper(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  opts?: { shadow?: boolean; rotate?: number },
): void {
  ctx.save();
  if (opts?.rotate) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(opts.rotate);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  if (opts?.shadow !== false) {
    ctx.shadowColor = Palette.shadow;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;
  }
  ctx.fillStyle = fill;
  // Jagged torn edge
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 2);
  ctx.lineTo(x + w * 0.22, y);
  ctx.lineTo(x + w * 0.48, y + 5);
  ctx.lineTo(x + w * 0.72, y + 1);
  ctx.lineTo(x + w - 4, y + 4);
  ctx.lineTo(x + w, y + h * 0.35);
  ctx.lineTo(x + w - 3, y + h * 0.7);
  ctx.lineTo(x + w - 1, y + h - 3);
  ctx.lineTo(x + w * 0.65, y + h);
  ctx.lineTo(x + w * 0.35, y + h - 4);
  ctx.lineTo(x + 5, y + h - 1);
  ctx.lineTo(x, y + h * 0.55);
  ctx.lineTo(x + 3, y + h * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.strokeStyle = Palette.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawSticker(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  cx: number,
  cy: number,
  size: number,
  opts?: { selected?: boolean; squash?: number },
): void {
  const squash = opts?.squash ?? 1;
  const img = stickerImage(kind);
  const drawW = size * squash;
  const drawH = size / squash;
  const x = cx - drawW / 2;
  const y = cy - drawH / 2;

  ctx.save();
  // Soft drop shadow — part of the Paper Riot look
  ctx.shadowColor = Palette.shadow;
  ctx.shadowBlur = Math.max(6, size * 0.14);
  ctx.shadowOffsetX = size * 0.06;
  ctx.shadowOffsetY = size * 0.1;
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, drawW, drawH);
  } else {
    ctx.fillStyle = Palette.paper;
    roundRect(ctx, x, y, drawW, drawH, 10);
    ctx.fill();
  }
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (opts?.selected) {
    ctx.strokeStyle = Palette.hot;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 4, y - 4, drawW + 8, drawH + 8, 12);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBackdrop(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = Palette.bg;
  ctx.fillRect(0, 0, W, H);

  // Charcoal noise strips
  ctx.fillStyle = "#141414";
  for (let i = 0; i < 18; i++) {
    const y = (i * 97 + 40) % H;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, y, W, 28 + (i % 5) * 6);
  }
  ctx.globalAlpha = 1;

  // Lined paper scraps
  tornPaper(ctx, -40, 60, 320, 220, Palette.paper, { rotate: -0.08 });
  tornPaper(ctx, 420, 880, 360, 280, Palette.paperDim, { rotate: 0.06 });
  tornPaper(ctx, 480, 40, 280, 160, "#fff7ea", { rotate: 0.1 });
}

export function drawHome(ctx: CanvasRenderingContext2D): void {
  drawBackdrop(ctx);

  ctx.fillStyle = Palette.ink;
  ctx.font = "800 64px 'Permanent Marker', cursive";
  ctx.textAlign = "center";
  ctx.fillText("PAPER", W / 2 - 40, 210);

  // RIOT letter blocks (simplified)
  const letters = [
    { ch: "R", col: Palette.purple },
    { ch: "I", col: Palette.ink },
    { ch: "O", col: Palette.lime },
    { ch: "T", col: Palette.hot },
  ];
  let lx = 200;
  for (const L of letters) {
    tornPaper(ctx, lx, 230, 78, 86, L.col, { rotate: (lx % 17) * 0.002 });
    ctx.fillStyle = L.col === Palette.ink ? Palette.white : Palette.ink;
    ctx.font = "800 48px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(L.ch, lx + 39, 275);
    lx += 88;
  }

  const buttons: { rect: UiRect; label: string; fill: string; hot?: boolean }[] =
    [
      { rect: HOME_PLAY, label: "PLAY", fill: Palette.hot, hot: true },
      { rect: HOME_DAILY, label: "DAILY", fill: Palette.paper },
      { rect: HOME_SHOP, label: "SHOP", fill: Palette.paper },
      { rect: HOME_COLLECTION, label: "COLLECTION", fill: Palette.paper },
      { rect: HOME_SETTINGS, label: "SETTINGS", fill: Palette.paper },
    ];

  for (const b of buttons) {
    tornPaper(ctx, b.rect.x, b.rect.y, b.rect.w, b.rect.h, b.fill, {
      rotate: b.hot ? -0.01 : 0.008,
    });
    ctx.fillStyle = b.hot ? Palette.white : Palette.ink;
    ctx.font = "800 36px 'Chakra Petch', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(b.label, b.rect.x + 36, b.rect.y + b.rect.h / 2 + 2);
  }

  // Lives / gems scrap
  tornPaper(ctx, 40, 980, 220, 70, Palette.ink);
  ctx.fillStyle = Palette.hot;
  ctx.font = "800 28px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("♥  5 FULL", 70, 1024);

  tornPaper(ctx, 420, 980, 260, 70, Palette.ink);
  ctx.fillStyle = Palette.purple;
  ctx.fillText("◆  350  +", 450, 1024);

  ctx.fillStyle = Palette.white;
  ctx.font = "600 28px 'Patrick Hand', cursive";
  ctx.textAlign = "center";
  ctx.fillText("RIP. MATCH. REPEAT.", W / 2, 1180);
}

export function drawPlay(
  ctx: CanvasRenderingContext2D,
  session: Session,
  opts: {
    selected: { c: number; r: number } | null;
    clearing: Set<string>;
    burstT: number;
  },
): void {
  drawBackdrop(ctx);
  const layout = boardLayout();

  // HUD scraps
  tornPaper(ctx, 36, 36, 200, 70, Palette.paper);
  ctx.fillStyle = Palette.ink;
  ctx.font = "800 28px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`MOVES  ${session.movesLeft}`, 56, 72);

  tornPaper(ctx, 260, 40, 200, 62, Palette.ink);
  ctx.fillStyle = Palette.white;
  ctx.textAlign = "center";
  ctx.fillText(`LEVEL ${session.level.id}`, 360, 72);

  tornPaper(ctx, PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h, Palette.paper);
  ctx.fillStyle = Palette.ink;
  ctx.fillRect(PAUSE_BTN.x + 20, PAUSE_BTN.y + 18, 8, 28);
  ctx.fillRect(PAUSE_BTN.x + 36, PAUSE_BTN.y + 18, 8, 28);

  // Goals
  tornPaper(ctx, 56, 130, 608, 170, Palette.paper, { rotate: -0.01 });
  ctx.fillStyle = Palette.ink;
  ctx.font = "800 26px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("GOAL", 90, 170);

  session.goals.forEach((g, i) => {
    const gx = 110 + i * 180;
    const gy = 230;
    drawSticker(ctx, g.kind, gx, gy, 56);
    ctx.fillStyle = Palette.ink;
    ctx.font = "800 22px 'Chakra Petch', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${g.have}/${g.need}`, gx + 40, gy + 8);
  });

  // Board paper
  const boardH =
    layout.cell * ROWS + layout.gap * (ROWS - 1) + 24;
  const boardW = layout.cell * COLS + layout.gap * (COLS - 1) + 24;
  tornPaper(
    ctx,
    layout.x - 12,
    layout.y - 12,
    boardW,
    boardH,
    "#f7f2e6",
    { rotate: 0.005 },
  );

  // Grid lines
  ctx.strokeStyle = Palette.gridLine;
  ctx.lineWidth = 1.5;
  for (let r = 0; r <= ROWS; r++) {
    const y = layout.y + r * (layout.cell + layout.gap) - layout.gap / 2;
    ctx.beginPath();
    ctx.moveTo(layout.x, y);
    ctx.lineTo(layout.x + boardW - 24, y);
    ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    const x = layout.x + c * (layout.cell + layout.gap) - layout.gap / 2;
    ctx.beginPath();
    ctx.moveTo(x, layout.y);
    ctx.lineTo(x, layout.y + boardH - 24);
    ctx.stroke();
  }

  // Tiles
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const key = `${c},${r}`;
      if (opts.clearing.has(key)) continue;
      const cell = session.board[c]![r]!;
      const center = cellCenter(layout, c, r);
      const selected =
        opts.selected?.c === c && opts.selected?.r === r;
      drawSticker(ctx, cell.kind, center.x, center.y, layout.cell * 0.86, {
        selected,
      });
    }
  }

  // Match burst
  if (opts.burstT > 0 && opts.burstT < 1) {
    for (const key of opts.clearing) {
      const [cs, rs] = key.split(",").map(Number);
      const center = cellCenter(layout, cs!, rs!);
      const t = opts.burstT;
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(t * 0.4);
      ctx.fillStyle = `rgba(10,10,10,${0.55 * (1 - t)})`;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const rad = layout.cell * (0.35 + 0.55 * t) * (i % 2 === 0 ? 1.2 : 0.7);
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Power-up placeholders
  const powers = ["✈", "💣", "🖌", "🧲"];
  powers.forEach((p, i) => {
    const x = 90 + i * 150;
    const y = 1120;
    tornPaper(ctx, x, y, 100, 90, Palette.paper);
    ctx.fillStyle = Palette.ink;
    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p, x + 50, y + 40);
    ctx.font = "800 18px 'Chakra Petch', sans-serif";
    ctx.fillText("2", x + 78, y + 72);
  });

  if (session.status === "won" || session.status === "lost") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    tornPaper(ctx, 110, 480, 500, 220, Palette.paper);
    ctx.fillStyle = Palette.ink;
    ctx.font = "800 48px 'Permanent Marker', cursive";
    ctx.textAlign = "center";
    ctx.fillText(session.status === "won" ? "CLEARED!" : "OUT OF MOVES", W / 2, 560);
    ctx.font = "800 28px 'Chakra Petch', sans-serif";
    ctx.fillText("TAP TO CONTINUE", W / 2, 640);
  }
}
