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
}

export interface CaptureFlash {
  x: number;
  y: number;
  size: number;
  startTime: number;
  duration: number;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function drawMoveAnim(
  ctx: CanvasRenderingContext2D,
  anim: MoveAnim,
  now: number,
  cellSize: number,
): boolean {
  const elapsed = now - anim.startTime;
  if (elapsed >= anim.duration) return false;
  const t = easeOutCubic(elapsed / anim.duration);
  const x = lerp(anim.fromX, anim.toX, t);
  const y = lerp(anim.fromY, anim.toY, t);
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;
  const lift = Math.sin(t * Math.PI) * cellSize * 0.06;

  drawThemePiece(ctx, anim.color, anim.kind, cx, cy - lift, cellSize, anim.piece);
  return true;
}

export function drawCaptureFlash(
  ctx: CanvasRenderingContext2D,
  flash: CaptureFlash,
  now: number,
): boolean {
  const elapsed = now - flash.startTime;
  if (elapsed >= flash.duration) return false;
  const t = elapsed / flash.duration;
  const alpha = (1 - t) * 0.55;
  const cx = flash.x + flash.size / 2;
  const cy = flash.y + flash.size / 2;
  const r = flash.size * (0.35 + t * 0.45);

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  if (Theme.id === "nexus") {
    g.addColorStop(0, `rgba(160,230,255,${alpha})`);
    g.addColorStop(1, "rgba(80,160,220,0)");
  } else {
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
  }
  ctx.fillStyle = g;
  ctx.fillRect(flash.x - flash.size * 0.2, flash.y - flash.size * 0.2, flash.size * 1.4, flash.size * 1.4);
  return true;
}

export function nexusPulseAlpha(time: number): number {
  return 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * 3));
}
