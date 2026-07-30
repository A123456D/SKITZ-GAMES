import { Theme } from "./theme";
import { drawThemePiece } from "./pieces";
import type { Color, PieceKind } from "../core/types";

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
  nexus?: boolean;
}

export interface BoardFx {
  pulses: {
    x: number;
    y: number;
    start: number;
    duration: number;
    maxR: number;
    color: string;
    lineW: number;
  }[];
  sparks: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    born: number;
    life: number;
    size: number;
    hue: "accent" | "warm";
  }[];
}

export interface WinFx {
  start: number;
  duration: number;
  winner: Color;
}

export function createBoardFx(): BoardFx {
  return { pulses: [], sparks: [] };
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

export function easeOutBack(t: number): number {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

/** Smooth horizontal travel with ease. */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

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

export function spawnLandFx(
  fx: BoardFx,
  x: number,
  y: number,
  size: number,
  now: number,
  capture: boolean,
  nexusCapture = false,
) {
  const cx = x + size / 2;
  const cy = y + size / 2 + size * 0.08;
  const accent = Theme.pulseRgba;

  fx.pulses.push({
    x: cx,
    y: cy,
    start: now,
    duration: capture ? 340 : 220,
    maxR: size * (capture ? (nexusCapture ? 1.15 : 0.85) : 0.52),
    color: accent,
    lineW: capture ? (nexusCapture ? 4 : 3.2) : 2.4,
  });

  if (capture) {
    fx.pulses.push({
      x: cx,
      y: cy,
      start: now + 40,
      duration: 320,
      maxR: size * (nexusCapture ? 1.35 : 1.05),
      color: accent,
      lineW: 2.2,
    });

    const n = nexusCapture ? 18 : 12;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.35;
      const spd = size * (0.55 + Math.random() * 0.85) * (nexusCapture ? 1.25 : 1);
      fx.sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - size * 0.15,
        born: now,
        life: 280 + Math.random() * 220,
        size: 1.6 + Math.random() * 2.4,
        hue: i % 3 === 0 ? "warm" : "accent",
      });
    }
  }
}

export function updateBoardFx(fx: BoardFx, dt: number, now: number) {
  fx.pulses = fx.pulses.filter((p) => now - p.start < p.duration && now >= p.start);
  const sec = dt / 1000;
  for (const s of fx.sparks) {
    s.x += s.vx * sec;
    s.y += s.vy * sec;
    s.vy += 420 * sec;
    s.vx *= 0.98;
  }
  fx.sparks = fx.sparks.filter((s) => now - s.born < s.life);
}

export function drawBoardFx(ctx: CanvasRenderingContext2D, fx: BoardFx, now: number) {
  for (const p of fx.pulses) {
    if (now < p.start) continue;
    const t = (now - p.start) / p.duration;
    if (t < 0 || t > 1) continue;
    const rad = p.maxR * easeOutCubic(t);
    const a = (1 - t) * (1 - t) * 0.85;
    ctx.strokeStyle = `${p.color}${a})`;
    ctx.lineWidth = Math.max(1, p.lineW * (1 - t * 0.7));
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, rad), 0, Math.PI * 2);
    ctx.stroke();

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

  for (const s of fx.sparks) {
    const t = (now - s.born) / s.life;
    if (t < 0 || t > 1) continue;
    const a = (1 - t) * (1 - t);
    ctx.fillStyle =
      s.hue === "warm" ? `rgba(255,180,120,${0.85 * a})` : `${Theme.pulseRgba}${0.9 * a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, Math.max(0.6, s.size * (1 - t * 0.5)), 0, Math.PI * 2);
    ctx.fill();
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

  if (t > 0.55 && t < 0.9) {
    const tt = Math.max(0, t - 0.05);
    const tx = lerp(anim.fromX, anim.toX, easeInOutQuad(tt)) + cellSize / 2;
    const ty = lerp(anim.fromY, anim.toY, easeInOutQuad(tt)) + cellSize / 2 - jumpLift(tt, cellSize);
    ctx.save();
    ctx.globalAlpha = 0.18;
    drawThemePiece(ctx, anim.color, anim.kind, tx, ty, cellSize, anim.piece);
    ctx.restore();
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
  if (elapsed < 0) return true;
  if (elapsed >= flash.duration) return false;
  const t = elapsed / flash.duration;
  const alpha = (1 - t) * (1 - t) * (flash.nexus ? 0.95 : 0.75);
  const cx = flash.x + flash.size / 2;
  const cy = flash.y + flash.size / 2;
  const rad = flash.size * (0.2 + easeOutCubic(t) * (flash.nexus ? 0.75 : 0.55));

  ctx.strokeStyle = `${Theme.pulseRgba}${alpha})`;
  ctx.lineWidth = Math.max(1.5, (flash.nexus ? 4.2 : 3.2) * (1 - t));
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();

  if (flash.nexus) {
    ctx.strokeStyle = `rgba(255,160,140,${alpha * 0.55})`;
    ctx.lineWidth = Math.max(1, 2 * (1 - t));
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.72, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (t < 0.5) {
    const a2 = (1 - t / 0.5) * 0.45;
    ctx.strokeStyle = `${Theme.pulseRgba}${a2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
  return true;
}

/** Full-screen win flourish with animated Nexus crown+X mark. */
export function drawWinCinematic(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fx: WinFx,
  now: number,
  mark: HTMLImageElement | null,
) {
  const t = Math.min(1, (now - fx.start) / fx.duration);
  const fadeIn = Math.min(1, t / 0.18);
  const fadeOut = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
  const a = fadeIn * fadeOut;

  ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`;
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height * 0.42;
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);

  for (let i = 0; i < 3; i++) {
    const rt = Math.min(1, Math.max(0, (t - i * 0.08) / 0.55));
    if (rt <= 0) continue;
    const rad = Math.min(width, height) * (0.12 + easeOutCubic(rt) * 0.38 + i * 0.04);
    ctx.strokeStyle = `${Theme.pulseRgba}${(1 - rt) * 0.55 * a})`;
    ctx.lineWidth = 2.5 - i * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (mark && mark.complete && mark.naturalWidth > 0) {
    const pop = easeOutBack(Math.min(1, t / 0.35));
    const breathe = 1 + 0.04 * Math.sin(now * 0.006);
    const markH = Math.min(width, height) * 0.34 * pop * breathe;
    const aspect = mark.naturalWidth / Math.max(1, mark.naturalHeight);
    const markW = markH * aspect;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(now * 0.002) * 0.04);
    ctx.globalAlpha = 0.2 * a;
    ctx.drawImage(mark, -markW * 0.58, -markH * 0.58, markW * 1.16, markH * 1.16);
    ctx.globalAlpha = (0.75 + 0.2 * pulse) * a;
    ctx.drawImage(mark, -markW / 2, -markH / 2, markW, markH);
    ctx.restore();
  }

  ctx.fillStyle = `rgba(255,255,255,${0.92 * a})`;
  ctx.font = `600 ${Math.min(44, width * 0.09)}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const title = fx.winner === "w" ? "White wins" : "Black wins";
  ctx.fillText(title, cx, height * 0.72);

  ctx.fillStyle = `${Theme.pulseRgba}${0.75 * a})`;
  ctx.font = `500 ${Math.min(16, width * 0.035)}px ${Theme.font}`;
  ctx.fillText("NEXUS", cx, height * 0.72 + 36);
}

export function nexusPulseAlpha(time: number): number {
  return 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * 3));
}
