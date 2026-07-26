import { dirDelta, Kind, MirrorOri, type Vec2 } from "../core/cellKind";
import { getCell, type GridState } from "../core/gridState";
import type { TurnResult } from "../core/beamSolver";
import { Module, type TableDef } from "../core/tableDef";
import { basePairs, basePorts } from "../core/portWiring";
import { channelColor, colors as P, getThemeId, isDarkTheme, isLightTheme } from "./palette";
import { font } from "./typography";

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
  // Dense boards: tight gaps so the grid reads as one tiled circuit.
  const padX = 18;
  const boardTop = 140;
  const boardBottom = 1070;
  const availW = W - padX * 2;
  const availH = boardBottom - boardTop;
  const rough = Math.min(availW / state.width, availH / state.height);
  const gap = Math.max(4, Math.round(rough * 0.06));
  const cell = Math.max(28, Math.min(96, rough - gap));
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
  const theme = getThemeId();
  ctx.fillStyle = P.PAPER;
  ctx.fillRect(0, 0, W, H);

  if (theme === "retro") {
    // Night sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#050012");
    sky.addColorStop(0.42, "#120228");
    sky.addColorStop(0.52, "#2A0A4A");
    sky.addColorStop(1, "#0A0218");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const horizon = H * 0.52;
    const vanishX = W * 0.5;

    // Soft sun glow on the horizon.
    const sunGlow = ctx.createRadialGradient(vanishX, horizon, 8, vanishX, horizon, W * 0.38);
    sunGlow.addColorStop(0, "rgba(255, 110, 199, 0.35)");
    sunGlow.addColorStop(0.35, "rgba(199, 125, 255, 0.12)");
    sunGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, W, H);

    // Banded synth sun.
    ctx.save();
    ctx.beginPath();
    ctx.arc(vanishX, horizon, 46, Math.PI, 0);
    ctx.closePath();
    ctx.clip();
    const sunFill = ctx.createLinearGradient(vanishX, horizon - 46, vanishX, horizon);
    sunFill.addColorStop(0, "#FFE08A");
    sunFill.addColorStop(0.55, "#FF6EC7");
    sunFill.addColorStop(1, "#C77DFF");
    ctx.fillStyle = sunFill;
    ctx.fillRect(vanishX - 50, horizon - 50, 100, 55);
    // Cut bands with sky color so we don't punch through the canvas.
    ctx.fillStyle = "#1A0840";
    for (let i = 0; i < 5; i++) {
      const y = horizon - 8 - i * 7;
      ctx.fillRect(vanishX - 50, y, 100, 2.5 + i * 0.3);
    }
    ctx.restore();

    // Floor under the grid.
    const floor = ctx.createLinearGradient(0, horizon, 0, H);
    floor.addColorStop(0, "rgba(16, 2, 40, 0.25)");
    floor.addColorStop(1, "rgba(6, 0, 20, 0.95)");
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, W, H - horizon);

    // Perspective retrowave grid.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon, W, H - horizon);
    ctx.clip();

    ctx.strokeStyle = P.TABLE;
    ctx.lineWidth = 1.2;
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const y = horizon + Math.pow(t, 1.65) * (H - horizon + 40);
      if (y > H + 20) continue;
      ctx.globalAlpha = 0.12 + t * 0.38;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.strokeStyle = P.INK_SOFT;
    for (let i = -14; i <= 14; i++) {
      if (i === 0) continue;
      const xBottom = vanishX + i * (W * 0.095);
      ctx.globalAlpha = 0.1 + Math.min(0.35, Math.abs(i) * 0.02);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(vanishX, horizon);
      ctx.lineTo(xBottom, H + 30);
      ctx.stroke();
    }

    ctx.strokeStyle = P.TABLE;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(vanishX, horizon);
    ctx.lineTo(vanishX, H);
    ctx.stroke();

    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = P.INK_SOFT;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = P.INK_SOFT;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(W, horizon);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Vignette so the board stays readable.
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, W * 0.15, W * 0.5, H * 0.5, W * 0.85);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(5, 0, 18, 0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  } else if (theme === "dusk") {
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, "#0A1A3A");
    wash.addColorStop(0.5, P.PAPER);
    wash.addColorStop(1, "#0C2A52");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.38, W * 0.1, W * 0.5, H * 0.5, W * 0.92);
    vig.addColorStop(0, "rgba(120, 170, 230, 0.07)");
    vig.addColorStop(1, "rgba(0, 8, 24, 0.32)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    // Soft mint whisper bottom-right.
    const mint = ctx.createRadialGradient(W * 0.9, H * 0.85, 8, W * 0.85, H * 0.9, W * 0.45);
    mint.addColorStop(0, "rgba(90, 214, 165, 0.08)");
    mint.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = mint;
    ctx.fillRect(0, 0, W, H);
  } else if (theme === "mono") {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#000000");
    sky.addColorStop(0.5, P.PAPER);
    sky.addColorStop(1, "#111111");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
  } else if (theme === "red") {
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, "#FBF4F2");
    wash.addColorStop(1, "#F0E0DC");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, W * 0.15, W * 0.5, H * 0.5, W * 0.85);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(120, 50, 45, 0.08)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  } else if (theme === "blue") {
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, "#F4F8FC");
    wash.addColorStop(1, "#DDE6F0");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, W * 0.15, W * 0.5, H * 0.5, W * 0.85);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(45, 70, 110, 0.08)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  } else {
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, W * 0.15, W * 0.5, H * 0.5, W * 0.85);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(40, 32, 22, 0.07)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.strokeStyle = P.INK_HAIR;
  ctx.globalAlpha = isDarkTheme(theme) ? 0.4 : 0.55;
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, W - 56, H - 56);
  ctx.globalAlpha = 1;
}

export function drawHairlineGrid(ctx: CanvasRenderingContext2D, state: GridState, layout: Layout): void {
  const theme = getThemeId();
  // Light paper boards get architectural lines; night boards get soft dots.
  if (isLightTheme(theme)) {
    ctx.strokeStyle = P.INK_HAIR;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    const stepPx = layout.cell + layout.gap;
    const ox = layout.origin.x - layout.gap / 2;
    const oy = layout.origin.y - layout.gap / 2;
    const bw = state.width * stepPx;
    const bh = state.height * stepPx;
    ctx.beginPath();
    for (let x = 0; x <= state.width; x++) {
      const px = ox + x * stepPx;
      ctx.moveTo(px, oy);
      ctx.lineTo(px, oy + bh);
    }
    for (let y = 0; y <= state.height; y++) {
      const py = oy + y * stepPx;
      ctx.moveTo(ox, py);
      ctx.lineTo(ox + bw, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  ctx.fillStyle = P.INK_HAIR;
  ctx.globalAlpha = theme === "dusk" ? 0.35 : 0.28;
  // Retro already has the floor grid — skip board dots so it doesn't clutter.
  if (theme === "retro") {
    ctx.globalAlpha = 1;
    return;
  }
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
  _showWiring = false,
  squash = 1,
): void {
  const hub = cellCenter(layout, table.hub);
  const r = Math.min(layout.cell * 0.48, step(layout) * 0.46);
  const theme = getThemeId();
  const lightFace = theme === "dusk" || isLightTheme(theme);
  const dark = isDarkTheme(theme) && theme !== "dusk";
  // Soft hover bob; selection floats a touch higher.
  const hover = Math.sin(time * 1.5 + table.id * 0.9) * (selected ? 1.35 : 0.75);
  const floatY = (selected ? 6.5 : 5) + hover;
  const edge = Math.max(2.6, r * 0.07); // knob / cardstock thickness
  const face = table.locked ? P.SHADE : P.TABLE_FILL;
  // Edge stock — darker than the face so the knob reads as thick.
  const stock =
    theme === "dusk"
      ? "#B8C9E0"
      : dark
        ? P.SHADE
        : P.PAPER_DARK;

  // Soft ground shadow under the floating knob.
  ctx.save();
  ctx.translate(hub.x, hub.y + r * 0.1);
  ctx.scale(1.1, 0.34);
  const shadow = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
  if (theme === "retro") {
    shadow.addColorStop(0, "rgba(0,0,0,0.55)");
    shadow.addColorStop(0.55, "rgba(80, 20, 120, 0.25)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
  } else if (theme === "dusk") {
    shadow.addColorStop(0, "rgba(0, 10, 30, 0.45)");
    shadow.addColorStop(0.55, "rgba(0, 10, 30, 0.18)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
  } else if (dark) {
    shadow.addColorStop(0, "rgba(0,0,0,0.5)");
    shadow.addColorStop(0.55, "rgba(0,0,0,0.2)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
  } else {
    shadow.addColorStop(0, "rgba(30, 24, 18, 0.26)");
    shadow.addColorStop(0.55, "rgba(30, 24, 18, 0.1)");
    shadow.addColorStop(1, "rgba(30, 24, 18, 0)");
  }
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Retro: soft cyan outer glow around the floating knob.
  if (theme === "retro") {
    const glowPulse = selected ? 0.55 + 0.2 * Math.sin(time * 3.2) : 0.42;
    ctx.save();
    ctx.translate(hub.x, hub.y - floatY);
    ctx.shadowColor = P.TABLE;
    ctx.shadowBlur = selected ? 22 : 16;
    ctx.globalAlpha = glowPulse;
    ctx.strokeStyle = P.TABLE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 1.5, 0, Math.PI * 2);
    ctx.stroke();
    // Second softer halo.
    ctx.shadowBlur = selected ? 34 : 26;
    ctx.globalAlpha = glowPulse * 0.55;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Thickness ring under the face (does not spin).
  ctx.save();
  ctx.translate(hub.x, hub.y - floatY + edge);
  ctx.fillStyle = stock;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Knob face.
  ctx.save();
  ctx.translate(hub.x, hub.y - floatY);
  const sx = squash > 1 ? 1 / Math.sqrt(squash) : squash;
  ctx.scale(sx, squash);
  ctx.rotate(visualRot);

  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Sharp edge bevel — light outer rim + dark inner lip, no soft face gradient.
  const bevelW = Math.max(2.2, r * 0.055);
  ctx.beginPath();
  ctx.arc(0, 0, r - bevelW * 0.35, 0, Math.PI * 2);
  ctx.strokeStyle = lightFace ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.22)";
  ctx.lineWidth = bevelW;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r - bevelW * 1.15, 0, Math.PI * 2);
  ctx.strokeStyle = lightFace ? "rgba(30, 24, 18, 0.22)" : "rgba(0,0,0,0.45)";
  ctx.lineWidth = Math.max(1.4, bevelW * 0.55);
  ctx.stroke();

  // Crisp outer rim — dark on light faces, accent on night knobs.
  ctx.strokeStyle = P.TABLE_OUTLINE;
  ctx.lineWidth = Math.max(1.6, r * 0.035);
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Quiet inner guide ring.
  ctx.strokeStyle = lightFace ? P.TABLE_OUTLINE : P.INK;
  ctx.globalAlpha = lightFace ? 0.18 : dark ? 0.18 : 0.1;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Rim ticks.
  ctx.strokeStyle = lightFace ? P.TABLE_OUTLINE : P.INK;
  ctx.lineCap = "butt";
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    const major = i % 3 === 0;
    const inner = r * (major ? 0.76 : 0.82);
    const outer = r * 0.91;
    ctx.globalAlpha = major ? 0.28 : 0.12;
    ctx.lineWidth = major ? 1.4 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = "round";

  if (selected) {
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 3.2));
    ctx.strokeStyle = P.SELECT;
    ctx.globalAlpha = pulse * 0.95;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const portAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
  const pairs = basePairs(table.module);
  const ports = basePorts(table.module);
  const portPos = (port: number): { x: number; y: number } => {
    const a = portAngles[port]!;
    return { x: Math.cos(a) * r * 0.62, y: Math.sin(a) * r * 0.62 };
  };

  // Connector ink on paper — solid stroke, no glow.
  ctx.strokeStyle = P.TABLE;
  ctx.lineWidth = Math.max(2.8, r * 0.12);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (table.module === Module.ENDCAP || (pairs.length === 0 && ports.length === 1)) {
    const p = portPos(ports[0] ?? 0);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else {
    for (const [a, b] of pairs) {
      const pa = portPos(a);
      const pb = portPos(b);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.quadraticCurveTo(0, 0, pb.x, pb.y);
      ctx.stroke();
    }
  }

  // Punched connection points — solid paper disc with ink ring.
  for (const port of ports) {
    const a = portAngles[port]!;
    const px = Math.cos(a) * r * 0.62;
    const py = Math.sin(a) * r * 0.62;
    const pr = Math.max(3.2, r * 0.105);
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle =
      theme === "retro" ? P.INK_SOFT : theme === "dusk" ? P.BLOCK : P.TABLE;
    ctx.lineWidth = Math.max(1.8, r * 0.06);
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (table.link) {
    ctx.fillStyle = P.TABLE;
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97, r * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (showPreview && selected && !table.locked) {
    const connected = new Set(ports);
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
      const ax = Math.cos(portAngles[port]!);
      const ay = Math.sin(portAngles[port]!);
      ctx.beginPath();
      ctx.moveTo(ax * inner, ay * inner);
      ctx.lineTo(ax * outer, ay * outer);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const port of connected) {
      const ax = Math.cos(portAngles[port]!);
      const ay = Math.sin(portAngles[port]!);
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
  void settled;
  ctx.restore();
}

function drawMirror(
  ctx: CanvasRenderingContext2D,
  c: Vec2,
  size: number,
  ori: number,
  player = false,
): void {
  const s = size * 0.48;
  ctx.save();
  ctx.translate(c.x, c.y);
  // Bold filled triangle — hypotenuse is the reflective face.
  ctx.beginPath();
  if (ori === MirrorOri.BACKSLASH) {
    ctx.moveTo(-s, -s);
    ctx.lineTo(s, s);
    ctx.lineTo(-s, s);
  } else {
    ctx.moveTo(-s, s);
    ctx.lineTo(s, -s);
    ctx.lineTo(s, s);
  }
  ctx.closePath();
  ctx.fillStyle = player ? P.TABLE_FILL : P.SHADE;
  ctx.fill();
  ctx.strokeStyle = P.MIRROR;
  ctx.lineWidth = lw(size, 0.09);
  ctx.stroke();
  // Thick hypotenuse so it reads as a triangle, not a disc.
  ctx.beginPath();
  if (ori === MirrorOri.BACKSLASH) {
    ctx.moveTo(-s, -s);
    ctx.lineTo(s, s);
  } else {
    ctx.moveTo(-s, s);
    ctx.lineTo(s, -s);
  }
  ctx.lineWidth = lw(size, 0.14);
  ctx.stroke();
  if (player) {
    // Dot mark = tappable
    ctx.fillStyle = P.MIRROR;
    ctx.beginPath();
    ctx.arc(0, size * 0.22, Math.max(3, size * 0.08), 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Small lock tick = fixed
    ctx.strokeStyle = P.MIRROR;
    ctx.lineWidth = lw(size, 0.06);
    ctx.strokeRect(-size * 0.08, size * 0.14, size * 0.16, size * 0.16);
  }
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
  ctx.font = font(700, Math.max(9, Math.round(size * 0.16)));
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
  ctx.font = font(700, Math.max(9, Math.round(size * 0.15)));
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
  ctx.fillStyle = getThemeId() === "dusk" ? P.BLOCK : P.SHADE;
  ctx.globalAlpha = 0.8;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawWall(ctx: CanvasRenderingContext2D, c: Vec2, size: number): void {
  const s = size * 0.7;
  // Soft paper blocks — never pure ink black
  const theme = getThemeId();
  ctx.fillStyle = theme === "dusk" ? P.BLOCK : P.SHADE;
  ctx.globalAlpha = theme === "dusk" ? 0.82 : 0.7;
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

/** Half-moon: empty = inert, filled = armed (flips beam polarity). */
function drawPhaseSwitch(ctx: CanvasRenderingContext2D, c: Vec2, size: number, armed: boolean): void {
  const r = size * 0.28;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.strokeStyle = P.INK;
  ctx.fillStyle = P.INK;
  ctx.lineWidth = lw(size, 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  if (armed) {
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** Diamond lock — only the matching polarity passes. */
function drawPhaseGate(ctx: CanvasRenderingContext2D, c: Vec2, size: number, needPhase: number): void {
  const s = size * 0.28;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.strokeStyle = P.INK;
  ctx.lineWidth = lw(size, 0.055);
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s, 0);
  ctx.closePath();
  ctx.stroke();
  if (needPhase === 1) {
    ctx.fillStyle = P.INK;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.45);
    ctx.lineTo(s * 0.45, 0);
    ctx.lineTo(0, s * 0.45);
    ctx.lineTo(-s * 0.45, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Empty ring = socket; filled disc = token seated. */
function drawPad(ctx: CanvasRenderingContext2D, c: Vec2, size: number, hasToken: boolean): void {
  const r = size * 0.26;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.strokeStyle = P.INK;
  ctx.fillStyle = P.INK;
  ctx.lineWidth = lw(size, 0.05);
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (hasToken) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Bracket door — shut until its linked pad holds a token. */
function drawTokenDoor(ctx: CanvasRenderingContext2D, c: Vec2, size: number): void {
  const s = size * 0.32;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.strokeStyle = P.INK;
  ctx.lineWidth = lw(size, 0.06);
  ctx.beginPath();
  ctx.moveTo(-s, -s * 0.7);
  ctx.lineTo(-s * 0.35, -s * 0.7);
  ctx.moveTo(-s, s * 0.7);
  ctx.lineTo(-s * 0.35, s * 0.7);
  ctx.moveTo(s, -s * 0.7);
  ctx.lineTo(s * 0.35, -s * 0.7);
  ctx.moveTo(s, s * 0.7);
  ctx.lineTo(s * 0.35, s * 0.7);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(-s * 0.15, -s * 0.5);
  ctx.lineTo(-s * 0.15, s * 0.5);
  ctx.moveTo(s * 0.15, -s * 0.5);
  ctx.lineTo(s * 0.15, s * 0.5);
  ctx.stroke();
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
      if (getThemeId() === "retro") {
        const channel = cell.channel ?? 0;
        ctx.shadowColor = channelColor(channel);
        ctx.shadowBlur = 11;
      }
      switch (cell.kind) {
        case Kind.EMITTER:
          drawEmitter(ctx, c, layout.cell, cell.dir, cell.channel ?? 0);
          break;
        case Kind.MIRROR:
          drawMirror(ctx, c, layout.cell, cell.ori, (cell.phase ?? 0) === 1);
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
        case Kind.PHASE_SWITCH:
          drawPhaseSwitch(ctx, c, layout.cell, (cell.phase ?? 0) === 1);
          break;
        case Kind.PHASE_GATE:
          drawPhaseGate(ctx, c, layout.cell, cell.phase ?? 1);
          break;
        case Kind.PAD:
          drawPad(ctx, c, layout.cell, (cell.phase ?? 0) === 1);
          break;
        case Kind.TOKEN_DOOR:
          drawTokenDoor(ctx, c, layout.cell);
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
  const theme = getThemeId();
  const calm = isLightTheme(theme);
  const beamW = Math.max(calm ? 2 : 1.8, layout.cell * 0.045);
  const jointR = Math.max(2.2, beamW * 0.9);

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
      const ink = channelColor(beam.channel ?? 0);

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (theme === "retro") {
        ctx.shadowColor = ink;
        ctx.shadowBlur = 8;
      }
      ctx.strokeStyle = ink;
      ctx.lineWidth = beamW;
      strokeChannel(ctx, beam.channel ?? 0, layout.cell / 56);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(from.x, from.y, jointR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(end.x, end.y, jointR, 0, Math.PI * 2);
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
  _tokensLeft = -1,
): void {
  void par;
  ctx.fillStyle = P.INK;
  ctx.font = font(700, 16);
  ctx.textAlign = "center";
  ctx.fillText(`MOVES  ${moves}`, W / 2 - 220, 148);
  // Pulses are the only rationed resource, so they carry the emphasis.
  if (pulsesLeft >= 0 && pulseLimit >= 0) {
    ctx.fillText(`CHECKS  ${pulsesLeft}/${pulseLimit}`, W / 2 + 10, 148);
  }
  // Dense circuit: OPEN = loose ends, NET closed when it is one piece.
  if (need > 0) {
    ctx.fillText(spill > 0 ? `OPEN  ${spill}` : `NET  ${lit}/${need}`, W / 2 + 220, 148);
  }
}

export function drawCoachHint(ctx: CanvasRenderingContext2D, text: string, y = 1048): void {
  const maxW = 620;
  ctx.fillStyle = P.INK_SOFT;
  ctx.font = font(600, 18);
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
  ctx.font = font(500, 17);
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
  ctx.font = font(700, 22);
  ctx.fillText(title, x + 24, y + 36);

  const skip: ButtonRect = {
    x: x + cardW - 118,
    y: y + 14,
    w: 96,
    h: 28,
    id: "point_skip",
  };
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = font(600, 13);
  ctx.textAlign = "right";
  ctx.fillText("Skip tour", skip.x + skip.w - 2, skip.y + 18);

  ctx.fillStyle = P.INK_FAINT;
  ctx.font = font(600, 12);
  ctx.textAlign = "left";
  ctx.fillText(`Step ${step + 1} of ${total}`, x + 24, y + 58);

  ctx.fillStyle = P.INK_SOFT;
  ctx.font = font(500, 17);
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

  ctx.font = font(600, 17);
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
  ctx.font = font(700, 20);
  ctx.fillText(title, x + padX, y + 30);

  ctx.fillStyle = P.INK_SOFT;
  ctx.font = font(600, 17);
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
  if (id === "dusk") return P.TABLE;
  if (id === "retro") return P.CH0;
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
  ctx.font = font(700, Math.round(48 * scale));
  ctx.fillText("PULSE", cx, top + 170 * scale);
  ctx.font = font(600, Math.round(18 * scale));
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
  ctx.font = font(600, Math.round(13 * scale));
  ctx.fillText("SHIFT. LINK. PULSE.", cx, top + 242 * scale);
  ctx.restore();
}

export function drawTitle(ctx: CanvasRenderingContext2D, subtitle?: string): void {
  ctx.fillStyle = P.INK;
  ctx.font = font(700, 36);
  ctx.textAlign = "center";
  ctx.fillText("PULSE SHIFTER", W / 2, 58);
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = font(600, 14);
  ctx.fillText(subtitle ?? "SHIFT. LINK. PULSE.", W / 2, 84);
}

/** Themed button — fill/outline follow the active palette. */
export function drawGlassButton(
  ctx: CanvasRenderingContext2D,
  rect: ButtonRect,
  label: string,
  primary = false,
  time = 0,
  enabled = true,
): void {
  const theme = getThemeId();
  const press = primary ? 1 - 0.04 * Math.max(0, Math.sin(time * 6) * 0.15) : 1;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const fill = primary ? P.PAPER_DARK : P.FILL;
  const stroke =
    theme === "retro"
      ? primary
        ? P.SELECT
        : P.TABLE_OUTLINE
      : theme === "dusk"
        ? primary
          ? P.BLOCK
          : P.TABLE
        : primary
          ? P.SELECT
          : P.INK;
  const shadow =
    theme === "retro"
      ? "rgba(199, 125, 255, 0.32)"
      : theme === "mono"
        ? "rgba(0,0,0,0.55)"
        : theme === "dusk"
          ? "rgba(10, 30, 70, 0.4)"
          : theme === "red"
            ? "rgba(120, 50, 45, 0.16)"
            : theme === "blue"
              ? "rgba(45, 70, 110, 0.16)"
              : "rgba(30, 24, 18, 0.14)";

  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.4;
  ctx.translate(cx, cy);
  ctx.scale(press, press);
  ctx.translate(-cx, -cy);
  ctx.shadowColor = shadow;
  ctx.shadowBlur = theme === "retro" ? 14 : theme === "dusk" ? 10 : 8;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = primary ? 1.9 : 1.4;
  ctx.globalAlpha = enabled ? (primary ? 0.95 : 0.65) : 0.35;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.stroke();
  ctx.globalAlpha = enabled ? 1 : 0.4;
  ctx.fillStyle = P.INK;
  ctx.font = font(700, 19);
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
  const theme = getThemeId();
  const stroke =
    theme === "retro" ? P.SELECT : theme === "dusk" ? P.TABLE : P.INK;
  const shadow =
    theme === "retro"
      ? "rgba(199, 125, 255, 0.32)"
      : theme === "mono"
        ? "rgba(0,0,0,0.55)"
        : theme === "dusk"
          ? "rgba(10, 30, 70, 0.4)"
          : "rgba(30, 24, 18, 0.14)";

  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.4;
  ctx.translate(x, y);
  ctx.shadowColor = shadow;
  ctx.shadowBlur = theme === "retro" ? 14 : theme === "dusk" ? 10 : 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = P.FILL;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = enabled ? 0.7 : 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = enabled ? 1 : 0.4;
  ctx.fillStyle = P.INK;
  ctx.font = font(700, Math.round(r * 0.95));
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
  ctx.font = font(700, isCompact ? 11 : 14);
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
  ctx.strokeStyle = theme === "retro" ? P.CH0 : P.TABLE_OUTLINE;
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
