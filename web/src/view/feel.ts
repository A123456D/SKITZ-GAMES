import type { Vec2 } from "../core/cellKind";
import type { TurnResult } from "../core/beamSolver";
import { colors as P, getThemeId, isLightTheme } from "./palette";
import { cellCenter, type Layout, W, H } from "./draw";

type Ring = {
  x: number;
  y: number;
  born: number;
  life: number;
  maxR: number;
  color: string;
  width: number;
};

type Fleck = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  size: number;
  color: string;
  rot: number;
  spin: number;
};

let rings: Ring[] = [];
let flecks: Fleck[] = [];
let winFlashBorn = -1;

// A dense 8x8 win touches 64 hubs; unbounded ripples and confetti there cost
// more than the whole board draw, which showed up as a stutter on the win card.
// Headroom so a multi-link rotation never has its connect sparks dropped.
const MAX_RINGS = 72;
const MAX_FLECKS = 180;

export function clearFeel(): void {
  rings = [];
  flecks = [];
  winFlashBorn = -1;
}

function pushRing(x: number, y: number, now: number, color: string, maxR: number, life = 0.42, width = 2.2): void {
  if (rings.length >= MAX_RINGS) return;
  rings.push({ x, y, born: now, life, maxR, color, width });
}

function pushFleck(
  x: number,
  y: number,
  now: number,
  color: string,
  speed: number,
  angle: number,
  size: number,
  life = 0.38,
): void {
  if (flecks.length >= MAX_FLECKS) return;
  flecks.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 8,
    born: now,
    life,
    size,
    color,
    rot: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 6,
  });
}

/**
 * Soft ink ripples on matched hubs after a check — paper language, not neon.
 * Dense nets use beam segments between disc hubs; ring every unique hub.
 */
export function triggerRouteAck(_state: unknown, layout: Layout, latent: TurnResult, now: number): void {
  const seen = new Set<string>();
  let delay = 0;
  for (const beam of latent.beams) {
    for (const seg of beam.segments) {
      for (const p of [seg.from, seg.to]) {
        const k = `${p.x},${p.y}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if (rings.length >= MAX_RINGS) continue;
        const c = cellCenter(layout, p);
        pushRing(c.x, c.y, now + delay, P.INK, layout.cell * 0.55, 0.4, 1.8);
        delay += 0.012;
      }
    }
  }
  // Problem cells get a quieter, wider ring so open ends read as soft stamps.
  for (const p of latent.spillReceivers ?? []) {
    const k = `bad:${p.x},${p.y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const c = cellCenter(layout, p);
    pushRing(c.x, c.y, now, P.INK_FAINT, layout.cell * 0.7, 0.5, 1.4);
  }
}

/** Per-theme spark colours: [primary, secondary]. */
function connectColors(): [string, string] {
  switch (getThemeId()) {
    case "retro":
      return ["#FF6EC7", "#5CFFF8"];
    case "punk":
      return ["#C8FF00", "#FF2D95"];
    case "mono":
      return ["#FF2A2A", "#F4F4F6"];
    default:
      return [P.INK, P.INK_SOFT];
  }
}

/** One socket pop: tight ring pair plus a few outward flecks. */
function pushSocketPop(x: number, y: number, now: number, cell: number): void {
  const [main, accent] = connectColors();
  const r = cell * 0.19;
  pushRing(x, y, now, main, r, 0.3, 2.2);
  pushRing(x, y, now + 0.04, accent, r * 0.6, 0.24, 1.3);
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI * 2 * i) / 4 + Math.random() * 0.4;
    pushFleck(x, y, now, i % 2 ? accent : main, 24 + Math.random() * 20, a, 1.8, 0.3);
  }
}

/**
 * Satisfying pop on BOTH sockets of a newly matched edge, plus a bright seam
 * flash where the two rims meet. Kept small so it never fights the board.
 */
export function triggerSocketConnect(
  layout: Layout,
  from: { x: number; y: number },
  to: { x: number; y: number },
  now: number,
): void {
  const a = cellCenter(layout, from);
  const b = cellCenter(layout, to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Sockets sit inset from each hub centre, on the rim facing the neighbour.
  const inset = layout.cell * 0.3;
  const cell = layout.cell;

  pushSocketPop(a.x + ux * inset, a.y + uy * inset, now, cell);
  pushSocketPop(b.x - ux * inset, b.y - uy * inset, now, cell);

  // Seam flash right between the two sockets.
  const [main] = connectColors();
  pushRing((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, now, main, cell * 0.16, 0.26, 1.6);
}

/** Quiet paper burst when the circuit closes. */
export function triggerVictoryFeel(layout: Layout, receivers: Vec2[], now: number): void {
  winFlashBorn = now;
  const theme = getThemeId();
  const calm = isLightTheme(theme);
  const palette = calm
    ? [P.INK, P.INK_SOFT, P.SHADE, P.PAPER_DARK]
    : [P.CH0, P.CH1, P.CH2, P.TABLE, P.SELECT, P.BLOCK];
  const all = receivers.length ? receivers : [{ x: 0, y: 0 }];
  // Spread the burst over a sample of hubs rather than every one.
  const budget = Math.max(1, Math.floor(MAX_RINGS / 2));
  const stride = Math.max(1, Math.ceil(all.length / budget));
  const points = all.filter((_, i) => i % stride === 0);
  const perPoint = Math.max(3, Math.floor(MAX_FLECKS / points.length));
  points.forEach((p, idx) => {
    const c = receivers.length ? cellCenter(layout, p) : { x: W / 2, y: H * 0.42 };
    const t = now + idx * 0.05;
    pushRing(c.x, c.y, t, calm ? P.INK : P.CH0, layout.cell * 0.85, 0.65, 2);
    pushRing(c.x, c.y, t + 0.08, P.INK_HAIR, layout.cell * 1.15, 0.5, 1.4);
    const n = Math.min(calm ? 6 : 10, perPoint);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const speed = (calm ? 28 : 40) + Math.random() * (calm ? 40 : 70);
      flecks.push({
        x: c.x,
        y: c.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 16,
        born: t,
        life: 0.65 + Math.random() * 0.3,
        size: 2 + Math.random() * (calm ? 2.5 : 3.5),
        color: palette[i % palette.length]!,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 5,
      });
    }
  });
  pushRing(W / 2, H * 0.42, now, P.INK_HAIR, calm ? 140 : 180, 0.8, 1.1);
}

export function drawFeel(ctx: CanvasRenderingContext2D, now: number): void {
  const theme = getThemeId();
  const calm = isLightTheme(theme);

  if (winFlashBorn >= 0) {
    const t = (now - winFlashBorn) / 0.55;
    if (t < 1) {
      const a = (1 - t) * (theme === "retro" ? 0.22 : calm ? 0.1 : 0.14);
      ctx.save();
      ctx.fillStyle =
        theme === "retro"
          ? `rgba(199,125,255,${a})`
          : theme === "punk"
            ? `rgba(200,255,0,${a})`
            : theme === "mono"
              ? `rgba(255,42,42,${a})`
              : `rgba(255,255,255,${a})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  ctx.save();
  rings = rings.filter((r) => now - r.born < r.life + 0.05);
  for (const r of rings) {
    const u = Math.max(0, Math.min(1, (now - r.born) / r.life));
    if (u >= 1) continue;
    const ease = 1 - (1 - u) * (1 - u);
    const rad = r.maxR * (0.25 + ease * 0.75);
    const alpha = (1 - u) * (1 - u) * (calm ? 0.65 : 0.85);
    ctx.beginPath();
    ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1, r.width * (1 - u * 0.7));
    // A win can spawn a ring per disc, so no per-ring blur: on retro the extra
    // weight comes from a second wider stroke instead.
    if (theme === "retro") {
      ctx.globalAlpha = alpha * 0.35;
      ctx.lineWidth = Math.max(1, r.width * (1 - u * 0.7)) * 2.4;
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(1, r.width * (1 - u * 0.7));
    }
    ctx.stroke();
  }

  flecks = flecks.filter((f) => now - f.born < f.life);
  for (const f of flecks) {
    const age = now - f.born;
    const u = age / f.life;
    const x = f.x + f.vx * age;
    const y = f.y + f.vy * age + 50 * age * age;
    const rot = f.rot + f.spin * age;
    ctx.globalAlpha = (1 - u) * (1 - u) * (calm ? 0.7 : 0.9);
    ctx.fillStyle = f.color;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size * 0.55);
    ctx.restore();
  }
  ctx.restore();
}
