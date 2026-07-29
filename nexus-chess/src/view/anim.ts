export interface MoveAnim {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  piece: string;
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

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function drawMoveAnim(
  ctx: CanvasRenderingContext2D,
  anim: MoveAnim,
  now: number,
  cellSize: number,
): boolean {
  const elapsed = now - anim.startTime;
  if (elapsed >= anim.duration) return false;
  const t = easeOut(elapsed / anim.duration);
  const x = lerp(anim.fromX, anim.toX, t);
  const y = lerp(anim.fromY, anim.toY, t);
  ctx.font = `${cellSize * 0.75}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(anim.piece, x + cellSize / 2, y + cellSize / 2);
  return true;
}

export function drawCaptureFlash(
  ctx: CanvasRenderingContext2D,
  flash: CaptureFlash,
  now: number,
): boolean {
  const elapsed = now - flash.startTime;
  if (elapsed >= flash.duration) return false;
  const alpha = 1 - elapsed / flash.duration;
  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
  ctx.fillRect(flash.x, flash.y, flash.size, flash.size);
  return true;
}

export function nexusPulseAlpha(time: number): number {
  return 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * 3));
}
