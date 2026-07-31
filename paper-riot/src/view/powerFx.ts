/** Staged power-up overlays — each power gets its own short theatrical beat. */

import type { PowerUpKind } from "../core/types";
import { powerImage, stickerImage } from "./stickers";
import { burstAt, styleForPower } from "./particles";

export type PowerFx =
  | {
      kind: "plane";
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      passengerKind?: string;
      /** Board cell id to hide while the passenger is in flight. */
      hideId?: number;
      t: number;
      started: number;
      dur: number;
    }
  | {
      kind: "rocket";
      x: number;
      y0: number;
      y1: number;
      t: number;
      started: number;
      dur: number;
      lastBurstRow: number;
      rowH: number;
    }
  | {
      kind: "bomb";
      x: number;
      y: number;
      t: number;
      started: number;
      dur: number;
    }
  | {
      kind: "magnet";
      x: number;
      y: number;
      pulls: { x: number; y: number }[];
      t: number;
      started: number;
      dur: number;
    }
  | {
      kind: "stapler";
      cells: { x: number; y: number }[];
      t: number;
      started: number;
      dur: number;
    }
  | {
      kind: "disco";
      cells: { x: number; y: number }[];
      t: number;
      started: number;
      dur: number;
      lastPop: number;
    };

let active: PowerFx | null = null;
let waitResolve: (() => void) | null = null;

export function getPowerFx(): PowerFx | null {
  return active;
}

export function powerFxHideId(): number | null {
  return active && active.kind === "plane" && active.hideId != null
    ? active.hideId
    : null;
}

export function powerFxBusy(): boolean {
  return active != null && active.t < 1;
}

function finish(): void {
  active = null;
  const done = waitResolve;
  waitResolve = null;
  done?.();
}

function begin(fx: PowerFx): Promise<void> {
  active = fx;
  return new Promise((resolve) => {
    waitResolve = resolve;
  });
}

/** Advance overlay; returns true while still animating. */
export function updatePowerFx(ts: number): boolean {
  if (!active) return false;
  active.t = (ts - active.started) / active.dur;

  if (active.kind === "rocket" && active.t < 1) {
    const y = active.y0 + (active.y1 - active.y0) * Math.min(1, active.t);
    const row = Math.floor((active.y0 - y) / Math.max(1, active.rowH));
    if (row > active.lastBurstRow) {
      active.lastBurstRow = row;
      burstAt(active.x, y, 4, "bits");
    }
  }

  if (active.kind === "disco" && active.t < 1) {
    const idx = Math.floor(active.t * active.cells.length);
    if (idx > active.lastPop && idx < active.cells.length) {
      active.lastPop = idx;
      const c = active.cells[idx]!;
      burstAt(c.x, c.y, 8, "confetti");
    }
  }

  if (active.t >= 1) {
    finish();
    return false;
  }
  return true;
}

export function startPlaneFlight(opts: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  passengerKind?: string;
  hideId?: number;
  dur?: number;
}): Promise<void> {
  return begin({
    kind: "plane",
    x0: opts.x0,
    y0: opts.y0,
    x1: opts.x1,
    y1: opts.y1,
    passengerKind: opts.passengerKind,
    hideId: opts.hideId,
    t: 0,
    started: performance.now(),
    dur: opts.dur ?? 640,
  });
}

export function startRocketFlight(opts: {
  x: number;
  y0: number;
  y1: number;
  rowH: number;
  dur?: number;
}): Promise<void> {
  return begin({
    kind: "rocket",
    x: opts.x,
    y0: opts.y0,
    y1: opts.y1,
    t: 0,
    started: performance.now(),
    dur: opts.dur ?? 520,
    lastBurstRow: -1,
    rowH: opts.rowH,
  });
}

export function startBombPulse(opts: {
  x: number;
  y: number;
  dur?: number;
}): Promise<void> {
  burstAt(opts.x, opts.y, 6, "puff");
  return begin({
    kind: "bomb",
    x: opts.x,
    y: opts.y,
    t: 0,
    started: performance.now(),
    dur: opts.dur ?? 380,
  });
}

export function startMagnetPull(opts: {
  x: number;
  y: number;
  pulls: { x: number; y: number }[];
  dur?: number;
}): Promise<void> {
  return begin({
    kind: "magnet",
    x: opts.x,
    y: opts.y,
    pulls: opts.pulls,
    t: 0,
    started: performance.now(),
    dur: opts.dur ?? 420,
  });
}

export function startStaplerRip(opts: {
  cells: { x: number; y: number }[];
  dur?: number;
}): Promise<void> {
  return begin({
    kind: "stapler",
    cells: opts.cells,
    t: 0,
    started: performance.now(),
    dur: opts.dur ?? 400,
  });
}

export function startDiscoParty(opts: {
  cells: { x: number; y: number }[];
  dur?: number;
}): Promise<void> {
  return begin({
    kind: "disco",
    cells: opts.cells,
    t: 0,
    started: performance.now(),
    dur: opts.dur ?? 560,
    lastPop: -1,
  });
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Draw the active power overlay on top of the board. */
export function drawPowerFx(ctx: CanvasRenderingContext2D): void {
  if (!active || active.t >= 1) return;
  const t = Math.max(0, Math.min(1, active.t));

  if (active.kind === "plane") {
    const u = easeInOut(t);
    const x = active.x0 + (active.x1 - active.x0) * u;
    const y =
      active.y0 + (active.y1 - active.y0) * u - Math.sin(u * Math.PI) * 70;
    const ang = Math.atan2(active.y1 - active.y0, active.x1 - active.x0);
    const bank = Math.sin(u * Math.PI) * 0.35;
    const img = powerImage("plane");
    const pass = active.passengerKind
      ? stickerImage(active.passengerKind)
      : null;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + bank);
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    if (pass && pass.complete) {
      ctx.globalAlpha = 0.92;
      ctx.drawImage(pass, -22, -10, 36, 36);
      ctx.globalAlpha = 1;
    }
    if (img && img.complete) {
      ctx.drawImage(img, -34, -34, 68, 68);
    } else {
      ctx.fillStyle = "#f4efe8";
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(-22, -16);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-22, 16);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    if (t > 0.08 && Math.random() < 0.45) {
      burstAt(x - Math.cos(ang) * 18, y - Math.sin(ang) * 18, 1, "puff");
    }
    return;
  }

  if (active.kind === "rocket") {
    const u = easeInOut(t);
    const y = active.y0 + (active.y1 - active.y0) * u;
    const img = powerImage("rocket");
    ctx.save();
    ctx.translate(active.x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.shadowColor = "rgba(255,120,40,0.45)";
    ctx.shadowBlur = 16;
    if (img && img.complete) ctx.drawImage(img, -32, -32, 64, 64);
    else {
      ctx.fillStyle = "#ff6a3d";
      ctx.fillRect(-10, -28, 20, 56);
    }
    ctx.restore();
    return;
  }

  if (active.kind === "bomb") {
    const pulse = 1 + Math.sin(t * Math.PI * 3) * 0.18;
    const img = powerImage("bomb");
    ctx.save();
    ctx.translate(active.x, active.y);
    ctx.scale(pulse, pulse);
    ctx.globalAlpha = 0.35 + 0.65 * Math.sin(t * Math.PI);
    if (img && img.complete) ctx.drawImage(img, -40, -40, 80, 80);
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255,80,40,${0.7 * (1 - t)})`;
    ctx.lineWidth = 4;
    ctx.arc(0, 0, 28 + t * 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (active.kind === "magnet") {
    const img = powerImage("magnet");
    const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.1;
    ctx.save();
    ctx.translate(active.x, active.y);
    ctx.scale(pulse, pulse);
    if (img && img.complete) ctx.drawImage(img, -36, -36, 72, 72);
    ctx.restore();
    ctx.strokeStyle = `rgba(120,180,255,${0.55 * (1 - t)})`;
    ctx.lineWidth = 3;
    for (const p of active.pulls) {
      const u = easeInOut(t);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + (active.x - p.x) * u, p.y + (active.y - p.y) * u);
      ctx.stroke();
    }
    return;
  }

  if (active.kind === "stapler") {
    const img = powerImage("stapler");
    const u = easeInOut(Math.min(1, t * 1.4));
    let sx = 0;
    let sy = 0;
    for (const c of active.cells) {
      sx += c.x;
      sy += c.y;
    }
    const n = Math.max(1, active.cells.length);
    const cx = sx / n;
    const cy = sy / n;
    ctx.save();
    ctx.strokeStyle = "rgba(20,20,20,0.75)";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    for (const c of active.cells) {
      ctx.strokeRect(c.x - 28, c.y - 28, 56, 56);
    }
    ctx.setLineDash([]);
    ctx.translate(cx, cy - 40 + u * 40);
    ctx.rotate((1 - u) * -0.4);
    if (img && img.complete) ctx.drawImage(img, -34, -34, 68, 68);
    ctx.restore();
    if (t > 0.55) {
      const rip = (t - 0.55) / 0.45;
      ctx.fillStyle = `rgba(10,10,10,${0.2 * (1 - rip)})`;
      for (const c of active.cells) {
        ctx.beginPath();
        ctx.arc(c.x, c.y + rip * 30, 20 + rip * 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  if (active.kind === "disco") {
    const img = powerImage("disco");
    const u = easeInOut(t);
    for (let i = 0; i < active.cells.length; i++) {
      const c = active.cells[i]!;
      const appear = Math.max(0, Math.min(1, t * active.cells.length - i));
      if (appear <= 0) continue;
      ctx.save();
      ctx.globalAlpha = appear;
      ctx.translate(c.x, c.y);
      ctx.rotate(u * Math.PI * 2 + i);
      ctx.scale(0.7 + appear * 0.5, 0.7 + appear * 0.5);
      if (img && img.complete) ctx.drawImage(img, -28, -28, 56, 56);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = Math.sin(t * Math.PI);
    ctx.fillStyle = "#b8ff4a";
    ctx.font = "800 36px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 5;
    const mid = active.cells[0] ?? { x: 360, y: 400 };
    ctx.strokeText("+5 MOVES", mid.x, mid.y - 70);
    ctx.fillText("+5 MOVES", mid.x, mid.y - 70);
    ctx.restore();
  }
}

export function powerBurstStyle(kind: PowerUpKind) {
  return styleForPower(kind);
}
