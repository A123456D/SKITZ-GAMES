import { Theme } from "./theme";

export interface MoveAnim {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  piece: string;
  color: "w" | "b";
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

  ctx.font = `${cellSize * 0.68}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = Theme.pieceShadow;
  ctx.fillText(anim.piece, cx + 0.5, cy + cellSize * 0.04 - lift * 0.3);

  if (anim.color === "w") {
    ctx.fillStyle = Theme.whitePiece;
    ctx.fillText(anim.piece, cx, cy - lift);
  } else {
    ctx.fillStyle = Theme.blackPiece;
    ctx.fillText(anim.piece, cx, cy - lift);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 0.8;
    ctx.strokeText(anim.piece, cx, cy - lift);
  }
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
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(flash.x - flash.size * 0.2, flash.y - flash.size * 0.2, flash.size * 1.4, flash.size * 1.4);
  return true;
}

export function nexusPulseAlpha(time: number): number {
  return 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * 3));
}
