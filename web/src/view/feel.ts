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

export function clearFeel(): void {
  rings = [];
  flecks = [];
  winFlashBorn = -1;
}

function pushRing(x: number, y: number, now: number, color: string, maxR: number, life = 0.42, width = 2.2): void {
  rings.push({ x, y, born: now, life, maxR, color, width });
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

/** Quiet paper burst when the circuit closes. */
export function triggerVictoryFeel(layout: Layout, receivers: Vec2[], now: number): void {
  winFlashBorn = now;
  const theme = getThemeId();
  const calm = isLightTheme(theme);
  const palette = calm
    ? [P.INK, P.INK_SOFT, P.SHADE, P.PAPER_DARK]
    : [P.CH0, P.CH1, P.CH2, P.TABLE, P.SELECT, P.BLOCK];
  const points = receivers.length ? receivers : [{ x: 0, y: 0 }];
  points.forEach((p, idx) => {
    const c = receivers.length ? cellCenter(layout, p) : { x: W / 2, y: H * 0.42 };
    const t = now + idx * 0.05;
    pushRing(c.x, c.y, t, calm ? P.INK : P.CH0, layout.cell * 0.85, 0.65, 2);
    pushRing(c.x, c.y, t + 0.08, P.INK_HAIR, layout.cell * 1.15, 0.5, 1.4);
    const n = calm ? 6 : 10;
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
      const a = (1 - t) * (theme === "retro" || theme === "mono" ? 0.22 : theme === "dusk" ? 0.16 : calm ? 0.1 : 0.14);
      ctx.save();
      ctx.fillStyle =
        theme === "retro"
          ? `rgba(199,125,255,${a})`
          : theme === "dusk"
            ? `rgba(90,214,165,${a * 0.8})`
          : theme === "mono"
            ? `rgba(255,255,255,${a})`
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
    if (theme === "retro") {
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 8 * (1 - u);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
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
