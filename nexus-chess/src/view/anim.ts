import { Theme } from "./theme";
import { drawThemePiece } from "./pieces";
import type { PieceKind } from "../core/types";

export interface MoveAnim {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  piece: string;
  color: "w" | "b";
  kind: PieceKind;
  toSq?: string;
  isCapture?: boolean;
  landed?: boolean;
}

export interface CaptureFlash {
  x: number;
  y: number;
  size: number;
  startTime: number;
  duration: number;
}

export interface BoardFx {
  /** Expanding ring pulses on land / crash */
  pulses: {
    x: number;
    y: number;
    start: number;
    duration: number;
    maxR: number;
    color: string;
    lineW: number;
  }[];
}

export function createBoardFx(): BoardFx {
  return { pulses: [] };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

/** Smooth horizontal travel with ease. */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Jump arc: lift early, hang, then crash down hard near the end.
 */
export function jumpLift(t: number, cellSize: number): number {
  const peak = cellSize * 0.48;
  if (t < 0.38) {
    const u = t / 0.38;
    return peak * Math.sin((u * Math.PI) / 2);
  }
  if (t < 0.68) {
    const u = (t - 0.38) / 0.3;
    return peak * (1 - 0.08 * u);
  }
  const u = (t - 0.68) / 0.32;
  return peak * 0.92 * (1 - easeInCubic(u));
}

/** Squash/stretch scale for jump feel. */
export function jumpScale(t: number): { sx: number; sy: number } {
  if (t < 0.1) {
    const u = t / 0.1;
    return { sx: 1 + 0.16 * u, sy: 1 - 0.18 * u };
  }
  if (t < 0.32) {
    const u = (t - 0.1) / 0.22;
    return { sx: 1.16 - 0.24 * u, sy: 0.82 + 0.28 * u };
  }
  if (t > 0.82) {
    const u = (t - 0.82) / 0.18;
    const squash = Math.sin(Math.min(1, u) * Math.PI);
    return { sx: 1 + 0.28 * squash, sy: 1 - 0.34 * squash };
  }
  return { sx: 1, sy: 1 };
}

export function spawnLandFx(fx: BoardFx, x: number, y: number, size: number, now: number, capture: boolean) {
  const cx = x + size / 2;
  const cy = y + size / 2 + size * 0.08;
  const accent = Theme.id === "nexus" ? "rgba(170,230,255," : "rgba(255,255,255,";

  // Fast expanding pulse ring
  fx.pulses.push({
    x: cx,
    y: cy,
    start: now,
    duration: capture ? 280 : 220,
    maxR: size * (capture ? 0.72 : 0.52),
    color: accent,
    lineW: capture ? 3.2 : 2.4,
  });

  // Second beat for captures
  if (capture) {
    fx.pulses.push({
      x: cx,
      y: cy,
      start: now + 45,
      duration: 260,
      maxR: size * 0.95,
      color: accent,
      lineW: 2,
    });
  }
}

export function updateBoardFx(fx: BoardFx, _dt: number, now: number) {
  fx.pulses = fx.pulses.filter((p) => now - p.start < p.duration && now >= p.start);
}

export function drawBoardFx(ctx: CanvasRenderingContext2D, fx: BoardFx, now: number) {
  for (const p of fx.pulses) {
    if (now < p.start) continue;
    const t = (now - p.start) / p.duration;
    if (t < 0 || t > 1) continue;
    // Ease-out expand + fade — reads as a pulse, not a soft glow fill
    const rad = p.maxR * easeOutCubic(t);
    const a = (1 - t) * (1 - t) * 0.85;
    ctx.strokeStyle = `${p.color}${a})`;
    ctx.lineWidth = Math.max(1, p.lineW * (1 - t * 0.7));
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, rad), 0, Math.PI * 2);
    ctx.stroke();

    // Inner echo ring early in the pulse
    if (t < 0.45) {
      const innerT = t / 0.45;
      const innerA = (1 - innerT) * 0.4;
      ctx.strokeStyle = `${p.color}${innerA})`;
      ctx.lineWidth = Math.max(1, p.lineW * 0.55);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, rad * 0.55), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export function drawMoveAnim(
  ctx: CanvasRenderingContext2D,
  anim: MoveAnim,
  now: number,
  cellSize: number,
): { alive: boolean; justLanded: boolean } {
  const elapsed = now - anim.startTime;
  if (elapsed >= anim.duration) {
    return { alive: false, justLanded: !anim.landed };
  }

  const t = Math.min(1, elapsed / anim.duration);
  const travel = easeInOutQuad(t);
  const x = lerp(anim.fromX, anim.toX, travel);
  const y = lerp(anim.fromY, anim.toY, travel);
  const lift = jumpLift(t, cellSize);
  const { sx, sy } = jumpScale(t);

  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2 - lift;

  const shadowScale = 1 - Math.min(0.45, lift / (cellSize * 0.5)) * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.32 * shadowScale;
  ctx.fillStyle = Theme.pieceShadow;
  ctx.beginPath();
  ctx.ellipse(
    x + cellSize / 2,
    y + cellSize * 0.72,
    cellSize * 0.22 * shadowScale,
    cellSize * 0.07 * shadowScale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  // Short hard afterimage near peak, not a soft ghost trail
  if (t > 0.55 && t < 0.9) {
    const tt = Math.max(0, t - 0.05);
    const tx = lerp(anim.fromX, anim.toX, easeInOutQuad(tt)) + cellSize / 2;
    const ty = lerp(anim.fromY, anim.toY, easeInOutQuad(tt)) + cellSize / 2 - jumpLift(tt, cellSize);
    ctx.globalAlpha = 0.18;
    drawThemePiece(ctx, anim.color, anim.kind, tx, ty, cellSize * 0.92, anim.piece);
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);
  drawThemePiece(ctx, anim.color, anim.kind, 0, 0, cellSize, anim.piece);
  ctx.restore();

  const landThreshold = 0.86;
  const justLanded = !anim.landed && t >= landThreshold;
  if (justLanded) anim.landed = true;

  return { alive: true, justLanded };
}

export function drawCaptureFlash(
  ctx: CanvasRenderingContext2D,
  flash: CaptureFlash,
  now: number,
): boolean {
  const elapsed = now - flash.startTime;
  if (elapsed >= flash.duration) return false;
  const t = elapsed / flash.duration;
  const alpha = (1 - t) * (1 - t) * 0.75;
  const cx = flash.x + flash.size / 2;
  const cy = flash.y + flash.size / 2;
  const rad = flash.size * (0.2 + easeOutCubic(t) * 0.55);

  ctx.strokeStyle = Theme.id === "nexus" ? `rgba(180,230,255,${alpha})` : `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = Math.max(1.5, 3.2 * (1 - t));
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();

  if (t < 0.5) {
    const a2 = (1 - t / 0.5) * 0.45;
    ctx.strokeStyle = Theme.id === "nexus" ? `rgba(200,240,255,${a2})` : `rgba(255,255,255,${a2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
  return true;
}

export function nexusPulseAlpha(time: number): number {
  return 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * 3));
}
