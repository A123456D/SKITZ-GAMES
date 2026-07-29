import { Theme } from "./theme";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number = Theme.radius,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Deep vignette + slow breathing center light. */
export function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time = 0,
) {
  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  const breathe = 0.7 + 0.12 * Math.sin(time * 0.7);
  const cx = width * 0.5;
  const cy = height * 0.38;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.58);
  glow.addColorStop(0, `rgba(255,255,255,${0.07 * breathe})`);
  glow.addColorStop(0.4, `rgba(255,255,255,${0.022 * breathe})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const vig = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
}

/** Soft pedestal shadow so the board floats. */
export function drawBoardShadow(
  ctx: CanvasRenderingContext2D,
  boardX: number,
  boardY: number,
  boardSize: number,
) {
  const pad = 18;
  const shadow = ctx.createRadialGradient(
    boardX + boardSize / 2,
    boardY + boardSize * 0.55,
    boardSize * 0.15,
    boardX + boardSize / 2,
    boardY + boardSize * 0.6,
    boardSize * 0.72,
  );
  shadow.addColorStop(0, "rgba(0,0,0,0.55)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(boardX - pad, boardY - pad * 0.4, boardSize + pad * 2, boardSize + pad * 1.4);
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: boolean; strong?: boolean } = {},
) {
  if (opts.fill !== false) {
    ctx.fillStyle = Theme.btnFill;
    roundRectPath(ctx, x, y, w, h);
    ctx.fill();
  }
  ctx.strokeStyle = opts.strong ? Theme.hairlineStrong : Theme.hairline;
  ctx.lineWidth = 1;
  roundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.stroke();
}

export function drawPremiumBtn(
  ctx: CanvasRenderingContext2D,
  b: Rect,
  label: string,
  opts: {
    primary?: boolean;
    active?: boolean;
    muted?: boolean;
    sub?: string;
    fontSize?: number;
  } = {},
) {
  const { x, y, w, h } = b;
  const fontSize = opts.fontSize ?? 15;

  if (opts.primary) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "rgba(255,255,255,0.22)");
    g.addColorStop(0.5, "rgba(255,255,255,0.14)");
    g.addColorStop(1, "rgba(255,255,255,0.08)");
    ctx.fillStyle = g;
    roundRectPath(ctx, x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
  } else if (opts.active) {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRectPath(ctx, x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = Theme.hairlineBright;
  } else {
    ctx.fillStyle = Theme.btnFill;
    roundRectPath(ctx, x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = opts.muted ? Theme.inkFaint : Theme.hairline;
  }

  ctx.lineWidth = 1;
  roundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = opts.muted
    ? Theme.inkMute
    : opts.primary || opts.active
      ? Theme.ink
      : Theme.inkDim;

  if (opts.sub) {
    ctx.font = `500 ${fontSize}px ${Theme.font}`;
    ctx.fillText(label, x + w / 2, y + h / 2 - 7);
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 ${Math.max(10, fontSize - 2)}px ${Theme.font}`;
    ctx.fillText(opts.sub, x + w / 2, y + h / 2 + 11);
  } else {
    ctx.font = `500 ${fontSize}px ${Theme.font}`;
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  }
}
