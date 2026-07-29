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
  /** streak length for hard sparks */
  len?: number;
}

export interface BoardFx {
  particles: FxParticle[];
  /** Hard impact rays (not soft rings) */
  rays: { x: number; y: number; start: number; duration: number; angles: number[]; maxLen: number; color: string }[];
  /** Brief hard flash plates */
  flashes: { x: number; y: number; start: number; duration: number; size: number }[];
}

export function createBoardFx(): BoardFx {
  return { particles: [], rays: [], flashes: [] };
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
  const cy = y + size / 2;
  const accent = Theme.id === "nexus" ? "rgba(180,235,255," : "rgba(255,255,255,";

  const rayCount = capture ? 10 : 7;
  const angles: number[] = [];
  for (let i = 0; i < rayCount; i++) {
    angles.push((Math.PI * 2 * i) / rayCount + (Math.random() - 0.5) * 0.25);
  }
  fx.rays.push({
    x: cx,
    y: cy + size * 0.18,
    start: now,
    duration: capture ? 220 : 160,
    angles,
    maxLen: size * (capture ? 0.62 : 0.42),
    color: accent,
  });

  fx.flashes.push({
    x: cx,
    y: cy + size * 0.12,
    start: now,
    duration: capture ? 90 : 60,
    size: size * (capture ? 0.55 : 0.38),
  });

  const n = capture ? 16 : 9;
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.35;
    const spd = (capture ? 3.4 : 2.2) * (0.7 + Math.random() * 0.9) * (size / 48);
    fx.particles.push({
      x: cx + Math.cos(ang) * size * 0.05,
      y: cy + size * 0.15,
      vx: Math.cos(ang) * spd * 90,
      vy: Math.sin(ang) * spd * 55 - 55,
      life: 0,
      maxLife: 140 + Math.random() * 120,
      size: 1.2 + Math.random() * 1.6,
      len: 6 + Math.random() * 10,
      color: Theme.id === "nexus" ? "#c8f0ff" : "#f4f4f5",
    });
  }
}

export function updateBoardFx(fx: BoardFx, dt: number, now: number) {
  for (const p of fx.particles) {
    p.life += dt;
    p.x += p.vx * (dt / 1000);
    p.y += p.vy * (dt / 1000);
    p.vy += 680 * (dt / 1000);
    p.vx *= 0.98;
  }
  fx.particles = fx.particles.filter((p) => p.life < p.maxLife);
  fx.rays = fx.rays.filter((r) => now - r.start < r.duration);
  fx.flashes = fx.flashes.filter((f) => now - f.start < f.duration);
}

export function drawBoardFx(ctx: CanvasRenderingContext2D, fx: BoardFx, now: number) {
  for (const f of fx.flashes) {
    const t = (now - f.start) / f.duration;
    const a = (1 - t) * (1 - t) * 0.85;
    ctx.fillStyle = Theme.id === "nexus" ? `rgba(220,245,255,${a})` : `rgba(255,255,255,${a})`;
    const w = f.size * (0.55 + t * 0.35);
    const h = f.size * 0.14 * (1 - t * 0.4);
    // Hard plate flash, not a soft bubble
    ctx.fillRect(f.x - w / 2, f.y - h / 2, w, h);
    ctx.fillStyle = Theme.id === "nexus" ? `rgba(160,220,255,${a * 0.55})` : `rgba(255,255,255,${a * 0.45})`;
    ctx.fillRect(f.x - h / 2, f.y - w * 0.35, h, w * 0.7);
  }

  for (const r of fx.rays) {
    const t = (now - r.start) / r.duration;
    const a = (1 - t) * (1 - t) * 0.9;
    const len = r.maxLen * (0.35 + easeOutCubic(t) * 0.65);
    ctx.strokeStyle = `${r.color}${a})`;
    ctx.lineWidth = Math.max(1, 2.4 * (1 - t));
    ctx.lineCap = "butt";
    for (const ang of r.angles) {
      const inset = r.maxLen * 0.08;
      ctx.beginPath();
      ctx.moveTo(r.x + Math.cos(ang) * inset, r.y + Math.sin(ang) * inset);
      ctx.lineTo(r.x + Math.cos(ang) * len, r.y + Math.sin(ang) * len);
      ctx.stroke();
    }
  }

  for (const p of fx.particles) {
    const t = p.life / p.maxLife;
    const a = 1 - t;
    ctx.globalAlpha = a;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, p.size * (1 - t * 0.5));
    ctx.lineCap = "butt";
    const len = (p.len ?? 8) * (1 - t * 0.35);
    const speed = Math.hypot(p.vx, p.vy) || 1;
    const dx = (p.vx / speed) * len;
    const dy = (p.vy / speed) * len;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - dx, p.y - dy);
    ctx.stroke();
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
  const alpha = (1 - t) * (1 - t) * 0.9;
  const cx = flash.x + flash.size / 2;
  const cy = flash.y + flash.size / 2;

  // Hard white hit plate — no soft bubble glow
  ctx.fillStyle = Theme.id === "nexus" ? `rgba(210,240,255,${alpha * 0.55})` : `rgba(255,255,255,${alpha * 0.5})`;
  const inset = flash.size * (0.12 + t * 0.08);
  ctx.fillRect(flash.x + inset, flash.y + inset, flash.size - inset * 2, flash.size - inset * 2);

  ctx.strokeStyle = Theme.id === "nexus" ? `rgba(180,230,255,${alpha})` : `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(flash.x + 3, flash.y + 3, flash.size - 6, flash.size - 6);

  // Jagged shock spokes
  ctx.lineWidth = 1.75 * (1 - t * 0.5);
  const r0 = flash.size * 0.12;
  const r1 = flash.size * (0.38 + t * 0.35);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + t * 0.4;
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
