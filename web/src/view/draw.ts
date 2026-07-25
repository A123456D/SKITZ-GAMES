import { dirDelta, Kind, MirrorOri, type Vec2 } from "../core/cellKind";
import { getCell, type GridState } from "../core/gridState";
import type { TurnResult } from "../core/beamSolver";
import { Module, type TableDef } from "../core/tableDef";
import { basePairs } from "../core/portWiring";
import { channelColor, colors as P, getThemeId } from "./palette";

function strokeChannel(ctx: CanvasRenderingContext2D, channel: number, scale = 1): void {
  ctx.setLineDash([]);
  if (channel === 1) ctx.setLineDash([7 * scale, 5 * scale]);
  else if (channel === 2) ctx.setLineDash([2.5 * scale, 4.5 * scale]);
}

export const W = 720;
export const H = 1280;

export type Layout = {
  origin: Vec2;
  cell: number;
  gap: number;
  boardTop: number;
};

export function boardLayout(state: GridState): Layout {
  // Reclaim chrome so cells stay large on phones without shrinking puzzles.
  const gap = 3;
  const padX = 14;
  const boardTop = 132;
  const boardBottom = 1088;
  const availW = W - padX * 2;
  const availH = boardBottom - boardTop;
  const stepSz = Math.min(availW / state.width, availH / state.height);
  const cell = Math.max(44, Math.min(96, stepSz - gap));
  const boardW = state.width * (cell + gap) - gap;
  const boardH = state.height * (cell + gap) - gap;
  return {
    origin: { x: (W - boardW) / 2, y: boardTop + (availH - boardH) / 2 },
    cell,
    gap,
    boardTop,
  };
}

function step(layout: Layout): number {
  return layout.cell + layout.gap;
}

function lw(size: number, t = 0.06): number {
  return Math.max(2.4, size * t);
}

export function cellCenter(layout: Layout, p: Vec2): Vec2 {
  return {
    x: layout.origin.x + p.x * step(layout) + layout.cell / 2,
    y: layout.origin.y + p.y * step(layout) + layout.cell / 2,
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  const synthwave = getThemeId() === "synthwave";
  if (synthwave) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#080116");
    sky.addColorStop(0.62, P.PAPER);
    sky.addColorStop(1, "#140328");
    ctx.fillStyle = sky;
  } else {
    ctx.fillStyle = P.PAPER;
  }
  ctx.fillRect(0, 0, W, H);
  // Soft edge only — keep the board airy
  ctx.strokeStyle = P.INK_HAIR;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, W - 56, H - 56);
  ctx.globalAlpha = 1;
}

export function drawHairlineGrid(ctx: CanvasRenderingContext2D, state: GridState, layout: Layout): void {
  // Sparse dots — just enough to read spacing
  ctx.fillStyle = P.INK_HAIR;
  ctx.globalAlpha = 0.28;
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const c = cellCenter(layout, { x, y });
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.max(1, layout.cell * 0.022), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawWheel(
  ctx: CanvasRenderingContext2D,
  table: TableDef,
  layout: Layout,
  selected: boolean,
  visualRot: number,
  time: number,
  settled = false,
  showPreview = false,
): void {
  const hub = cellCenter(layout, table.hub);
  const r = Math.max(layout.cell * 0.52, step(layout) * 0.34);
  const theme = getThemeId();
  // Hover until the player has turned it — then it seats onto the board.
  const hover = settled ? 0 : Math.sin(time * 1.6 + table.id * 0.7);
  const bob = hover * 3.2;
  const lift = settled ? 0 : hover * 0.5 + 0.5;

  ctx.save();
  ctx.translate(hub.x, hub.y + r * 0.7 + lift * 2);
  ctx.scale(1, 0.26);
  ctx.fillStyle = theme === "synthwave" || theme === "mono" ? "rgba(0,0,0,0.3)" : "rgba(40, 30, 25, 0.16)";
  ctx.globalAlpha = settled ? 0.85 : 0.7 - lift * 0.15;
  ctx.beginPath();
  ctx.arc(0, 0, r * (settled ? 0.9 : 0.86 - lift * 0.12), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  ctx.translate(hub.x, hub.y + bob);
  ctx.rotate(visualRot);

  ctx.shadowColor = theme === "synthwave" ? P.CH1 : "rgba(35, 28, 22, 0.16)";
  ctx.shadowBlur = settled ? 4 : theme === "synthwave" ? 12 : 8 + lift * 4;
  ctx.shadowOffsetY = settled ? 1 : 3 + lift * 3;
  ctx.fillStyle = table.locked ? P.SHADE : P.TABLE_FILL;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Seated seam — reads as attached to the surface once turned/locked.
  if (settled) {
    ctx.strokeStyle = P.TABLE_OUTLINE;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (selected) {
    ctx.strokeStyle = P.TABLE_OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const portAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
  const pairs = basePairs(table.module);
  const portPos = (port: number): Vec2 => {
    const a = portAngles[port];
    return { x: Math.cos(a) * r * 0.62, y: Math.sin(a) * r * 0.62 };
  };
  ctx.strokeStyle = P.TABLE;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (const [a, b] of pairs) {
    const pa = portPos(a);
    const pb = portPos(b);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.quadraticCurveTo(0, 0, pb.x, pb.y);
    ctx.stroke();
  }

  for (const a of portAngles) {
    ctx.fillStyle = P.TABLE;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cog teeth mark a geared disc — turning it turns its partner too.
  if (table.link) {
    ctx.fillStyle = P.TABLE;
    const teeth = 12;
    for (let i = 0; i < teeth; i++) {
      const a = (Math.PI * 2 * i) / teeth;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97, r * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Route preview on the selected table: dashed stubs + arrowheads on connected
  // ports, drawn in the rotated frame so they turn live while dragging.
  // Tutorial-only — in real play this is a solution tell, so it's disabled.
  if (showPreview && selected && !table.locked) {
    const connected = new Set<number>();
    for (const [a, b] of pairs) {
      connected.add(a);
      connected.add(b);
    }
    const inner = r * 0.8;
    const outer = r + layout.cell * 0.5;
    const head = Math.max(6, layout.cell * 0.14);
    ctx.strokeStyle = P.SELECT;
    ctx.fillStyle = P.SELECT;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    for (const port of connected) {
      const ax = Math.cos(portAngles[port]);
      const ay = Math.sin(portAngles[port]);
      ctx.beginPath();
      ctx.moveTo(ax * inner, ay * inner);
      ctx.lineTo(ax * outer, ay * outer);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const port of connected) {
      const ax = Math.cos(portAngles[port]);
      const ay = Math.sin(portAngles[port]);
      const px = -ay;
      const py = ax;
      ctx.beginPath();
      ctx.moveTo(ax * (outer + head), ay * (outer + head));
      ctx.lineTo(ax * outer + px * head * 0.55, ay * outer + py * head * 0.55);
      ctx.lineTo(ax * outer - px * head * 0.55, ay * outer - py * head * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Locked / gate: tiny glyph only
  if (table.module === Module.GATE) {
    ctx.strokeStyle = P.TABLE;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-r * 0.14, -r * 0.14);
    ctx.lineTo(r * 0.14, r * 0.14);
    ctx.stroke();
  } else if (table.locked) {
    ctx.strokeStyle = P.TABLE;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-r * 0.1, -r * 0.1, r * 0.2, r * 0.2);
  }
  ctx.restore();
}

function drawMirror(ctx: CanvasRenderingContext2D, c: Vec2, size: number, ori: number): void {
  const s = size * 0.44;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.strokeStyle = P.MIRROR;
  ctx.lineWidth = lw(size, 0.08);
  ctx.lineCap = "square";
  ctx.beginPath();
  if (ori === MirrorOri.BACKSLASH) {
    ctx.moveTo(-s, -s);
    ctx.lineTo(s, s);
  } else {
    ctx.moveTo(-s, s);
    ctx.lineTo(s, -s);
  }
  ctx.stroke();
  ctx.restore();
}

function drawChannelMark(ctx: CanvasRenderingContext2D, channel: number, r: number, color?: string): void {
  const ink = color ?? channelColor(channel);
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(2, r * 0.12);
  if (channel === 1) {
    // Square = dashed channel
    const s = r * 0.58;
    ctx.strokeRect(-s / 2, -s / 2, s, s);
  } else if (channel === 2) {
    // Diamond = dotted channel
    const s = r * 0.45;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.stroke();
  } else {
    // Disk = solid channel
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEmitter(
  ctx: CanvasRenderingContext2D,
  c: Vec2,
  size: number,
  dir: number,
  channel = 0,
): void {
  const r = size * 0.32;
  const col = channelColor(channel);
  const ang = (dir * Math.PI) / 2 - Math.PI / 2;
  const scale = size / 56;
  ctx.save();
  ctx.translate(c.x, c.y);

  // START: soft halo + solid source
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = P.FILL;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = lw(size, 0.07);
  strokeChannel(ctx, channel, scale);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Bold outbound arrow = start
  const tip = r * 1.55;
  const base = r * 0.55;
  ctx.beginPath();
  ctx.moveTo(Math.cos(ang) * tip, Math.sin(ang) * tip);
  ctx.lineTo(
    Math.cos(ang) * base + Math.cos(ang + Math.PI / 2) * r * 0.32,
    Math.sin(ang) * base + Math.sin(ang + Math.PI / 2) * r * 0.32,
  );
  ctx.lineTo(
    Math.cos(ang) * base + Math.cos(ang - Math.PI / 2) * r * 0.32,
    Math.sin(ang) * base + Math.sin(ang - Math.PI / 2) * r * 0.32,
  );
  ctx.closePath();
  ctx.fill();

  // Tiny START mark opposite the beam
  const bx = -Math.cos(ang) * r * 0.55;
  const by = -Math.sin(ang) * r * 0.55;
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.85;
  ctx.font = `700 ${Math.max(9, Math.round(size * 0.16))}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", bx, by);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawReceiver(
  ctx: CanvasRenderingContext2D,
  c: Vec2,
  size: number,
  lit: boolean,
  spill: boolean,
  channel = 0,
  time = 0,
): void {
  const r = size * 0.34;
  const col = channelColor(channel);
  const scale = size / 56;
  ctx.save();
  ctx.translate(c.x, c.y);

  // FINISH: open goal socket
  ctx.strokeStyle = col;
  ctx.lineWidth = lit || spill ? lw(size, 0.09) : lw(size, 0.065);
  strokeChannel(ctx, channel, scale);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = lw(size, 0.05);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
    ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    ctx.stroke();
  }

  if (spill) {
    ctx.strokeStyle = P.OBJ;
    ctx.lineWidth = lw(size, 0.07);
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.3);
    ctx.lineTo(r * 0.3, r * 0.3);
    ctx.moveTo(r * 0.3, -r * 0.3);
    ctx.lineTo(-r * 0.3, r * 0.3);
    ctx.stroke();
  } else if (lit) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.globalAlpha = 0.4 + 0.15 * Math.sin(time * 2);
    drawChannelMark(ctx, channel, r * 0.7);
  }

  // Tiny FINISH mark under the socket
  ctx.globalAlpha = lit ? 0.9 : 0.65;
  ctx.fillStyle = col;
  ctx.font = `700 ${Math.max(9, Math.round(size * 0.15))}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("F", 0, r * 1.28);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawCrate(ctx: CanvasRenderingContext2D, c: Vec2, size: number): void {
  const s = size * 0.68;
  ctx.save();
  ctx.translate(c.x, c.y);
  roundRect(ctx, -s / 2, -s / 2, s, s, 3);
  ctx.fillStyle = getThemeId() === "pastel" ? P.BLOCK : P.SHADE;
  ctx.globalAlpha = 0.8;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawWall(ctx: CanvasRenderingContext2D, c: Vec2, size: number): void {
  const s = size * 0.7;
  // Soft paper blocks — never pure ink black
  const theme = getThemeId();
  ctx.fillStyle = theme === "pastel" ? P.BLOCK : P.SHADE;
  ctx.globalAlpha = theme === "pastel" ? 0.82 : 0.7;
  roundRect(ctx, c.x - s / 2, c.y - s / 2, s, s, 3);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSink(ctx: CanvasRenderingContext2D, c: Vec2, size: number): void {
  const r = size * 0.28;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.fillStyle = P.SINK;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.PAPER;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWormhole(ctx: CanvasRenderingContext2D, c: Vec2, size: number, pairId: number): void {
  const r = size * 0.3;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.strokeStyle = P.WORM;
  ctx.lineWidth = lw(size, 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  const ticks = 1 + (pairId % 3);
  for (let i = 0; i < ticks; i++) {
    const a = -Math.PI / 2 + (i - (ticks - 1) / 2) * 0.55;
    ctx.fillStyle = P.WORM;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFilter(ctx: CanvasRenderingContext2D, c: Vec2, size: number, channel: number): void {
  const s = size * 0.46;
  const scale = size / 56;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.strokeStyle = P.FILTER;
  ctx.lineWidth = lw(size, 0.055);
  strokeChannel(ctx, channel, scale);
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.setLineDash([]);
  drawChannelMark(ctx, channel, s * 0.5, P.FILTER);
  ctx.restore();
}

function drawBarrier(ctx: CanvasRenderingContext2D, c: Vec2, size: number, passDir: number): void {
  // Soft flanking dots mark the open lane — no bars / arrows
  const r = size * 0.3;
  const d = dirDelta(passDir);
  const px = -d.y;
  const py = d.x;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.fillStyle = P.BARRIER;
  ctx.globalAlpha = 0.5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(px * r * 0.72 * side, py * r * 0.72 * side, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(d.x * r * 0.2, d.y * r * 0.2, Math.max(2, size * 0.032), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Faint tie-line between two geared discs so the coupling reads at a glance. */
export function drawGearLink(ctx: CanvasRenderingContext2D, layout: Layout, a: Vec2, b: Vec2): void {
  const pa = cellCenter(layout, a);
  const pb = cellCenter(layout, b);
  ctx.save();
  ctx.strokeStyle = P.TABLE_OUTLINE;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawOptics(
  ctx: CanvasRenderingContext2D,
  state: GridState,
  layout: Layout,
  result: TurnResult,
  time = 0,
): void {
  const lit = new Set(result.energizedReceivers.map((p) => `${p.x},${p.y}`));
  const spill = new Set((result.spillReceivers ?? []).map((p) => `${p.x},${p.y}`));

  // Only draw walls that touch an open/fixture cell — deep filler walls stay invisible (still block)
  const isOpenish = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= state.width || y >= state.height) return false;
    const k = getCell(state, x, y).kind;
    return k !== Kind.WALL;
  };

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cell = getCell(state, x, y);
      if (cell.kind === Kind.EMPTY) continue;
      const c = cellCenter(layout, { x, y });
      ctx.save();
      if (getThemeId() === "synthwave") {
        const channel = cell.channel ?? 0;
        ctx.shadowColor = channelColor(channel);
        ctx.shadowBlur = 11;
      }
      switch (cell.kind) {
        case Kind.EMITTER:
          drawEmitter(ctx, c, layout.cell, cell.dir, cell.channel ?? 0);
          break;
        case Kind.MIRROR:
          drawMirror(ctx, c, layout.cell, cell.ori);
          break;
        case Kind.RECEIVER:
          drawReceiver(
            ctx,
            c,
            layout.cell,
            lit.has(`${x},${y}`),
            spill.has(`${x},${y}`),
            cell.channel ?? 0,
            time,
          );
          break;
        case Kind.CRATE:
          drawCrate(ctx, c, layout.cell);
          break;
        case Kind.WALL: {
          const touch =
            isOpenish(x + 1, y) ||
            isOpenish(x - 1, y) ||
            isOpenish(x, y + 1) ||
            isOpenish(x, y - 1);
          if (touch) drawWall(ctx, c, layout.cell);
          break;
        }
        case Kind.SINK:
          drawSink(ctx, c, layout.cell);
          break;
        case Kind.WORMHOLE:
          drawWormhole(ctx, c, layout.cell, cell.channel ?? 0);
          break;
        case Kind.FILTER:
          drawFilter(ctx, c, layout.cell, cell.channel ?? 0);
          break;
        case Kind.BARRIER:
          drawBarrier(ctx, c, layout.cell, cell.dir);
          break;
      }
      ctx.restore();
    }
  }
}

export function drawBeams(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  result: TurnResult,
  progress = 1,
): void {
  for (const beam of result.beams) {
    const n = beam.segments.length;
    if (!n) continue;
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      if (progress <= t0) continue;
      const lp = Math.min(1, (progress - t0) / Math.max(t1 - t0, 0.0001));
      const seg = beam.segments[i];
      const from = cellCenter(layout, seg.from);
      const to = cellCenter(layout, seg.to);
      const end = {
        x: from.x + (to.x - from.x) * lp,
        y: from.y + (to.y - from.y) * lp,
      };
      ctx.save();
      const ink = channelColor(beam.channel ?? 0);
      const beamW = Math.max(3.8, layout.cell * 0.085);
      if (getThemeId() === "synthwave") {
        ctx.shadowColor = ink;
        ctx.shadowBlur = 18;
      }
      ctx.strokeStyle = ink;
      ctx.lineWidth = getThemeId() === "synthwave" ? beamW + 0.6 : beamW;
      ctx.lineCap = "round";
      strokeChannel(ctx, beam.channel ?? 0, layout.cell / 56);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(end.x, end.y, Math.max(3.5, layout.cell * 0.07), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function drawHudStats(
  ctx: CanvasRenderingContext2D,
  moves: number,
  par: number,
  lit: number,
  need: number,
  spill = 0,
  pulsesLeft = -1,
  pulseLimit = -1,
): void {
  ctx.fillStyle = P.INK;
  ctx.font = "700 16px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(`MOVES  ${moves}`, W / 2 - 220, 148);
  if (pulsesLeft >= 0 && pulseLimit >= 0) {
    ctx.fillText(`PULSES  ${pulsesLeft}/${pulseLimit}`, W / 2 - 50, 148);
  }
  ctx.fillText(`LINKED  ${lit}/${need}`, W / 2 + 100, 148);
  ctx.fillText(spill > 0 ? `SPILL  ${spill}` : `PAR  ${par}`, W / 2 + 230, 148);
}

export function drawCoachHint(ctx: CanvasRenderingContext2D, text: string, y = 1048): void {
  const maxW = 620;
  ctx.fillStyle = P.INK_SOFT;
  ctx.font = "600 18px Georgia, serif";
  ctx.textAlign = "center";
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + i * 26));
}

/**
 * Animated finger pointing at a board/UI target, with a soft halo ring.
 * `from` is roughly where the hand sits; tip aims at (tx, ty).
 */
export function drawFingerPointer(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  t: number,
): void {
  const bob = Math.sin(t * 4.2) * 7;
  const pulse = 22 + Math.sin(t * 3.1) * 4;

  ctx.save();
  // Halo on the target
  ctx.beginPath();
  ctx.arc(tx, ty, pulse, 0, Math.PI * 2);
  ctx.strokeStyle = P.SELECT;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(tx, ty, pulse * 0.55, 0, Math.PI * 2);
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Hand sits below-right of the target and points up-left toward it.
  const hx = tx + 36;
  const hy = ty + 62 + bob;
  ctx.translate(hx, hy);
  ctx.rotate((-28 * Math.PI) / 180);

  // Palm
  ctx.fillStyle = P.INK;
  ctx.strokeStyle = P.INK;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  roundRect(ctx, -10, 8, 28, 34, 8);
  ctx.fill();

  // Pointing finger
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(0, -34);
  ctx.lineTo(8, -34);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.fill();

  // Knuckle tip highlight
  ctx.fillStyle = P.PAPER;
  ctx.beginPath();
  ctx.arc(4, -36, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = P.INK;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Secondary curled fingers
  ctx.fillStyle = P.INK;
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, 12 + i * 7, 2, 6, 18 - i * 2, 3);
    ctx.fill();
  }
  ctx.restore();
}

/** Bottom (or top) coach card for the pointing tour. */
export function drawPointCoach(
  ctx: CanvasRenderingContext2D,
  title: string,
  body: string,
  step: number,
  total: number,
  showPrev: boolean,
  place: "top" | "bottom" = "bottom",
): { next: ButtonRect; prev: ButtonRect | null; skip: ButtonRect } {
  const maxW = 520;
  const lineH = 24;
  ctx.font = "500 17px Georgia, serif";
  const words = body.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);

  const cardH = 78 + lines.length * lineH + 88;
  const cardW = maxW + 48;
  const x = (W - cardW) / 2;
  const y = place === "top" ? 180 : H - cardH - 24;

  ctx.save();
  ctx.shadowColor = "rgba(35,28,22,0.2)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, x, y, cardW, cardH, 16);
  ctx.fillStyle = P.PAPER;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = P.INK_HAIR;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, cardW, cardH, 16);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = P.INK;
  ctx.font = "700 22px Georgia, serif";
  ctx.fillText(title, x + 24, y + 36);

  const skip: ButtonRect = {
    x: x + cardW - 118,
    y: y + 14,
    w: 96,
    h: 28,
    id: "point_skip",
  };
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = "600 13px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText("Skip tour", skip.x + skip.w - 2, skip.y + 18);

  ctx.fillStyle = P.INK_FAINT;
  ctx.font = "600 12px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText(`Step ${step + 1} of ${total}`, x + 24, y + 58);

  ctx.fillStyle = P.INK_SOFT;
  ctx.font = "500 17px Georgia, serif";
  lines.forEach((ln, i) => ctx.fillText(ln, x + 24, y + 88 + i * lineH));
  ctx.restore();

  const btnY = y + cardH - 64;
  let prev: ButtonRect | null = null;
  if (showPrev) {
    prev = { x: x + 20, y: btnY, w: 140, h: 48, id: "point_prev" };
  }
  const next: ButtonRect = {
    x: showPrev ? x + 180 : x + 20,
    y: btnY,
    w: showPrev ? cardW - 200 : cardW - 40,
    h: 48,
    id: "point_next",
  };
  return { next, prev, skip };
}

/** Tap-to-explain card. Returns the close-button hit rect. */
export function drawInfoCard(
  ctx: CanvasRenderingContext2D,
  title: string,
  body: string,
): ButtonRect {
  const maxW = 500;
  const lineH = 24;
  const padX = 24;
  const padTop = 46;
  const padBot = 20;
  const closeSize = 36;

  ctx.font = "600 17px Georgia, serif";
  const words = body.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);

  const h = padTop + lines.length * lineH + padBot;
  const w = maxW + padX * 2;
  const x = (W - w) / 2;
  const bottom = 1040;
  const y = bottom - h;
  const close: ButtonRect = {
    x: x + w - closeSize - 6,
    y: y + 6,
    w: closeSize,
    h: closeSize,
    id: "inspect_close",
  };

  ctx.save();
  ctx.shadowColor = "rgba(35,28,22,0.18)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = P.PAPER;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = P.INK_HAIR;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = P.INK;
  ctx.font = "700 20px Georgia, serif";
  ctx.fillText(title, x + padX, y + 30);

  ctx.fillStyle = P.INK_SOFT;
  ctx.font = "600 17px Georgia, serif";
  lines.forEach((ln, i) => ctx.fillText(ln, x + padX, y + padTop + 4 + i * lineH));

  // Close cross in the top-right corner
  const cx = close.x + close.w / 2;
  const cy = close.y + close.h / 2;
  const arm = 7;
  ctx.strokeStyle = P.INK_SOFT;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy - arm);
  ctx.lineTo(cx + arm, cy + arm);
  ctx.moveTo(cx + arm, cy - arm);
  ctx.lineTo(cx - arm, cy + arm);
  ctx.stroke();
  ctx.restore();

  return close;
}

export type ButtonRect = { x: number; y: number; w: number; h: number; id: string };

export type SliderRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  id: string;
  value: number;
  compact?: boolean;
};

let logoImg: HTMLImageElement | null = null;
let logoReady = false;

export function loadLogo(): void {
  if (logoImg) return;
  logoImg = new Image();
  logoImg.onload = () => {
    logoReady = true;
  };
  // File lives in public/; alpha punched so it tints cleanly per theme.
  logoImg.src = "./logo-pulse-shifter.png";
}

function logoTintColor(): string {
  const id = getThemeId();
  if (id === "pastel") return P.TABLE_OUTLINE;
  if (id === "synthwave") return P.CH0;
  if (id === "red") return P.OBJ;
  if (id === "blue") return P.OBJ;
  if (id === "mono") return P.INK;
  return P.INK;
}

/** Brand mark from logo asset, tinted to the active theme. */
export function drawLogo(ctx: CanvasRenderingContext2D, cx: number, top: number, width = 420): void {
  const tint = logoTintColor();
  const h = width; // asset is square
  const x = cx - width / 2;
  const y = top;

  if (logoReady && logoImg) {
    ctx.save();
    const scratch = document.createElement("canvas");
    scratch.width = Math.max(1, Math.round(width));
    scratch.height = Math.max(1, Math.round(h));
    const sctx = scratch.getContext("2d")!;
    // Logo PNG stores the mark as white+alpha. Tint through that alpha.
    sctx.drawImage(logoImg, 0, 0, scratch.width, scratch.height);
    sctx.globalCompositeOperation = "source-in";
    sctx.fillStyle = tint;
    sctx.fillRect(0, 0, scratch.width, scratch.height);
    ctx.drawImage(scratch, x, y, width, h);
    ctx.restore();
    return;
  }

  // Fallback vector while the PNG loads (matches the Pulse Shifter mark).
  const scale = width / 420;
  const cy = top + 70 * scale;
  const R = 54 * scale;
  ctx.save();
  ctx.strokeStyle = tint;
  ctx.fillStyle = tint;
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 14 * scale, cy + Math.sin(a) * 14 * scale);
    ctx.lineTo(cx + Math.cos(a) * 42 * scale, cy + Math.sin(a) * 42 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 48 * scale, cy + Math.sin(a) * 48 * scale, 5.5 * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const s = 5 * scale;
    const px = cx + Math.cos(a) * 34 * scale;
    const py = cy + Math.sin(a) * 34 * scale;
    ctx.fillRect(px - s / 2, py - s / 2, s, s);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${Math.round(48 * scale)}px Georgia, serif`;
  ctx.fillText("PULSE", cx, top + 170 * scale);
  ctx.font = `600 ${Math.round(18 * scale)}px Georgia, serif`;
  {
    const word = "SHIFTER";
    const gap = 8 * scale;
    let total = 0;
    for (const ch of word) total += ctx.measureText(ch).width + gap;
    total -= gap;
    let lx = cx - total / 2;
    for (const ch of word) {
      ctx.fillText(ch, lx + ctx.measureText(ch).width / 2, top + 198 * scale);
      lx += ctx.measureText(ch).width + gap;
    }
  }
  const divY = top + 218 * scale;
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.beginPath();
  ctx.moveTo(cx - 70 * scale, divY);
  ctx.lineTo(cx - 8 * scale, divY);
  ctx.moveTo(cx + 8 * scale, divY);
  ctx.lineTo(cx + 70 * scale, divY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, divY, 3.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `600 ${Math.round(13 * scale)}px Georgia, serif`;
  ctx.fillText("SHIFT. LINK. PULSE.", cx, top + 242 * scale);
  ctx.restore();
}

export function drawTitle(ctx: CanvasRenderingContext2D, subtitle?: string): void {
  ctx.fillStyle = P.INK;
  ctx.font = "700 36px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("PULSE SHIFTER", W / 2, 58);
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = "600 14px Georgia, serif";
  ctx.fillText(subtitle ?? "SHIFT. LINK. PULSE.", W / 2, 84);
}

/** Flat paper button — fill only, no outline / shadow / bounce. */
export function drawGlassButton(
  ctx: CanvasRenderingContext2D,
  rect: ButtonRect,
  label: string,
  primary = false,
  _time = 0,
  enabled = true,
): void {
  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.4;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fillStyle = primary ? P.PAPER_DARK : P.FILL;
  ctx.fill();
  ctx.fillStyle = P.INK;
  ctx.font = "700 19px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}

export function drawRoundButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  label: string,
  enabled: boolean,
  _time = 0,
): void {
  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.4;
  ctx.translate(x, y);
  // Same language as rectangular buttons: solid disc, ink glyph
  ctx.fillStyle = P.FILL;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.INK;
  ctx.font = `700 ${Math.round(r * 0.95)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

export function drawVolumeSlider(
  ctx: CanvasRenderingContext2D,
  rect: SliderRect,
  label: string,
  time = 0,
  compact = false,
): void {
  const theme = getThemeId();
  const isCompact = compact || !!rect.compact;
  const knobR = isCompact ? 7 : 11;
  const trackThick = isCompact ? 2.5 : 4;
  void time;
  ctx.save();
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = isCompact ? "700 11px Georgia, serif" : "700 14px Georgia, serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x, rect.y + rect.h / 2);
  const trackX = rect.x + (isCompact ? 42 : 110);
  const trackW = rect.w - (isCompact ? 42 : 110);
  const trackY = rect.y + rect.h / 2;
  ctx.strokeStyle = P.INK_HAIR;
  ctx.lineWidth = trackThick;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(trackX, trackY);
  ctx.lineTo(trackX + trackW, trackY);
  ctx.stroke();
  ctx.strokeStyle = theme === "synthwave" ? P.CH0 : P.TABLE_OUTLINE;
  ctx.beginPath();
  ctx.moveTo(trackX, trackY);
  ctx.lineTo(trackX + trackW * rect.value, trackY);
  ctx.stroke();
  const kx = trackX + trackW * rect.value;
  ctx.fillStyle = P.TABLE_FILL;
  ctx.beginPath();
  ctx.arc(kx, trackY, knobR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function sliderValueAt(rect: SliderRect, px: number): number {
  const labelW = rect.compact ? 42 : 110;
  const trackX = rect.x + labelW;
  const trackW = rect.w - labelW;
  return Math.max(0, Math.min(1, (px - trackX) / trackW));
}

export function hitCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

export function hitRect(px: number, py: number, r: ButtonRect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
