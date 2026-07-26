import type { TileKind } from "../core/types";

export const W = 720;
export const H = 1280;

export const COLORS: Record<
  TileKind,
  { fill: string; ink: string; accent: string }
> = {
  skull: { fill: "#1a1a1a", ink: "#f5f5f5", accent: "#ff2d6a" },
  heart: { fill: "#ff2d6a", ink: "#1a1a1a", accent: "#fff" },
  bolt: { fill: "#c8ff3d", ink: "#1a1a1a", accent: "#fff" },
  star: { fill: "#ffd60a", ink: "#1a1a1a", accent: "#fff" },
  flame: { fill: "#ff6b1a", ink: "#1a1a1a", accent: "#ffe566" },
  diamond: { fill: "#3d9bff", ink: "#0a1628", accent: "#fff" },
};

export type Layout = {
  boardX: number;
  boardY: number;
  boardSize: number;
  cell: number;
  gap: number;
};

export function boardLayout(size: number): Layout {
  const margin = 48;
  const boardSize = W - margin * 2;
  const gap = 8;
  const cell = (boardSize - gap * (size - 1)) / size;
  const boardY = 340;
  return { boardX: margin, boardY, boardSize, cell, gap };
}

export function cellRect(layout: Layout, r: number, c: number): {
  x: number;
  y: number;
  s: number;
} {
  const s = layout.cell;
  return {
    x: layout.boardX + c * (s + layout.gap),
    y: layout.boardY + r * (s + layout.gap),
    s,
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
      const rect = cellRect(layout, r, c);
      if (x >= rect.x && x <= rect.x + rect.s && y >= rect.y && y <= rect.y + rect.s) {
        return { r, c };
      }
    }
  }
  return null;
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

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#141414");
  g.addColorStop(0.55, "#0c0c0c");
  g.addColorStop(1, "#1a120e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = i % 2 ? "#ff2d6a" : "#c8ff3d";
    const x = (i * 97) % W;
    const y = (i * 173) % H;
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.restore();
}

export function drawPaperScrap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  opts?: { rotate?: number; lined?: boolean },
): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(opts?.rotate ?? 0);
  ctx.translate(-w / 2, -h / 2);

  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;

  ctx.fillStyle = fill;
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  roundRect(ctx, 0, 0, w, h, 6);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.stroke();

  if (opts?.lined) {
    ctx.strokeStyle = "rgba(80,140,200,0.35)";
    ctx.lineWidth = 1.5;
    for (let ly = 18; ly < h - 8; ly += 16) {
      ctx.beginPath();
      ctx.moveTo(10, ly);
      ctx.lineTo(w - 10, ly);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function drawTape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  rot = -0.12,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h * 0.35);
  ctx.restore();
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  cx: number,
  cy: number,
  scale: number,
): void {
  const colors = COLORS[kind];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = colors.ink;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  switch (kind) {
    case "skull": {
      ctx.fillStyle = "#f2f2f2";
      ctx.beginPath();
      ctx.arc(0, -4, 16, Math.PI, 0);
      ctx.lineTo(14, 10);
      ctx.quadraticCurveTo(0, 18, -14, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.stroke();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, -6);
      ctx.lineTo(-3, -1);
      ctx.moveTo(-3, -6);
      ctx.lineTo(-8, -1);
      ctx.moveTo(3, -6);
      ctx.lineTo(8, -1);
      ctx.moveTo(8, -6);
      ctx.lineTo(3, -1);
      ctx.stroke();
      break;
    }
    case "heart": {
      ctx.fillStyle = colors.fill;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.bezierCurveTo(-22, 0, -14, -16, 0, -6);
      ctx.bezierCurveTo(14, -16, 22, 0, 0, 14);
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.stroke();
      break;
    }
    case "bolt": {
      ctx.fillStyle = colors.fill;
      ctx.beginPath();
      ctx.moveTo(2, -18);
      ctx.lineTo(-8, 2);
      ctx.lineTo(2, 2);
      ctx.lineTo(-2, 18);
      ctx.lineTo(10, -2);
      ctx.lineTo(0, -2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.stroke();
      break;
    }
    case "star": {
      ctx.fillStyle = colors.fill;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const b = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.lineTo(Math.cos(b) * 8, Math.sin(b) * 8);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.stroke();
      break;
    }
    case "flame": {
      ctx.fillStyle = colors.fill;
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.quadraticCurveTo(-16, 4, -8, -10);
      ctx.quadraticCurveTo(-2, 2, 0, -16);
      ctx.quadraticCurveTo(4, 0, 10, -6);
      ctx.quadraticCurveTo(16, 6, 0, 16);
      ctx.fill();
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.quadraticCurveTo(-6, 2, -2, -4);
      ctx.quadraticCurveTo(2, 4, 6, 0);
      ctx.quadraticCurveTo(8, 8, 0, 10);
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.quadraticCurveTo(-16, 4, -8, -10);
      ctx.quadraticCurveTo(-2, 2, 0, -16);
      ctx.quadraticCurveTo(4, 0, 10, -6);
      ctx.quadraticCurveTo(16, 6, 0, 16);
      ctx.stroke();
      break;
    }
    case "diamond": {
      ctx.fillStyle = colors.fill;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(16, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(-16, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(8, 0);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

export function drawSticker(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  x: number,
  y: number,
  s: number,
  opts?: { flash?: number; scale?: number },
): void {
  const pad = s * 0.06;
  const scale = opts?.scale ?? 1;
  const cx = x + s / 2;
  const cy = y + s / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  // White die-cut border
  ctx.fillStyle = "#f7f7f2";
  roundRect(ctx, x + pad * 0.3, y + pad * 0.3, s - pad * 0.6, s - pad * 0.6, s * 0.16);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Inner color face
  const colors = COLORS[kind];
  ctx.fillStyle = colors.fill;
  roundRect(ctx, x + pad * 1.4, y + pad * 1.4, s - pad * 2.8, s - pad * 2.8, s * 0.12);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  drawIcon(ctx, kind, cx, cy, s / 92);

  if (opts?.flash && opts.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 * opts.flash})`;
    roundRect(ctx, x + pad * 0.3, y + pad * 0.3, s - pad * 0.6, s - pad * 0.6, s * 0.16);
    ctx.fill();
  }

  ctx.restore();
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  opts: {
    title: string;
    moves: number;
    score: number;
    goals: { kind: TileKind; need: number; have: number }[];
  },
): void {
  // Title scrap
  drawPaperScrap(ctx, 40, 36, 280, 64, "#f3efe6", { rotate: -0.02 });
  drawTape(ctx, 52, 28, 70, 18, "#ff2d6a", -0.18);
  ctx.fillStyle = "#111";
  ctx.font = "800 34px 'Permanent Marker', 'Comic Sans MS', sans-serif";
  ctx.fillText("RIOT CUBE", 58, 78);

  // Moves
  drawPaperScrap(ctx, 360, 40, 150, 58, "#111", { rotate: 0.03 });
  ctx.fillStyle = "#c8ff3d";
  ctx.font = "700 18px 'Chakra Petch', sans-serif";
  ctx.fillText("MOVES", 378, 64);
  ctx.fillStyle = "#fff";
  ctx.font = "800 28px 'Chakra Petch', sans-serif";
  ctx.fillText(String(opts.moves), 378, 90);

  // Score
  drawPaperScrap(ctx, 530, 36, 150, 62, "#f3efe6", { rotate: -0.04 });
  drawTape(ctx, 620, 28, 50, 16, "#ffd60a", 0.2);
  ctx.fillStyle = "#111";
  ctx.font = "700 16px 'Chakra Petch', sans-serif";
  ctx.fillText("SCORE", 548, 60);
  ctx.font = "800 26px 'Chakra Petch', sans-serif";
  ctx.fillText(String(opts.score), 548, 88);

  // Goals panel
  drawPaperScrap(ctx, 40, 120, 640, 170, "#f7f3ea", { lined: true, rotate: 0.01 });
  drawTape(ctx, 70, 112, 90, 20, "#9ad0ff", -0.08);
  ctx.fillStyle = "#111";
  ctx.font = "800 22px 'Permanent Marker', sans-serif";
  ctx.fillText(opts.title + "  ·  GOALS", 70, 158);

  const slotW = 180;
  opts.goals.forEach((g, i) => {
    const gx = 70 + i * slotW;
    const gy = 180;
    drawSticker(ctx, g.kind, gx, gy, 56);
    ctx.fillStyle = "#111";
    ctx.font = "800 28px 'Chakra Petch', sans-serif";
    ctx.fillText(`${g.have}/${g.need}`, gx + 70, gy + 40);
  });
}

export function drawHint(ctx: CanvasRenderingContext2D, text: string): void {
  drawPaperScrap(ctx, 48, 1120, 624, 90, "#1b1b1b", { rotate: -0.01 });
  drawTape(ctx, 80, 1110, 64, 18, "#c8ff3d", 0.1);
  ctx.fillStyle = "#f3efe6";
  ctx.font = "600 22px 'Patrick Hand', sans-serif";
  ctx.fillText(text, 72, 1174);
}

export function drawEndOverlay(
  ctx: CanvasRenderingContext2D,
  opts: { won: boolean; score: number; stars: number },
): void {
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, 0, W, H);

  drawPaperScrap(ctx, 90, 420, 540, 360, opts.won ? "#f3efe6" : "#2a1a1a", {
    rotate: -0.015,
  });
  drawTape(ctx, 140, 408, 120, 24, opts.won ? "#c8ff3d" : "#ff2d6a", -0.12);

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

  // Retry button look
  drawPaperScrap(ctx, 200, 660, 320, 70, "#ff2d6a", { rotate: 0.02 });
  ctx.fillStyle = "#fff";
  ctx.font = "800 32px 'Chakra Petch', sans-serif";
  ctx.fillText(opts.won ? "AGAIN" : "RETRY", 300, 708);
}

export function hitRetry(x: number, y: number): boolean {
  return x >= 200 && x <= 520 && y >= 660 && y <= 730;
}
