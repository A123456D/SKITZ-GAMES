import { Kind, type Vec2 } from "../core/cellKind";
import { getCell, type GridState } from "../core/gridState";
import type { TurnResult } from "../core/beamSolver";
import { channelColor, colors as P, getThemeId } from "./palette";
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

/** Soft pulse on optics the latent route now uses — shown right after a turn. */
export function triggerRouteAck(state: GridState, layout: Layout, latent: TurnResult, now: number): void {
  const seen = new Set<string>();
  const pulseKinds: ReadonlySet<number> = new Set([
    Kind.WORMHOLE,
    Kind.MIRROR,
    Kind.BARRIER,
    Kind.FILTER,
    Kind.SINK,
    Kind.RECEIVER,
    Kind.EMITTER,
  ]);

  for (const beam of latent.beams) {
    const color = channelColor(beam.channel ?? 0);
    for (const seg of beam.segments) {
      for (const p of [seg.from, seg.to]) {
        const k = `${p.x},${p.y}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const cell = getCell(state, p.x, p.y);
        if (!pulseKinds.has(cell.kind)) continue;
        const c = cellCenter(layout, p);
        const scale =
          cell.kind === Kind.WORMHOLE ? 0.55 : cell.kind === Kind.RECEIVER ? 0.48 : 0.4;
        const tint =
          cell.kind === Kind.WORMHOLE
            ? P.WORM
            : cell.kind === Kind.MIRROR
              ? P.MIRROR
              : cell.kind === Kind.BARRIER
                ? P.BARRIER
                : cell.kind === Kind.FILTER
                  ? P.FILTER
                  : cell.kind === Kind.SINK
                    ? P.SINK
                    : color;
        pushRing(c.x, c.y, now, tint, layout.cell * scale, 0.38, 2);
        // Tiny second echo on wormholes only — reads as a teleport kiss.
        if (cell.kind === Kind.WORMHOLE) {
          pushRing(c.x, c.y, now + 0.06, tint, layout.cell * 0.72, 0.32, 1.4);
        }
      }
    }
  }

  // Soft hub tick on tables the latent beams enter.
  for (const e of latent.events) {
    if (e.type !== "portEnter") continue;
    const k = `hub:${e.tableId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const c = cellCenter(layout, e.pos);
    pushRing(c.x, c.y, now, P.TABLE_OUTLINE, layout.cell * 0.62, 0.34, 1.8);
  }
}

/** Satisfying clear burst when the puzzle links. */
export function triggerVictoryFeel(layout: Layout, receivers: Vec2[], now: number): void {
  winFlashBorn = now;
  const palette = [P.CH0, P.CH1, P.CH2, P.TABLE, P.WORM, P.BLOCK];
  for (const p of receivers) {
    const c = cellCenter(layout, p);
    pushRing(c.x, c.y, now, P.CH0, layout.cell * 0.9, 0.7, 2.4);
    pushRing(c.x, c.y, now + 0.08, P.TABLE_OUTLINE, layout.cell * 1.25, 0.55, 1.6);
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      const speed = 40 + Math.random() * 70;
      flecks.push({
        x: c.x,
        y: c.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 20,
        born: now,
        life: 0.75 + Math.random() * 0.35,
        size: 2.5 + Math.random() * 3.5,
        color: palette[i % palette.length],
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 6,
      });
    }
  }
  // Center soft bloom
  pushRing(W / 2, H * 0.42, now, P.INK_HAIR, 180, 0.85, 1.2);
}

export function drawFeel(ctx: CanvasRenderingContext2D, now: number): void {
  const theme = getThemeId();

  if (winFlashBorn >= 0) {
    const t = (now - winFlashBorn) / 0.55;
    if (t < 1) {
      const a = (1 - t) * (theme === "synthwave" || theme === "mono" ? 0.22 : 0.14);
      ctx.save();
      ctx.fillStyle =
        theme === "synthwave"
          ? `rgba(5,217,232,${a})`
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
    const alpha = (1 - u) * (1 - u) * 0.85;
    ctx.beginPath();
    ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1, r.width * (1 - u * 0.7));
    if (theme === "synthwave") {
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
    ctx.globalAlpha = (1 - u) * (1 - u) * 0.9;
    ctx.fillStyle = f.color;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size * 0.55);
    ctx.restore();
  }
  ctx.restore();
}
