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

export interface FxParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface BoardFx {
  particles: FxParticle[];
  rings: { x: number; y: number; start: number; duration: number; maxR: number; color: string }[];
  dust: { x: number; y: number; start: number; duration: number; size: number }[];
}

export function createBoardFx(): BoardFx {
  return { particles: [], rings: [], dust: [] };
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
 * Returns vertical lift (up is negative in canvas when subtracted from y).
 */
export function jumpLift(t: number, cellSize: number): number {
  // Asymmetric parabola — peak around 40%, steep fall after 70%
  const peak = cellSize * 0.42;
  if (t < 0.4) {
    const u = t / 0.4;
    return peak * Math.sin((u * Math.PI) / 2);
  }
  if (t < 0.7) {
    const u = (t - 0.4) / 0.3;
    return peak * (1 - 0.15 * u);
  }
  const u = (t - 0.7) / 0.3;
  return peak * 0.85 * (1 - easeInCubic(u));
}

/** Squash/stretch scale for jump feel. */
export function jumpScale(t: number): { sx: number; sy: number } {
  if (t < 0.12) {
    // crouch
    const u = t / 0.12;
    return { sx: 1 + 0.12 * u, sy: 1 - 0.14 * u };
  }
  if (t < 0.35) {
    // stretch on takeoff
    const u = (t - 0.12) / 0.23;
    return { sx: 1.12 - 0.2 * u, sy: 0.86 + 0.22 * u };
  }
  if (t > 0.85) {
    // squash on land
    const u = (t - 0.85) / 0.15;
    const squash = Math.sin(u * Math.PI);
    return { sx: 1 + 0.18 * squash, sy: 1 - 0.22 * squash };
  }
  return { sx: 1, sy: 1 };
}

export function spawnLandFx(fx: BoardFx, x: number, y: number, size: number, now: number, capture: boolean) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const accent = Theme.id === "nexus" ? "rgba(160,230,255," : "rgba(255,255,255,";

  fx.rings.push({
    x: cx,
    y: cy + size * 0.28,
    start: now,
    duration: capture ? 420 : 320,
    maxR: size * (capture ? 0.7 : 0.45),
    color: accent,
  });

  fx.dust.push({
    x: cx,
    y: cy + size * 0.32,
    start: now,
    duration: 280,
    size: size * 0.35,
  });

  const n = capture ? 18 : 10;
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const spd = (capture ? 2.2 : 1.4) * (0.6 + Math.random() * 0.8) * (size / 48);
    fx.particles.push({
      x: cx,
      y: cy + size * 0.2,
      vx: Math.cos(ang) * spd * 60,
      vy: Math.sin(ang) * spd * 40 - 40,
      life: 0,
      maxLife: 280 + Math.random() * 200,
      size: 1.5 + Math.random() * 2.5,
      color: Theme.id === "nexus" ? "#9fdfff" : "#f4f4f5",
    });
  }
}

export function updateBoardFx(fx: BoardFx, dt: number, now: number) {
  for (const p of fx.particles) {
    p.life += dt;
    p.x += p.vx * (dt / 1000);
    p.y += p.vy * (dt / 1000);
    p.vy += 420 * (dt / 1000);
  }
  fx.particles = fx.particles.filter((p) => p.life < p.maxLife);
  fx.rings = fx.rings.filter((r) => now - r.start < r.duration);
  fx.dust = fx.dust.filter((d) => now - d.start < d.duration);
}

export function drawBoardFx(ctx: CanvasRenderingContext2D, fx: BoardFx, now: number) {
  for (const d of fx.dust) {
    const t = (now - d.start) / d.duration;
    const a = (1 - t) * 0.25;
    const w = d.size * (1 + t * 1.4);
    const h = d.size * 0.22 * (1 - t * 0.3);
    ctx.fillStyle = Theme.id === "nexus" ? `rgba(140,200,240,${a})` : `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const r of fx.rings) {
    const t = (now - r.start) / r.duration;
    const rad = r.maxR * easeOutCubic(t);
    const a = (1 - t) * 0.55;
    ctx.strokeStyle = `${r.color}${a})`;
    ctx.lineWidth = 2 * (1 - t);
    ctx.beginPath();
    ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const p of fx.particles) {
    const t = p.life / p.maxLife;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
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

  // Motion shadow on board
  const shadowScale = 1 - Math.min(0.45, lift / (cellSize * 0.5)) * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.28 * shadowScale;
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

  // Soft trail
  if (t > 0.08 && t < 0.85) {
    for (let i = 1; i <= 3; i++) {
      const tt = Math.max(0, t - i * 0.04);
      const tx = lerp(anim.fromX, anim.toX, easeInOutQuad(tt)) + cellSize / 2;
      const ty = lerp(anim.fromY, anim.toY, easeInOutQuad(tt)) + cellSize / 2 - jumpLift(tt, cellSize);
      ctx.globalAlpha = 0.12 * (1 - i / 4);
      drawThemePiece(ctx, anim.color, anim.kind, tx, ty, cellSize * (0.9 - i * 0.04), anim.piece);
    }
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);
  drawThemePiece(ctx, anim.color, anim.kind, 0, 0, cellSize, anim.piece);
  ctx.restore();

  const landThreshold = 0.88;
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
  const alpha = (1 - t) * 0.65;
  const cx = flash.x + flash.size / 2;
  const cy = flash.y + flash.size / 2;
  const r = flash.size * (0.25 + t * 0.55);

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  if (Theme.id === "nexus") {
    g.addColorStop(0, `rgba(200,240,255,${alpha})`);
    g.addColorStop(0.45, `rgba(120,200,255,${alpha * 0.45})`);
    g.addColorStop(1, "rgba(40,100,160,0)");
  } else {
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
  }
  ctx.fillStyle = g;
  ctx.fillRect(flash.x - flash.size * 0.3, flash.y - flash.size * 0.3, flash.size * 1.6, flash.size * 1.6);

  // Shock lines
  ctx.strokeStyle = Theme.id === "nexus" ? `rgba(160,230,255,${alpha * 0.7})` : `rgba(255,255,255,${alpha * 0.6})`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + t;
    const r0 = r * 0.35;
    const r1 = r * 0.95;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
    ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
    ctx.stroke();
  }
  return true;
}

export function nexusPulseAlpha(time: number): number {
  return 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * 3));
}
