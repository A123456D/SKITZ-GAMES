import { dirDelta, Kind, MirrorOri, type Vec2 } from "../core/cellKind";
import { getCell, type GridState } from "../core/gridState";
import type { TurnResult } from "../core/beamSolver";
import { Module, type TableDef } from "../core/tableDef";
import { basePairs, basePorts, openPorts } from "../core/portWiring";
import {
  channelColor,
  colors as P,
  getThemeId,
  isDarkTheme,
  isLightTheme,
  type ThemeId,
} from "./palette";
import { ensureThemeArt, getThemeArt, onThemeArtReady } from "./themeAssets";
import { font, fontHand, fontScript, fontRetro, fontPunk, fontCyber } from "./typography";

/** Palette fingerprint so sprite caches invalidate when colours change. */
function paletteKey(): string {
  return `${P.TABLE_FILL}|${P.TABLE}|${P.PAPER}|${P.INK}`;
}

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
  const boardTop = 236;
  const boardBottom = 1050;
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

/** Jagged ripped-flyer outline — seed from rect so the tear is stable per button. */
function tornPaperRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed = 0,
): void {
  const jag = (n: number): number => {
    const t = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return (t - Math.floor(t)) * 2 - 1;
  };
  const steps = Math.max(6, Math.round(Math.max(w, h) / 18));
  ctx.beginPath();
  // Top edge L→R
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x + w * t;
    const py = y + jag(i) * 3.2;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  // Right edge T→B
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    ctx.lineTo(x + w + jag(100 + i) * 3.2, y + h * t);
  }
  // Bottom edge R→L
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    ctx.lineTo(x + w * (1 - t), y + h + jag(200 + i) * 3.2);
  }
  // Left edge B→T
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    ctx.lineTo(x + jag(300 + i) * 3.2, y + h * (1 - t));
  }
  ctx.closePath();
}

/**
 * Backgrounds are static per theme but cost several full-screen gradients (and
 * ~35 strokes for retro's grid), so they are painted once into a cache canvas
 * and blitted every frame. CYBER adds cheap animated overlays on top of the blit.
 */
let bgCache: HTMLCanvasElement | null = null;
let bgCacheTheme = "";

export function drawBackground(ctx: CanvasRenderingContext2D, time = 0): void {
  const theme = getThemeId();
  ensureThemeArt(theme);
  const pal = paletteKey();
  if (!bgCache || bgCacheTheme !== `${theme}|${pal}`) {
    if (!bgCache) {
      bgCache = document.createElement("canvas");
      bgCache.width = W;
      bgCache.height = H;
    }
    const bctx = bgCache.getContext("2d");
    if (!bctx) {
      paintBackground(ctx, theme);
      if (theme === "mono") paintCyberMotion(ctx, time);
      if (theme === "retro") paintRetroMotion(ctx, time);
      return;
    }
    bctx.clearRect(0, 0, W, H);
    paintBackground(bctx, theme);
    bgCacheTheme = `${theme}|${pal}`;
  }
  ctx.drawImage(bgCache, 0, 0);
  if (theme === "mono") paintCyberMotion(ctx, time);
  if (theme === "retro") paintRetroMotion(ctx, time);
}

function paintBackground(ctx: CanvasRenderingContext2D, theme: ThemeId): void {
  ctx.fillStyle = P.PAPER;
  ctx.fillRect(0, 0, W, H);

  // Preferred path: generated per-theme background art with a readability wash.
  const themeArt = getThemeArt(theme);
  if (themeArt.bg) {
    const dark = isDarkTheme(theme);
    ctx.save();
    drawCover(ctx, themeArt.bg);
    ctx.restore();

    // Punk keeps its extra xerox grit + hazard marks.
    if (theme === "punk") {
      if (themeArt.grit) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.drawImage(themeArt.grit, 0, 0, W, H);
        ctx.restore();
      }
      ctx.save();
      const bar = 18;
      ctx.fillStyle = "#C8FF00";
      ctx.fillRect(0, 0, 120, bar);
      ctx.fillRect(0, 0, bar, 120);
      ctx.fillStyle = "#FF2D95";
      ctx.fillRect(W - 120, H - bar, 120, bar);
      ctx.fillRect(W - bar, H - 120, bar, 120);
      ctx.restore();
    }

    // Quiet the center so the board reads clearly over busy art.
    const clear = ctx.createRadialGradient(W * 0.5, H * 0.48, W * 0.12, W * 0.5, H * 0.5, W * 0.62);
    if (theme === "paper") {
      // Keep the crumpled sketchbook texture visible — only a whisper of wash.
      clear.addColorStop(0, "rgba(247,244,236,0.18)");
      clear.addColorStop(0.7, "rgba(247,244,236,0.06)");
      clear.addColorStop(1, "rgba(0,0,0,0)");
    } else if (theme === "mono") {
      // Soft black veil so the board sits cleanly on the red grid art.
      clear.addColorStop(0, "rgba(8, 8, 10, 0.55)");
      clear.addColorStop(0.55, "rgba(8, 8, 10, 0.18)");
      clear.addColorStop(1, "rgba(8, 8, 10, 0)");
    } else {
      clear.addColorStop(0, dark ? "rgba(6,4,14,0.5)" : "rgba(244,240,232,0.42)");
      clear.addColorStop(0.6, dark ? "rgba(6,4,14,0.16)" : "rgba(244,240,232,0.14)");
      clear.addColorStop(1, "rgba(0,0,0,0)");
    }
    ctx.fillStyle = clear;
    ctx.fillRect(0, 0, W, H);

    if (theme === "mono") {
      paintCyberHud(ctx);
    }

    // Edge vignette to seat the board.
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.2, W * 0.5, H * 0.5, W * 0.95);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(
      1,
      theme === "mono"
        ? "rgba(0, 0, 0, 0.55)"
        : dark
          ? "rgba(0,0,0,0.55)"
          : theme === "paper"
            ? "rgba(40,32,22,0.08)"
            : "rgba(40,32,22,0.14)",
    );
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    return;
  }

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
  } else if (theme === "punk") {
    // Fallback only (art image handled above): flat black wall + hazard bars.
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    const bar = 18;
    ctx.fillStyle = "#C8FF00";
    ctx.fillRect(0, 0, 120, bar);
    ctx.fillRect(0, 0, bar, 120);
    ctx.fillStyle = "#FF2D95";
    ctx.fillRect(W - 120, H - bar, 120, bar);
    ctx.fillRect(W - bar, H - 120, bar, 120);
    ctx.restore();
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.2, W * 0.5, H * 0.5, W * 0.92);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.62)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  } else if (theme === "mono") {
    paintCyberBackdrop(ctx);
  } else {
    // Light paper boards: flat cream + a whisper of vignette — no washes.
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, W * 0.2, W * 0.5, H * 0.5, W * 0.88);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(40, 32, 22, 0.05)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.strokeStyle = P.INK_HAIR;
  ctx.globalAlpha = isDarkTheme(theme) ? 0.4 : 0.55;
  ctx.lineWidth = 1;
  if (theme !== "mono" && theme !== "punk") ctx.strokeRect(28, 28, W - 56, H - 56);
  ctx.globalAlpha = 1;
}

/** Full procedural CYBER stage — black carbon terminal + red neon HUD. */
function paintCyberBackdrop(ctx: CanvasRenderingContext2D): void {
  // Deep carbon field with a slight vertical falloff.
  const field = ctx.createLinearGradient(0, 0, 0, H);
  field.addColorStop(0, "#0A0A0C");
  field.addColorStop(0.45, "#070708");
  field.addColorStop(1, "#030304");
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, W, H);

  // Fine noise grain so the panel reads as matte carbon, not flat void.
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.fillStyle = "#FF2A2A";
  for (let i = 0; i < 180; i++) {
    const x = ((i * 97) % (W - 8)) + 4;
    const y = ((i * 53) % (H - 8)) + 4;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.restore();

  const horizon = H * 0.42;
  const vx = W * 0.5;

  // Soft red core glow behind the board.
  const core = ctx.createRadialGradient(vx, H * 0.48, 0, vx, H * 0.48, W * 0.55);
  core.addColorStop(0, "rgba(255, 42, 42, 0.14)");
  core.addColorStop(0.4, "rgba(255, 42, 42, 0.05)");
  core.addColorStop(1, "rgba(255, 42, 42, 0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, W, H);

  // Perspective laser floor under the puzzle.
  ctx.save();
  ctx.strokeStyle = "#FF2A2A";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x0 = t * W;
    ctx.globalAlpha = 0.08 + (1 - Math.abs(t - 0.5) * 2) * 0.1;
    ctx.beginPath();
    ctx.moveTo(x0, H);
    ctx.lineTo(vx + (x0 - vx) * 0.06, horizon);
    ctx.stroke();
  }
  for (let i = 1; i <= 12; i++) {
    const u = i / 12;
    const y = horizon + (H - horizon) * Math.pow(u, 1.55);
    ctx.globalAlpha = 0.16 * (1 - u);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  // Upper tech lattice + crosshair ticks behind the title / HUD.
  ctx.save();
  ctx.strokeStyle = "rgba(255, 42, 42, 0.08)";
  ctx.lineWidth = 1;
  for (let y = 36; y < horizon - 20; y += 26) {
    ctx.beginPath();
    ctx.moveTo(36, y);
    ctx.lineTo(W - 36, y);
    ctx.stroke();
  }
  for (let x = 36; x < W - 36; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 36);
    ctx.lineTo(x, horizon - 20);
    ctx.stroke();
  }
  ctx.fillStyle = "#FF2A2A";
  for (let i = 0; i < 14; i++) {
    const x = 48 + ((i * 89) % (W - 96));
    const y = 48 + ((i * 61) % Math.max(40, horizon - 90));
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x - 5, y, 10, 1.2);
    ctx.fillRect(x, y - 5, 1.2, 10);
  }
  ctx.restore();

  paintCyberHud(ctx);

  // Deep vignette — seats the neon chrome.
  const vig = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.15, W * 0.5, H * 0.5, W * 0.95);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

/** Multi-layer red neon frame + corner brackets — HUD chrome for CYBER. */
function paintCyberHud(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.lineCap = "square";
  const m = 18;
  const outer = 10;
  const mid = 22;

  // Outer red glow frame.
  ctx.shadowColor = "#FF2A2A";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "#FF2A2A";
  ctx.lineWidth = 2.4;
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);
  ctx.shadowBlur = 0;

  // Inner hairline frame.
  ctx.strokeStyle = "rgba(255, 42, 42, 0.55)";
  ctx.lineWidth = 1;
  ctx.strokeRect(m + outer, m + outer, W - (m + outer) * 2, H - (m + outer) * 2);

  // Mid dashed tech rails on each edge.
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(255, 42, 42, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(m + mid, m + mid, W - (m + mid) * 2, H - (m + mid) * 2);
  ctx.setLineDash([]);

  // Heavy L-brackets at the four corners.
  const arm = 64;
  const bkt: [number, number, number, number][] = [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ];
  ctx.strokeStyle = "#FF2A2A";
  ctx.lineWidth = 3.2;
  ctx.shadowColor = "#FF2A2A";
  ctx.shadowBlur = 10;
  for (const [bx, by, sx, sy] of bkt) {
    ctx.beginPath();
    ctx.moveTo(bx + sx * arm, by);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx, by + sy * arm);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Inner corner ticks.
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = "#FF6A6A";
  for (const [bx, by, sx, sy] of bkt) {
    ctx.beginPath();
    ctx.moveTo(bx + sx * 22, by + sy * 10);
    ctx.lineTo(bx + sx * 10, by + sy * 10);
    ctx.lineTo(bx + sx * 10, by + sy * 22);
    ctx.stroke();
  }

  // Edge progress bars / tech decals along top and bottom.
  ctx.fillStyle = "#FF2A2A";
  const barY = [m + 6, H - m - 8];
  for (const y of barY) {
    ctx.globalAlpha = 0.7;
    ctx.fillRect(W * 0.22, y, W * 0.18, 2);
    ctx.fillRect(W * 0.6, y, W * 0.18, 2);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(W * 0.22, y + 4, W * 0.1, 1);
    ctx.fillRect(W * 0.68, y + 4, W * 0.1, 1);
  }

  // Side hatch marks.
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 5; i++) {
    const y = H * 0.28 + i * 28;
    ctx.fillRect(m + 4, y, 8, 1.5);
    ctx.fillRect(W - m - 12, y, 8, 1.5);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Per-frame CYBER motion — red pulse, scan, floor crawl on the black terminal.
 * Kept soft and edge-weighted so the puzzle board stays readable.
 */
function paintCyberMotion(ctx: CanvasRenderingContext2D, time: number): void {
  const horizon = H * 0.42;
  const vx = W * 0.5;
  const pulse = 0.5 + 0.5 * Math.sin(time * 1.7);
  const pulse2 = 0.5 + 0.5 * Math.sin(time * 2.3 + 1.1);

  ctx.save();

  // Breathing red core behind the board.
  const glowR = W * (0.28 + pulse * 0.08);
  const glow = ctx.createRadialGradient(vx, H * 0.48, 0, vx, H * 0.48, glowR);
  glow.addColorStop(0, `rgba(255, 42, 42, ${0.1 + pulse * 0.1})`);
  glow.addColorStop(0.45, `rgba(255, 42, 42, ${0.04 + pulse * 0.04})`);
  glow.addColorStop(1, "rgba(255, 42, 42, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, H * 0.48 - glowR, W, glowR * 2);

  // Soft horizon shimmer.
  ctx.globalAlpha = 0.2 + pulse2 * 0.25;
  ctx.strokeStyle = "#FF2A2A";
  ctx.lineWidth = 1.2;
  ctx.shadowColor = "#FF2A2A";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(W * 0.18, horizon);
  ctx.lineTo(W * 0.82, horizon);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Perspective floor lines crawling toward the camera.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, W, H - horizon);
  ctx.clip();
  const scroll = ((time * 0.35) % 1 + 1) % 1;
  ctx.strokeStyle = "#FF2A2A";
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const u = (i + scroll) / 9;
    const y = horizon + (H - horizon) * (u * u);
    ctx.globalAlpha = 0.08 + (1 - u) * 0.18;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const rayShift = Math.sin(time * 0.4) * 0.04;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10 + rayShift;
    const x0 = t * W;
    ctx.globalAlpha = 0.06 + (1 - Math.abs(t - 0.5) * 2) * 0.08;
    ctx.beginPath();
    ctx.moveTo(x0, H);
    ctx.lineTo(vx + (x0 - vx) * 0.08, horizon);
    ctx.stroke();
  }
  ctx.restore();

  // Vertical scan band drifting down the frame.
  const scanY = ((time * 90) % (H + 160)) - 80;
  const scan = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
  scan.addColorStop(0, "rgba(255, 42, 42, 0)");
  scan.addColorStop(0.5, "rgba(255, 42, 42, 0.07)");
  scan.addColorStop(1, "rgba(255, 42, 42, 0)");
  ctx.fillStyle = scan;
  ctx.fillRect(0, scanY - 40, W, 80);

  // Fine CRT scanlines — desktop only (hundreds of fillRects hurt mobile GPUs).
  if (!prefersLiteMotion()) {
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = "#FF2A2A";
    const lineOff = Math.floor(time * 28) % 3;
    for (let y = lineOff; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
  }

  // Corner bracket pulse — red ticks breathe.
  const m = 18;
  const armPulse = 16 + pulse * 10;
  ctx.lineCap = "square";
  ctx.strokeStyle = "#FF2A2A";
  ctx.lineWidth = 1.8;
  ctx.globalAlpha = 0.45 + pulse * 0.45;
  if (!prefersLiteMotion()) {
    ctx.shadowColor = "#FF2A2A";
    ctx.shadowBlur = 6;
  }
  const corners: [number, number, number, number][] = [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ];
  for (const [bx, by, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(bx + sx * armPulse, by + sy * 6);
    ctx.lineTo(bx + sx * 6, by + sy * 6);
    ctx.lineTo(bx + sx * 6, by + sy * armPulse);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Occasional edge "data ticks" that blink.
  ctx.fillStyle = "#FF2A2A";
  for (let i = 0; i < 6; i++) {
    const phase = (time * 1.4 + i * 0.9) % (Math.PI * 2);
    const on = Math.sin(phase) > 0.35 ? 0.65 : 0.12;
    ctx.globalAlpha = on;
    const top = i < 3;
    const x = 70 + i * 105 + Math.sin(time * 0.7 + i) * 6;
    const y = top ? 28 : H - 30;
    ctx.fillRect(x, y, 14, 2);
    ctx.fillRect(x, y, 2, 8 * (top ? 1 : -1));
  }

  ctx.restore();
}

/**
 * Coarse pointers / small viewports: skip the GPU-heavy motion extras
 * (shadowBlur, dense scanlines) while keeping the same animated look.
 */
let liteMotionCache: boolean | null = null;

function prefersLiteMotion(): boolean {
  if (liteMotionCache !== null) return liteMotionCache;
  if (typeof window === "undefined") return false;
  let lite = false;
  try {
    lite =
      window.matchMedia("(pointer: coarse)").matches ||
      Math.min(window.innerWidth, window.innerHeight) < 700;
  } catch {
    /* ignore */
  }
  liteMotionCache = lite;
  return lite;
}

let retroGlowCache: HTMLCanvasElement | null = null;
let retroScanCache: HTMLCanvasElement | null = null;

/** Cached radial sun-glow sprite (drawn scaled + alpha'd per frame). */
function retroGlowStrip(): HTMLCanvasElement {
  if (retroGlowCache) return retroGlowCache;
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255, 110, 199, 0.18)");
  grad.addColorStop(0.4, "rgba(199, 125, 255, 0.08)");
  grad.addColorStop(1, "rgba(255, 110, 199, 0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  retroGlowCache = c;
  return c;
}

/** Cached CRT scan band strip (stretched to full width per frame). */
function retroScanStrip(): HTMLCanvasElement {
  if (retroScanCache) return retroScanCache;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 100;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 100);
  grad.addColorStop(0, "rgba(92, 255, 248, 0)");
  grad.addColorStop(0.5, "rgba(255, 110, 199, 0.05)");
  grad.addColorStop(1, "rgba(92, 255, 248, 0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 100);
  retroScanCache = c;
  return c;
}

/**
 * Per-frame RETRO motion — synth sun breathe, grid crawl, star twinkle, CRT wash.
 * Soft and edge-weighted so the board stays readable.
 * On coarse/mobile pointers we drop shadowBlur + dense scanlines (GPU killers)
 * while keeping the same glow, stars, and crawling grid look.
 */
function paintRetroMotion(ctx: CanvasRenderingContext2D, time: number): void {
  const horizon = H * 0.52;
  const vx = W * 0.5;
  const pulse = 0.5 + 0.5 * Math.sin(time * 1.55);
  const pulse2 = 0.5 + 0.5 * Math.sin(time * 2.1 + 0.8);
  const lite = prefersLiteMotion();

  ctx.save();

  // Twinkling stars in the upper sky (deterministic positions).
  const starCount = lite ? 14 : 28;
  for (let i = 0; i < starCount; i++) {
    const sx = ((i * 97 + 41) % 1000) / 1000;
    const sy = ((i * 53 + 17) % 1000) / 1000;
    const x = 24 + sx * (W - 48);
    const y = 28 + sy * (horizon - 70);
    const twinkle = 0.5 + 0.5 * Math.sin(time * (1.2 + (i % 5) * 0.35) + i * 0.7);
    const a = 0.15 + twinkle * 0.55;
    const r = 0.8 + (i % 3) * 0.55 + twinkle * 0.4;
    ctx.globalAlpha = a;
    ctx.fillStyle = i % 4 === 0 ? "#5CFFF8" : i % 4 === 1 ? "#FF9DE0" : "#FFFFFF";
    if (lite) {
      // Tiny squares are much cheaper than arcs on mobile GPUs.
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Breathing magenta/violet sun glow on the horizon. The gradient is baked
  // once into a strip; per-frame createRadialGradient allocations stuttered
  // mobile browsers, so we scale + alpha the cached strip instead.
  const glowR = W * (0.3 + pulse * 0.1);
  const glowStrip = retroGlowStrip();
  ctx.globalAlpha = 0.55 + pulse * 0.45;
  ctx.drawImage(glowStrip, vx - glowR, horizon - glowR, glowR * 2, glowR * 2);

  // Neon horizon shimmer — magenta core, cyan lips.
  ctx.globalAlpha = 0.25 + pulse2 * 0.35;
  ctx.strokeStyle = "#FF6EC7";
  ctx.lineWidth = 2.2;
  if (!lite) {
    ctx.shadowColor = "#FF6EC7";
    ctx.shadowBlur = 12 + pulse * 10;
  }
  ctx.beginPath();
  ctx.moveTo(W * 0.12, horizon);
  ctx.lineTo(W * 0.88, horizon);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.35 + pulse * 0.3;
  ctx.strokeStyle = "#5CFFF8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.28, horizon);
  ctx.lineTo(W * 0.72, horizon);
  ctx.stroke();

  // Perspective floor lines crawling toward the camera.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, W, H - horizon);
  ctx.clip();
  const scroll = ((time * 0.42) % 1 + 1) % 1;
  const floorLines = lite ? 6 : 10;
  ctx.strokeStyle = "#FF6EC7";
  ctx.lineWidth = 1.15;
  for (let i = 0; i < floorLines; i++) {
    const u = (i + scroll) / floorLines;
    const y = horizon + (H - horizon) * Math.pow(u, 1.55);
    ctx.globalAlpha = 0.08 + (1 - u) * 0.28;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // Subtle ray sway so the grid feels alive.
  const rayShift = Math.sin(time * 0.35) * 0.035;
  const rayCount = lite ? 8 : 12;
  ctx.strokeStyle = "#C77DFF";
  for (let i = 0; i <= rayCount; i++) {
    const t = i / rayCount + rayShift;
    const x0 = t * W;
    ctx.globalAlpha = 0.06 + (1 - Math.abs(t - 0.5) * 2) * 0.1;
    ctx.beginPath();
    ctx.moveTo(x0, H);
    ctx.lineTo(vx + (x0 - vx) * 0.06, horizon);
    ctx.stroke();
  }
  // Center vanishing ray — cyan pulse.
  ctx.globalAlpha = 0.2 + pulse * 0.25;
  ctx.strokeStyle = "#5CFFF8";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(vx, horizon);
  ctx.lineTo(vx, H);
  ctx.stroke();
  ctx.restore();

  // Soft CRT scan band drifting down (cached strip — no per-frame gradient).
  const scanY = ((time * 70) % (H + 180)) - 90;
  ctx.globalAlpha = 1;
  ctx.drawImage(retroScanStrip(), 0, scanY - 50, W, 100);

  // Fine scanlines — desktop only (hundreds of fillRects kill mobile GPUs).
  if (!lite) {
    ctx.globalAlpha = 0.035;
    ctx.fillStyle = "#5CFFF8";
    const lineOff = Math.floor(time * 22) % 3;
    for (let y = lineOff; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
  }

  // Neon corner ticks that breathe.
  const m = 28;
  const arm = 12 + pulse * 10;
  ctx.lineCap = "square";
  ctx.lineWidth = 1.7;
  ctx.globalAlpha = 0.45 + pulse * 0.4;
  const corners: [number, number, number, number, string][] = [
    [m, m, 1, 1, "#5CFFF8"],
    [W - m, m, -1, 1, "#FF6EC7"],
    [m, H - m, 1, -1, "#FF6EC7"],
    [W - m, H - m, -1, -1, "#5CFFF8"],
  ];
  for (const [bx, by, sx, sy, col] of corners) {
    ctx.strokeStyle = col;
    if (!lite) {
      ctx.shadowColor = col;
      ctx.shadowBlur = 6;
    }
    ctx.beginPath();
    ctx.moveTo(bx + sx * arm, by + sy * 5);
    ctx.lineTo(bx + sx * 5, by + sy * 5);
    ctx.lineTo(bx + sx * 5, by + sy * arm);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  ctx.restore();
}

export function drawHairlineGrid(ctx: CanvasRenderingContext2D, state: GridState, layout: Layout): void {
  const theme = getThemeId();
  // Clean paper boards stay blank behind the discs — no grid lines.
  // Retro / cyber console faces also skip the hairline lattice.
  if (isLightTheme(theme) || theme === "retro" || theme === "mono") {
    return;
  }
  ctx.fillStyle = P.INK_HAIR;
  ctx.globalAlpha = 0.22;
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

/**
 * Disc art is redrawn once per cell per frame — up to 64 times on an 8x8 board.
 * Everything that only depends on theme, module and radius is baked into a
 * sprite; retro's halo especially used a per-disc shadowBlur pass, which is
 * what made dense boards crawl on phones.
 */
const SPRITE_SCALE = 2;
const spriteCache = new Map<string, HTMLCanvasElement>();

/** Drop baked art when the palette changes so discs pick up new colours. */
export function clearThemeCaches(): void {
  bgCache = null;
  bgCacheTheme = "";
  spriteCache.clear();
}

onThemeArtReady(() => clearThemeCaches());

/** Draw an image to fully cover the WxH canvas, cropping overflow. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w = W,
  h = H,
  x = 0,
  y = 0,
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

type Painter = (c: CanvasRenderingContext2D) => void;

function sprite(key: string, w: number, h: number, paint: Painter): HTMLCanvasElement | null {
  const hit = spriteCache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w * SPRITE_SCALE));
  canvas.height = Math.max(1, Math.ceil(h * SPRITE_SCALE));
  const c = canvas.getContext("2d");
  if (!c) return null;
  c.scale(SPRITE_SCALE, SPRITE_SCALE);
  c.translate(w / 2, h / 2);
  c.lineCap = "round";
  c.lineJoin = "round";
  paint(c);
  // Board size and theme change rarely; a small cache covers play + previews.
  if (spriteCache.size > 64) spriteCache.clear();
  spriteCache.set(key, canvas);
  return canvas;
}

/** Blit a cached sprite centred on (tx, ty); paints live if caching is unavailable. */
function stamp(
  ctx: CanvasRenderingContext2D,
  key: string,
  w: number,
  h: number,
  paint: Painter,
  tx: number,
  ty: number,
  transform?: Painter,
): void {
  const img = sprite(key, w, h, paint);
  ctx.save();
  ctx.translate(tx, ty);
  transform?.(ctx);
  if (img) ctx.drawImage(img, -w / 2, -h / 2, w, h);
  else paint(ctx);
  ctx.restore();
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
  const theme = getThemeId();
  // Retro triangles need breathing room in the square grid. At disc scale,
  // alternating quarter-turns visually merge into six-point stars.
  const r =
    theme === "retro"
      ? Math.min(layout.cell * 0.39, step(layout) * 0.37)
      : Math.min(layout.cell * 0.48, step(layout) * 0.46);
  const rKey = r.toFixed(1);
  const pal = paletteKey();
  const lightFace = isLightTheme(theme);
  const dark = isDarkTheme(theme);
  const floatY = knobFloatY(theme, table.id, selected, time);
  const edge = theme === "paper" ? Math.max(2.2, r * 0.055) : Math.max(2.6, r * 0.07);
  const face = table.locked ? P.SHADE : theme === "retro" ? "#1A0A30" : P.TABLE_FILL;
  // Edge stock — a shade darker than the face so the knob reads as thick card.
  const stock =
    theme === "retro"
      ? "#A898B0"
      : theme === "punk"
        ? "#050505"
        : theme === "paper"
          ? "#D0C9BB"
          : theme === "mono"
            ? "#050506"
            : isLightTheme(theme)
              ? P.SHADE
              : dark
                ? P.SHADE
                : P.PAPER_DARK;

  // Soft ground shadow under the floating knob. Retro uses its triangular
  // thickness and halo instead; a circular shadow made the pieces read as stars.
  if (theme !== "retro") {
    const shadowW = r * 2.2 + 6;
    const shadowH = r * 0.68 + 6;
    stamp(
      ctx,
      `sh|${theme}|${pal}|${rKey}|ink2`,
      shadowW,
      shadowH,
      (c) => {
        c.save();
        c.scale(1.12, theme === "paper" ? 0.48 : 0.34);
        const shadow = c.createRadialGradient(0, 0, r * 0.12, 0, 0, r);
        if (theme === "paper") {
          // Stronger graphite drop so cutouts feel lifted off the page.
          shadow.addColorStop(0, "rgba(40, 36, 28, 0.38)");
          shadow.addColorStop(0.45, "rgba(40, 36, 28, 0.16)");
          shadow.addColorStop(1, "rgba(40, 36, 28, 0)");
        } else if (dark) {
          shadow.addColorStop(0, "rgba(0,0,0,0.5)");
          shadow.addColorStop(0.55, "rgba(0,0,0,0.2)");
          shadow.addColorStop(1, "rgba(0,0,0,0)");
        } else {
          shadow.addColorStop(0, "rgba(30, 24, 18, 0.26)");
          shadow.addColorStop(0.55, "rgba(30, 24, 18, 0.1)");
          shadow.addColorStop(1, "rgba(30, 24, 18, 0)");
        }
        c.fillStyle = shadow;
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fill();
        c.restore();
      },
      hub.x,
      hub.y + r * (theme === "paper" ? 0.2 : 0.1),
    );
  }

  // Retro: magenta edge-light around a cut synth-paper triangle.
  if (theme === "retro") {
    const glowPulse = selected ? 0.4 + 0.12 * Math.sin(time * 3.2) : 0.26;
    const pad = selected ? 18 : 12;
    const glowSize = (r + pad) * 2;
    ctx.save();
    ctx.globalAlpha = glowPulse;
    stamp(
      ctx,
      `glow|${theme}|${pal}|${rKey}|${selected ? 1 : 0}`,
      glowSize,
      glowSize,
      (c) => {
        c.shadowColor = "#FF6EC7";
        c.shadowBlur = selected ? 12 : 8;
        c.strokeStyle = "#FF6EC7";
        c.lineWidth = 2;
        pathKnobTriangle(c, r + 1.2);
        c.stroke();
      },
      hub.x,
      hub.y - floatY,
      (c) => c.rotate(visualRot),
    );
    ctx.restore();
  }

  // Thickness under the face (does not spin).
  // Circular knobs can use a stationary ring. A stationary triangle behind a
  // rotating triangle creates a false six-point star, so retro stays flat.
  if (theme !== "retro") {
    ctx.save();
    ctx.translate(hub.x, hub.y - floatY + edge);
    ctx.fillStyle = stock;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Knob face — one sprite per module/theme/radius, spun on blit.
  // Retro edge-jacks stick past the rim, so the sprite needs extra pad.
  const facePad = theme === "retro" ? Math.max(14, r * 0.36) : 3;
  const faceSize = (r + facePad) * 2;
  const sx = squash > 1 ? 1 / Math.sqrt(squash) : squash;
  stamp(
    ctx,
    `face|${theme}|${pal}|${table.module}|${table.locked ? 1 : 0}|${table.link ? 1 : 0}|${rKey}|cyberHud1`,
    faceSize,
    faceSize,
    (c) => paintWheelFace(c, table, r, theme, lightFace, dark, face),
    hub.x,
    hub.y - floatY,
    (c) => {
      c.scale(sx, squash);
      c.rotate(visualRot);
    },
  );

  ctx.save();
  ctx.translate(hub.x, hub.y - floatY);
  ctx.scale(sx, squash);

  if (selected) {
    ctx.save();
    if (theme === "retro") ctx.rotate(visualRot);
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 3.2));
    if (theme === "paper") {
      // Thin fineliner double-ring — matches the reference selected disc.
      ctx.strokeStyle = P.INK;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r + 2.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4.6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (theme === "mono") {
      ctx.strokeStyle = "#FF2A2A";
      ctx.shadowColor = "#FF2A2A";
      ctx.shadowBlur = 8;
      ctx.globalAlpha = pulse * 0.95;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, r + 3.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#F4F4F6";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = P.SELECT;
      ctx.globalAlpha = pulse * 0.95;
      ctx.lineWidth = theme === "punk" ? 3.2 : 2.2;
      if (theme === "retro") pathKnobTriangle(ctx, r + 3.2);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, r + (theme === "punk" ? 3.6 : 2.8), 0, Math.PI * 2);
      }
      ctx.stroke();
      if (theme === "punk") {
        ctx.strokeStyle = P.INK_SOFT;
        ctx.globalAlpha = pulse * 0.55;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, r + 6.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  if (showPreview && selected && !table.locked) {
    ctx.rotate(visualRot);
    const portAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const connected = new Set(basePorts(table.module));
    for (const [a, b] of basePairs(table.module)) {
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
  void settled;
  ctx.restore();
}

/** Equilateral triangle, point-down, vertices on a circle of radius `r`. */
function pathKnobTriangle(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Filled ribbon along a quadratic bezier — thick mid-stroke, thin tips.
 * Mimics Permanent Marker pressure on the rotate arrows (not one flat width).
 */
function fillCalligraphicQuad(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  wMin: number,
  wMax: number,
): void {
  const N = 22;
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    const tx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
    const ty = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    // Soft pressure bump + a little hand wobble so it isn't machine-uniform.
    const pressure = Math.sin(t * Math.PI);
    const wobble = 1 + 0.08 * Math.sin(t * Math.PI * 3.2 + x0 * 0.07);
    const half = ((wMin + (wMax - wMin) * pressure) * 0.5) * wobble;
    left.push({ x: x + nx * half, y: y + ny * half });
    right.push({ x: x - nx * half, y: y - ny * half });
  }
  ctx.beginPath();
  ctx.moveTo(left[0]!.x, left[0]!.y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Shared float offset so inter-knob beams stay locked to floating sockets.
 */
export function knobFloatY(
  theme: ThemeId,
  tableId: number,
  selected: boolean,
  time: number,
): number {
  const bob = theme === "paper" ? 0.22 : isLightTheme(theme) ? 0.35 : selected ? 1.35 : 0.75;
  const hover = Math.sin(time * 1.5 + tableId * 0.9) * bob;
  const base =
    theme === "paper"
      ? selected
        ? 4.2
        : 3.4
      : isLightTheme(theme)
        ? selected
          ? 3.5
          : 2.5
        : selected
          ? 6.5
          : 5;
  return base + hover;
}

/** Where a ray from the hub meets the triangle rim (ports sit on the edge). */
function triEdgePoint(r: number, angle: number): { x: number; y: number } {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const verts = [0, 1, 2].map((i) => {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
  let bestT = Infinity;
  for (let i = 0; i < 3; i++) {
    const A = verts[i]!;
    const B = verts[(i + 1) % 3]!;
    const ex = B.x - A.x;
    const ey = B.y - A.y;
    // t*dir = A + u*(B-A)
    const det = dx * -ey - -ex * dy;
    if (Math.abs(det) < 1e-9) continue;
    const t = (A.x * -ey - -ex * A.y) / det;
    const u = (dx * A.y - dy * A.x) / det;
    if (t > 1e-6 && u >= -0.02 && u <= 1.02 && t < bestT) bestT = t;
  }
  if (!Number.isFinite(bestT) || bestT > r * 1.2) bestT = r * 0.5;
  return { x: dx * bestT, y: dy * bestT };
}

/** The spinning part of a knob, drawn at the origin so it can be cached. */
function paintWheelFace(
  ctx: CanvasRenderingContext2D,
  table: TableDef,
  r: number,
  theme: ThemeId,
  lightFace: boolean,
  dark: boolean,
  face: string,
): void {
  const tri = theme === "retro";
  // Discs keep ports inset; triangles park them flush on the rim.
  // Cyber HUD dials seat sockets inside the neon bezel (matches reference).
  const portRad = theme === "mono" ? r * 0.58 : r * 0.62;

  ctx.fillStyle = face;
  if (tri) pathKnobTriangle(ctx, r);
  else {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
  ctx.fill();

  // CYBER HUD dial — recessed carbon well + segmented neon-red bezel (matches reference).
  if (theme === "mono") {
    const lite = prefersLiteMotion();
    // Outer carbon plate.
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const plate = ctx.createRadialGradient(-r * 0.25, -r * 0.3, 0, 0, 0, r);
    plate.addColorStop(0, "#16161A");
    plate.addColorStop(0.55, "#0A0A0C");
    plate.addColorStop(1, "#050506");
    ctx.fillStyle = plate;
    ctx.fill();

    // Deep recessed well.
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    const well = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.72);
    well.addColorStop(0, "#030304");
    well.addColorStop(0.65, "#08080A");
    well.addColorStop(1, "#101014");
    ctx.fillStyle = well;
    ctx.fill();

    // Soft red core wash inside the well.
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.55);
    core.addColorStop(0, "rgba(255, 42, 42, 0.16)");
    core.addColorStop(1, "rgba(255, 42, 42, 0)");
    ctx.fillStyle = core;
    ctx.fill();

    ctx.save();
    if (!lite) {
      ctx.shadowColor = "#FF2A2A";
      ctx.shadowBlur = Math.max(6, r * 0.18);
    }
    // Thick segmented neon arcs around the rim.
    ctx.strokeStyle = "#FF2A2A";
    ctx.lineCap = "butt";
    const arcR = r - Math.max(2.2, r * 0.055);
    const segments = [
      [0.08, 0.42],
      [0.52, 0.78],
      [1.05, 1.35],
      [1.55, 1.88],
      [2.1, 2.45],
      [2.65, 2.95],
      [3.25, 3.55],
      [3.85, 4.2],
      [4.55, 4.9],
      [5.2, 5.55],
      [5.85, 6.15],
    ];
    ctx.lineWidth = Math.max(2.8, r * 0.085);
    for (const [a0, a1] of segments) {
      ctx.beginPath();
      ctx.arc(0, 0, arcR, a0, a1);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Thin concentric HUD rings.
    ctx.strokeStyle = "rgba(255, 42, 42, 0.55)";
    ctx.lineWidth = Math.max(1, r * 0.022);
    for (const rr of [0.92, 0.82, 0.74]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Degree tick marks.
    ctx.strokeStyle = "#FF2A2A";
    ctx.lineWidth = Math.max(0.9, r * 0.018);
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 48; i++) {
      const a = (Math.PI * 2 * i) / 48;
      const major = i % 4 === 0;
      const inner = r * (major ? 0.78 : 0.84);
      const outer = r * (major ? 0.95 : 0.91);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Tiny notch accents at cardinals.
    ctx.fillStyle = "#FF2A2A";
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const x = Math.cos(a) * r * 0.97;
      const y = Math.sin(a) * r * 0.97;
      const s = Math.max(1.4, r * 0.04);
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();
  }

  // Generated knob texture, clipped to the knob shape. When present it supplies
  // the face grain / bevel / dial marks, so the procedural versions are skipped.
  const knobImg = theme === "mono" ? null : getThemeArt(theme).knob;
  if (knobImg) {
    ctx.save();
    if (tri) pathKnobTriangle(ctx, r);
    else {
      ctx.beginPath();
      ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
    }
    ctx.clip();
    const size = r * 2.15;
    ctx.globalAlpha = 0.96;
    ctx.drawImage(knobImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // Punk enamel badge — hard acid-lime rim + hot magenta lip + rivet studs.
  if (theme === "punk") {
    ctx.beginPath();
    ctx.arc(0, 0, r - 1.2, 0, Math.PI * 2);
    ctx.strokeStyle = "#C8FF00";
    ctx.lineWidth = Math.max(2.4, r * 0.07);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r - Math.max(4.5, r * 0.14), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 45, 149, 0.85)";
    ctx.lineWidth = Math.max(1.4, r * 0.035);
    ctx.stroke();
    ctx.fillStyle = "#F2F0E8";
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12 + Math.PI / 12;
      const x = Math.cos(a) * r * 0.9;
      const y = Math.sin(a) * r * 0.9;
      const sr = Math.max(1.1, r * 0.035);
      ctx.moveTo(x + sr, y);
      ctx.arc(x, y, sr, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // Soft paper grain wash — only when there's no texture image to supply it.
  if (!knobImg && (tri || (lightFace && theme !== "mono"))) {
    ctx.save();
    if (tri) pathKnobTriangle(ctx, r);
    else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.clip();
    ctx.globalAlpha = tri ? 0.1 : 0.08;
    ctx.fillStyle = lightFace || tri ? "#ffffff" : P.INK;
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.32, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Crisp outer rim — dark on light faces, soft ink on paper triangles.
  // Punk paints its own hard lime rim + studs above.
  // INK knobs mirror the rotate button: bold outer ring + inner hairline.
  // Cyber (mono) paints its own red/white enamel badge above.
  if (theme === "paper") {
    ctx.strokeStyle = P.INK;
    ctx.lineWidth = Math.max(1.9, r * 0.048);
    ctx.beginPath();
    ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = Math.max(1.05, r * 0.028);
    ctx.beginPath();
    ctx.arc(0, 0, r - Math.max(3.8, r * 0.11), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (theme === "retro") {
    // Hot pink neon rim — matches the synthwave reference triangles.
    ctx.save();
    if (!prefersLiteMotion()) {
      ctx.shadowColor = "#FF6EC7";
      ctx.shadowBlur = Math.max(8, r * 0.22);
    }
    ctx.strokeStyle = "#FF6EC7";
    ctx.lineWidth = Math.max(2.2, r * 0.055);
    pathKnobTriangle(ctx, r - 0.4);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "#FF9DE0";
    ctx.lineWidth = Math.max(1.1, r * 0.028);
    pathKnobTriangle(ctx, r - 0.4);
    ctx.stroke();
  } else if (theme !== "punk" && theme !== "mono") {
    ctx.strokeStyle = P.TABLE_OUTLINE;
    ctx.lineWidth = Math.max(1.2, r * (tri ? 0.045 : 0.035));
    if (tri) pathKnobTriangle(ctx, r - 0.6);
    else {
      ctx.beginPath();
      ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  const portAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
  const pairs = basePairs(table.module);
  const ports = basePorts(table.module);
  const portPos = (port: number): { x: number; y: number } => {
    const a = portAngles[port]!;
    // Sit on the neon rim so beams meet the sockets.
    return tri ? triEdgePoint(r * 0.96, a) : { x: Math.cos(a) * portRad, y: Math.sin(a) * portRad };
  };

  // Retrowave traces: cyan neon tubes into the sockets.
  // INK theme: thin fineliner paths — hand-drawn, not bold stamped ink.
  const ink = P.TABLE;
  const paperInk = theme === "paper";
  const traceW = paperInk
    ? Math.max(1.35, r * 0.038)
    : Math.max(2.8, r * (tri ? 0.12 : 0.12));
  ctx.strokeStyle = ink;
  ctx.lineWidth = traceW;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const tipScale = 1;
  const tipPos = (port: number): { x: number; y: number } => {
    const p = portPos(port);
    return { x: p.x * tipScale, y: p.y * tipScale };
  };

  const strokeTraces = (ox = 0, oy = 0): void => {
    ctx.beginPath();
    if (table.module === Module.ENDCAP || (pairs.length === 0 && ports.length === 1)) {
      const p = tipPos(ports[0] ?? 0);
      ctx.moveTo(ox, oy);
      ctx.lineTo(p.x + ox, p.y + oy);
    } else {
      for (const [a, b] of pairs) {
        const pa = tipPos(a);
        const pb = tipPos(b);
        ctx.moveTo(pa.x + ox, pa.y + oy);
        ctx.quadraticCurveTo(ox, oy, pb.x + ox, pb.y + oy);
      }
    }
  };

  if (paperInk) {
    // Calligraphic marks — same variable-pressure feel as the rotate arrows
    // (Permanent Marker), not a single flat stroke width.
    const wMin = Math.max(1.05, r * 0.028);
    const wMax = Math.max(2.6, r * 0.078);
    ctx.fillStyle = ink;
    if (table.module === Module.ENDCAP || (pairs.length === 0 && ports.length === 1)) {
      const p = tipPos(ports[0] ?? 0);
      fillCalligraphicQuad(ctx, 0, 0, p.x * 0.5, p.y * 0.5, p.x, p.y, wMin, wMax);
    } else {
      for (const [a, b] of pairs) {
        const pa = tipPos(a);
        const pb = tipPos(b);
        fillCalligraphicQuad(ctx, pa.x, pa.y, 0, 0, pb.x, pb.y, wMin, wMax);
      }
    }
  } else if (tri) {
    // Soft magenta bloom + pale-pink core — matches the neon beam reference.
    strokeNeonPinkBeam(ctx, () => strokeTraces(0, 0), r);
  } else if (theme === "mono") {
    // Cyber laser trace — solid neon-red tube (matches the HUD reference).
    const lite = prefersLiteMotion();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (!lite) {
      ctx.shadowColor = "#FF2A2A";
      ctx.shadowBlur = Math.max(6, r * 0.16);
    }
    strokeTraces(0, 0);
    ctx.strokeStyle = "#FF2A2A";
    ctx.lineWidth = Math.max(2.8, r * 0.1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Brighter core so the path stays readable without going white.
    strokeTraces(0, 0);
    ctx.strokeStyle = "#FF6A6A";
    ctx.lineWidth = Math.max(1.2, r * 0.04);
    ctx.stroke();
  } else {
    strokeTraces(0, 0);
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(2.8, r * 0.12);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.lineCap = "round";

  if (tri) {
    // Cyan sockets — tubes terminate inside these nodes.
    const pr = Math.max(3.6, r * 0.11);
    ctx.save();
    if (!prefersLiteMotion()) {
      ctx.shadowColor = "#5CFFF8";
      ctx.shadowBlur = Math.max(8, r * 0.22);
    }
    ctx.fillStyle = "#5CFFF8";
    ctx.beginPath();
    for (const port of ports) {
      const p = portPos(port);
      ctx.moveTo(p.x + pr, p.y);
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#E8FFFF";
    ctx.beginPath();
    for (const port of ports) {
      const p = portPos(port);
      const ir = pr * 0.45;
      ctx.moveTo(p.x + ir, p.y);
      ctx.arc(p.x, p.y, ir, 0, Math.PI * 2);
    }
    ctx.fill();
  } else if (theme === "mono") {
    // Cyber ports — solid neon-red nodes (HUD endpoints from the reference).
    const pr = Math.max(3.6, r * 0.115);
    const lite = prefersLiteMotion();
    ctx.save();
    if (!lite) {
      ctx.shadowColor = "#FF2A2A";
      ctx.shadowBlur = Math.max(8, r * 0.22);
    }
    ctx.fillStyle = "#FF2A2A";
    ctx.beginPath();
    for (const port of ports) {
      const p = portPos(port);
      ctx.moveTo(p.x + pr, p.y);
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
    // Hot core.
    ctx.fillStyle = "#FF8A8A";
    ctx.beginPath();
    for (const port of ports) {
      const p = portPos(port);
      const ir = pr * 0.42;
      ctx.moveTo(p.x + ir, p.y);
      ctx.arc(p.x, p.y, ir, 0, Math.PI * 2);
    }
    ctx.fill();
  } else if (paperInk) {
    // Open sockets like the rotate button face — cream fill, ink ring.
    const pr = Math.max(3.1, r * 0.092);
    ctx.fillStyle = "#FBF9F4";
    ctx.beginPath();
    for (const port of ports) {
      const p = portPos(port);
      ctx.moveTo(p.x + pr, p.y);
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.35, r * 0.038);
    ctx.beginPath();
    for (const port of ports) {
      const p = portPos(port);
      ctx.moveTo(p.x + pr, p.y);
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
    }
    ctx.stroke();
    // Inner hairline — echoes the button’s double ring.
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(0.9, r * 0.022);
    ctx.beginPath();
    for (const port of ports) {
      const p = portPos(port);
      const ir = pr - Math.max(1.4, r * 0.028);
      ctx.moveTo(p.x + ir, p.y);
      ctx.arc(p.x, p.y, ir, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    // Punched connection points — cream hole on paper discs.
    const pr = Math.max(3.2, r * 0.105);
    ctx.fillStyle = isLightTheme(theme) ? P.PAPER : face;
    ctx.beginPath();
    for (const port of ports) {
      const p = portPos(port);
      ctx.moveTo(p.x + pr, p.y);
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.8, r * 0.06);
    ctx.beginPath();
    for (const port of ports) {
      const p = portPos(port);
      ctx.moveTo(p.x + pr, p.y);
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  if (table.link) {
    ctx.fillStyle = ink;
    ctx.beginPath();
    if (tri) {
      // Three edge midpoints — reads as linked paper corners.
      for (let i = 0; i < 3; i++) {
        const a0 = Math.PI / 2 + (i * Math.PI * 2) / 3;
        const a1 = Math.PI / 2 + ((i + 1) * Math.PI * 2) / 3;
        const x = ((Math.cos(a0) + Math.cos(a1)) / 2) * r * 0.92;
        const y = ((Math.sin(a0) + Math.sin(a1)) / 2) * r * 0.92;
        ctx.moveTo(x + r * 0.055, y);
        ctx.arc(x, y, r * 0.055, 0, Math.PI * 2);
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12;
        const x = Math.cos(a) * r * 0.97;
        const y = Math.sin(a) * r * 0.97;
        ctx.moveTo(x + r * 0.055, y);
        ctx.arc(x, y, r * 0.055, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }

  if (table.module === Module.GATE) {
    if (paperInk) {
      ctx.fillStyle = ink;
      const gw = Math.max(1.1, r * 0.03);
      const gW = Math.max(2.4, r * 0.07);
      fillCalligraphicQuad(ctx, -r * 0.16, -r * 0.16, 0, 0, r * 0.16, r * 0.16, gw, gW);
    } else {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.14, -r * 0.14);
      ctx.lineTo(r * 0.14, r * 0.14);
      ctx.stroke();
    }
  } else if (table.locked) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = paperInk ? Math.max(1.35, r * 0.036) : 1.6;
    ctx.strokeRect(-r * 0.1, -r * 0.1, r * 0.2, r * 0.2);
    if (paperInk) {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(0.9, r * 0.022);
      ctx.strokeRect(-r * 0.07, -r * 0.07, r * 0.14, r * 0.14);
      ctx.globalAlpha = 1;
    }
  }
  void lightFace;
  void dark;
}

/**
 * Always-on links for the retro board. Beams run socket-to-socket when
 * opposing ports on neighboring triangles face each other. Positions track
 * each knob's live rotation and float so tubes stay plugged into sockets.
 */
export function drawRetroConnections(
  ctx: CanvasRenderingContext2D,
  state: GridState,
  layout: Layout,
  opts?: {
    time?: number;
    selectedId?: number;
    visualRotOf?: (tableId: number) => number;
  },
): void {
  if (getThemeId() !== "retro") return;
  const at = new Map<string, TableDef>();
  for (const table of state.tables) at.set(`${table.hub.x},${table.hub.y}`, table);

  const portAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
  const deltas = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  const triR = Math.min(layout.cell * 0.39, step(layout) * 0.37);
  const tNow = opts?.time ?? 0;
  const selectedId = opts?.selectedId ?? -1;

  /** World-space rim socket for a table facing `worldDir`. */
  const socketAt = (table: TableDef, worldDir: number): { x: number; y: number } => {
    const hub = cellCenter(layout, table.hub);
    const rot =
      opts?.visualRotOf?.(table.id) ??
      (((table.rotationQ % 4) + 4) % 4) * (Math.PI / 2);
    const floatY = knobFloatY("retro", table.id, table.id === selectedId, tNow);
    const worldA = portAngles[worldDir]!;
    const local = triEdgePoint(triR * 0.96, worldA - rot);
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    return {
      x: hub.x + local.x * c - local.y * s,
      y: hub.y - floatY + local.x * s + local.y * c,
    };
  };

  ctx.save();
  ctx.lineCap = "round";
  for (const table of state.tables) {
    const ports = new Set(openPorts(table));
    for (const dir of ports) {
      // East/south only prevents drawing each matched edge twice.
      if (dir !== 1 && dir !== 2) continue;
      const d = deltas[dir]!;
      const neighbor = at.get(`${table.hub.x + d.x},${table.hub.y + d.y}`);
      if (!neighbor || !openPorts(neighbor).includes((dir + 2) % 4)) continue;
      const from = socketAt(table, dir);
      const to = socketAt(neighbor, (dir + 2) % 4);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      strokeNeonPinkBeam(
        ctx,
        () => {
          /* path already set */
        },
        layout.cell * 0.5,
        true,
      );
    }
  }
  ctx.restore();
}

/**
 * Soft magenta neon tube: wide hot-pink aura + pale pink-white core.
 * Matches the synthwave beam reference (not a hard cyan stroke).
 */
function strokeNeonPinkBeam(
  ctx: CanvasRenderingContext2D,
  buildPath: () => void,
  scale: number,
  pathReady = false,
): void {
  // shadowBlur per stroke murders mobile GPUs — the wide low-alpha aura
  // pass already fakes the glow there, so lite skips the blur entirely.
  const lite = prefersLiteMotion();
  const paint = (style: string, width: number, alpha: number, blur: number): void => {
    if (!pathReady) buildPath();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    if (!lite) {
      ctx.shadowColor = "#FF4FB8";
      ctx.shadowBlur = blur;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  };
  paint("#FF2DB8", Math.max(4.2, scale * 0.14), 0.28, Math.max(10, scale * 0.28));
  paint("#FF6EC7", Math.max(2.6, scale * 0.09), 0.7, Math.max(5, scale * 0.16));
  paint("#FFE0F8", Math.max(1.15, scale * 0.045), 1, Math.max(2, scale * 0.07));
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
  ctx.fillStyle = P.SHADE;
  ctx.globalAlpha = 0.8;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawWall(ctx: CanvasRenderingContext2D, c: Vec2, size: number): void {
  const s = size * 0.7;
  ctx.fillStyle = P.SHADE;
  ctx.globalAlpha = 0.75;
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
      if (getThemeId() === "retro" && !prefersLiteMotion()) {
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

  // Dense boards emit a segment per matched edge — over a hundred of them — so
  // segments are grouped by channel and stroked in one path per channel. Retro's
  // glow is a single blurred pass instead of one per segment.
  const byChannel = new Map<number, { x1: number; y1: number; x2: number; y2: number }[]>();
  for (const beam of result.beams) {
    const n = beam.segments.length;
    if (!n) continue;
    const channel = beam.channel ?? 0;
    let list = byChannel.get(channel);
    if (!list) {
      list = [];
      byChannel.set(channel, list);
    }
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      if (progress <= t0) continue;
      const lp = Math.min(1, (progress - t0) / Math.max(t1 - t0, 0.0001));
      const seg = beam.segments[i];
      const from = cellCenter(layout, seg.from);
      const to = cellCenter(layout, seg.to);
      list.push({
        x1: from.x,
        y1: from.y,
        x2: from.x + (to.x - from.x) * lp,
        y2: from.y + (to.y - from.y) * lp,
      });
    }
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [channel, segs] of byChannel) {
    if (!segs.length) continue;
    const ink = theme === "retro" ? "#FFE0F8" : channelColor(channel);
    const buildSegs = (): void => {
      ctx.beginPath();
      for (const s of segs) {
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
      }
    };
    if (theme === "retro") {
      strokeNeonPinkBeam(ctx, buildSegs, layout.cell);
    } else {
      ctx.strokeStyle = ink;
      ctx.lineWidth = beamW;
      strokeChannel(ctx, channel, layout.cell / 56);
      buildSegs();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = theme === "retro" ? "#5CFFF8" : ink;
    if (theme === "retro" && !prefersLiteMotion()) {
      ctx.shadowColor = "#5CFFF8";
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    for (const s of segs) {
      ctx.moveTo(s.x1 + jointR, s.y1);
      ctx.arc(s.x1, s.y1, jointR, 0, Math.PI * 2);
      ctx.moveTo(s.x2 + jointR, s.y2);
      ctx.arc(s.x2, s.y2, jointR, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
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
  const theme = getThemeId();
  ctx.save();
  if (theme === "paper") {
    ctx.fillStyle = P.INK;
    ctx.font = fontHand(18);
  } else if (theme === "retro") {
    ctx.fillStyle = "#FF9DE0";
    ctx.shadowColor = "#FF4FB8";
    ctx.shadowBlur = 6;
    ctx.font = fontRetro(13, 700);
  } else if (theme === "punk") {
    ctx.fillStyle = "#C8FF00";
    ctx.font = fontPunk(15);
  } else if (theme === "mono") {
    ctx.fillStyle = "#FF2A2A";
    ctx.shadowColor = "#FF2A2A";
    ctx.shadowBlur = 8;
    ctx.font = fontCyber(14, 600);
  } else {
    ctx.fillStyle = P.INK;
    ctx.font = font(700, 16);
  }
  ctx.textAlign = "center";
  ctx.fillText(`MOVES  ${moves}`, W / 2 - 220, 132);
  if (pulsesLeft >= 0 && pulseLimit >= 0) {
    ctx.fillText(`CHECKS  ${pulsesLeft}/${pulseLimit}`, W / 2 + 10, 132);
  }
  if (need > 0) {
    ctx.fillText(spill > 0 ? `OPEN  ${spill}` : `NET  ${lit}/${need}`, W / 2 + 220, 132);
  }
  ctx.restore();
}

export function drawCoachHint(ctx: CanvasRenderingContext2D, text: string, y = 1048): void {
  const maxW = 560;
  const theme = getThemeId();
  const ink = theme === "paper";
  ctx.font = ink
    ? fontScript(22)
    : theme === "retro"
      ? fontRetro(14, 600)
      : theme === "punk"
        ? fontPunk(15)
        : theme === "mono"
          ? fontCyber(14, 600)
          : font(600, 18);
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

  if (ink) {
    ctx.save();
    ctx.fillStyle = P.INK;
    ctx.globalAlpha = 0.82;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + i * 26));
    ctx.restore();
    return;
  }

  ctx.save();
  if (theme === "retro") {
    ctx.fillStyle = "#C8B0D8";
    ctx.shadowColor = "#FF4FB8";
    ctx.shadowBlur = 4;
  } else if (theme === "punk") {
    ctx.fillStyle = "#C8FF00";
  } else if (theme === "mono") {
    ctx.fillStyle = "#FF6A6A";
  } else {
    ctx.fillStyle = P.INK_SOFT;
  }
  ctx.textAlign = "center";
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + i * 26));
  ctx.restore();
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
  /** Override label→track gap (defaults: compact 42, full 110). */
  labelW?: number;
};

let logoImg: HTMLImageElement | null = null;
let logoReady = false;
/** Cached tinted mark: theme|size → canvas. Avoids alloc every frame (mobile-hostile). */
const logoTintCache = new Map<string, HTMLCanvasElement>();

export function loadLogo(): void {
  if (logoImg) return;
  logoImg = new Image();
  logoImg.onload = () => {
    logoReady = true;
    logoTintCache.clear();
  };
  logoImg.onerror = () => {
    logoReady = false;
    logoImg = null;
  };
  // Alpha-punched mark in public/; tints cleanly per theme.
  logoImg.src = "./logo-pulse-link.png?v=7";
}

function logoTintColor(): string {
  const id = getThemeId();
  if (id === "retro") return P.CH0;
  if (id === "punk") return P.SELECT;
  if (id === "mono") return "#FF2A2A";
  return P.INK;
}

function tintedLogoMark(size: number, tint: string): HTMLCanvasElement | null {
  if (!logoReady || !logoImg || !logoImg.naturalWidth) return null;
  const key = `${getThemeId()}|${tint}|${size}`;
  const hit = logoTintCache.get(key);
  if (hit) return hit;
  const scratch = document.createElement("canvas");
  scratch.width = size;
  scratch.height = size;
  const sctx = scratch.getContext("2d");
  if (!sctx) return null;
  sctx.clearRect(0, 0, size, size);
  sctx.drawImage(logoImg, 0, 0, size, size);
  sctx.globalCompositeOperation = "source-in";
  sctx.fillStyle = tint;
  sctx.fillRect(0, 0, size, size);
  logoTintCache.set(key, scratch);
  // Cap cache growth if themes thrash.
  if (logoTintCache.size > 12) {
    const first = logoTintCache.keys().next().value;
    if (first) logoTintCache.delete(first);
  }
  return scratch;
}

function drawLogoVectorMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  tint: string,
): void {
  ctx.save();
  ctx.strokeStyle = tint;
  ctx.fillStyle = tint;
  ctx.lineWidth = Math.max(1.5, radius * 0.045);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.13, 0, Math.PI * 2);
  ctx.fill();
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * radius * 0.26, cy + Math.sin(a) * radius * 0.26);
    ctx.lineTo(cx + Math.cos(a) * radius * 0.78, cy + Math.sin(a) * radius * 0.78);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * radius * 0.9, cy + Math.sin(a) * radius * 0.9, radius * 0.1, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const s = radius * 0.1;
    const px = cx + Math.cos(a) * radius * 0.63;
    const py = cy + Math.sin(a) * radius * 0.63;
    ctx.fillRect(px - s / 2, py - s / 2, s, s);
  }
  ctx.restore();
}

/** Brand mark + wordmark, tinted to the active theme. Always draws the title. */
export function drawLogo(ctx: CanvasRenderingContext2D, cx: number, top: number, width = 420): void {
  const tint = logoTintColor();
  const scale = width / 420;
  const markSize = Math.round(Math.max(96, width * 0.55));
  const markCy = top + markSize * 0.52;
  const wordY = top + markSize + 28 * scale;

  const tinted = tintedLogoMark(markSize, tint);
  if (tinted) {
    ctx.drawImage(tinted, cx - markSize / 2, top, markSize, markSize);
  } else {
    drawLogoVectorMark(ctx, cx, markCy, markSize * 0.42, tint);
  }

  ctx.save();
  ctx.fillStyle = tint;
  ctx.strokeStyle = tint;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = font(700, Math.round(36 * scale));
  ctx.fillText("PULSE LINK", cx, wordY);
  const divY = wordY + 28 * scale;
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
  ctx.fillText("TURN. LINK. PULSE.", cx, divY + 24 * scale);
  ctx.restore();
}

export function drawTitle(ctx: CanvasRenderingContext2D, subtitle?: string): void {
  const theme = getThemeId();
  ctx.fillStyle = P.INK;
  if (theme === "paper") {
    // Tiny pulse/EKG mark above the hand-lettered wordmark.
    ctx.save();
    ctx.strokeStyle = P.INK;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const mid = W / 2;
    ctx.beginPath();
    ctx.moveTo(mid - 28, 28);
    ctx.lineTo(mid - 12, 28);
    ctx.lineTo(mid - 6, 18);
    ctx.lineTo(mid, 38);
    ctx.lineTo(mid + 6, 24);
    ctx.lineTo(mid + 12, 28);
    ctx.lineTo(mid + 28, 28);
    ctx.stroke();
    ctx.restore();
    ctx.font = fontHand(34);
    ctx.textAlign = "center";
    ctx.fillText("PULSE LINK", W / 2, 62);
    ctx.fillStyle = P.INK_FAINT;
    ctx.font = fontHand(15);
    ctx.fillText(subtitle ?? "TURN. LINK. PULSE.", W / 2, 88);
    return;
  }
  if (theme === "retro") {
    ctx.save();
    ctx.textAlign = "center";
    ctx.shadowColor = "#FF4FB8";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#5CFFF8";
    ctx.font = fontRetro(26, 800);
    ctx.fillText("PULSE LINK", W / 2, 58);
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#FF9DE0";
    ctx.font = fontRetro(12, 600);
    ctx.fillText(subtitle ?? "TURN. LINK. PULSE.", W / 2, 84);
    ctx.restore();
    return;
  }
  if (theme === "punk") {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#C8FF00";
    ctx.font = fontPunk(30);
    ctx.fillText("PULSE LINK", W / 2, 60);
    // Magenta offset stamp — xerox misregister.
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#FF2D95";
    ctx.fillText("PULSE LINK", W / 2 + 2, 62);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#F2F0E8";
    ctx.font = fontPunk(13);
    ctx.fillText(subtitle ?? "TURN. LINK. PULSE.", W / 2, 88);
    ctx.restore();
    return;
  }
  if (theme === "mono") {
    ctx.save();
    ctx.textAlign = "center";
    // Neon-red wordmark with a soft bloom — matches the terminal HUD.
    ctx.shadowColor = "#FF2A2A";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#FF2A2A";
    ctx.font = fontCyber(27, 700);
    ctx.fillText("PULSE LINK", W / 2, 58);
    // Flanking chevrons like the reference HUD.
    ctx.shadowBlur = 0;
    ctx.font = fontCyber(16, 600);
    ctx.fillText("◂", W / 2 - 118, 58);
    ctx.fillText("▸", W / 2 + 118, 58);
    ctx.fillStyle = "#FF6A6A";
    ctx.font = fontCyber(12, 600);
    ctx.fillText(subtitle ?? "TURN. LINK. PULSE.", W / 2, 84);
    ctx.restore();
    return;
  }
  ctx.font = font(700, 28);
  ctx.textAlign = "center";
  ctx.fillText("PULSE LINK", W / 2, 58);
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = font(600, 14);
  ctx.fillText(subtitle ?? "TURN. LINK. PULSE.", W / 2, 84);
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

  // INK — sketched double-border notepad buttons (no taupe fill).
  if (theme === "paper") {
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.translate(cx, cy);
    ctx.scale(press, press);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = primary ? "#F0EDE4" : "#FBF9F4";
    ctx.strokeStyle = P.INK;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.stroke();
    // Inner hand-drawn frame.
    ctx.lineWidth = 1.15;
    ctx.globalAlpha = enabled ? 0.7 : 0.28;
    roundRect(ctx, rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, 4);
    ctx.stroke();
    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.fillStyle = P.INK;
    ctx.font = fontHand(20);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    ctx.restore();
    return;
  }

  // RETRO — dark purple panel, magenta neon rim, Orbitron label.
  if (theme === "retro") {
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.38;
    ctx.translate(cx, cy);
    ctx.scale(press, press);
    ctx.translate(-cx, -cy);
    const pulse = primary ? 0.55 + 0.2 * Math.sin(time * 3.4) : 0.35;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fillStyle = primary ? "#1C0840" : "#12062A";
    ctx.fill();
    ctx.shadowColor = "#FF4FB8";
    ctx.shadowBlur = primary ? 14 + pulse * 8 : 8;
    ctx.strokeStyle = primary ? "#FF6EC7" : "#C24A9A";
    ctx.lineWidth = primary ? 2.2 : 1.6;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = enabled ? 0.55 : 0.22;
    ctx.strokeStyle = "#5CFFF8";
    ctx.lineWidth = 1;
    roundRect(ctx, rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, 5);
    ctx.stroke();
    ctx.globalAlpha = enabled ? 1 : 0.38;
    ctx.shadowColor = primary ? "#5CFFF8" : "#FF6EC7";
    ctx.shadowBlur = primary ? 8 : 4;
    ctx.fillStyle = primary ? "#5CFFF8" : "#FFB8E8";
    ctx.font = fontRetro(16, 700);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    ctx.restore();
    return;
  }

  // PUNK — torn xerox flyer scrap, acid lime / hot magenta.
  if (theme === "punk") {
    const seed = Math.round(rect.x * 3 + rect.y * 7 + rect.w);
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.35;
    ctx.translate(cx, cy);
    ctx.scale(press, press);
    ctx.translate(-cx, -cy);
    // Offset magenta under-layer — misregistered print.
    ctx.save();
    ctx.translate(2.2, 1.6);
    tornPaperRect(ctx, rect.x, rect.y, rect.w, rect.h, seed + 9);
    ctx.fillStyle = primary ? "#FF2D95" : "#3A1528";
    ctx.fill();
    ctx.restore();
    tornPaperRect(ctx, rect.x, rect.y, rect.w, rect.h, seed);
    ctx.fillStyle = primary ? "#141414" : "#0A0A0A";
    ctx.fill();
    ctx.strokeStyle = primary ? "#C8FF00" : "#F2F0E8";
    ctx.lineWidth = primary ? 2.4 : 1.7;
    ctx.lineJoin = "round";
    ctx.stroke();
    // Inner slash frame
    ctx.globalAlpha = enabled ? 0.7 : 0.25;
    ctx.strokeStyle = primary ? "#FF2D95" : "#C8FF00";
    ctx.lineWidth = 1.1;
    tornPaperRect(ctx, rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10, seed + 4);
    ctx.stroke();
    ctx.globalAlpha = enabled ? 1 : 0.35;
    ctx.fillStyle = primary ? "#C8FF00" : "#F2F0E8";
    ctx.font = fontPunk(18);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Slight label skew for sticker energy
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    ctx.rotate((-2.2 * Math.PI) / 180);
    ctx.fillText(label, 0, 0);
    ctx.restore();
    ctx.restore();
    return;
  }

  // CYBER — black carbon panel, red neon rim (primary glows harder).
  if (theme === "mono") {
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.translate(cx, cy);
    ctx.scale(press, press);
    ctx.translate(-cx, -cy);
    const pulse = primary ? 0.55 + 0.2 * Math.sin(time * 3.4) : 0.35;
    const chamfer = Math.min(14, rect.h * 0.4);
    const panel = (): void => {
      const { x, y, w, h } = rect;
      ctx.beginPath();
      ctx.moveTo(x + chamfer, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h - chamfer);
      ctx.lineTo(x + w - chamfer, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + chamfer);
      ctx.closePath();
    };
    const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    fill.addColorStop(0, primary ? "#1A0A0C" : "#101012");
    fill.addColorStop(1, primary ? "#0C0608" : "#08080A");
    panel();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowColor = "#FF2A2A";
    ctx.shadowBlur = primary ? 14 + pulse * 8 : 8;
    ctx.strokeStyle = primary ? "#FF2A2A" : "#C02020";
    ctx.lineWidth = primary ? 2.4 : 1.6;
    ctx.lineJoin = "miter";
    panel();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Inner accent line.
    ctx.globalAlpha = enabled ? 0.45 : 0.16;
    ctx.strokeStyle = "#FF6A6A";
    ctx.lineWidth = 1;
    roundRect(ctx, rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, 2);
    ctx.stroke();
    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.shadowColor = "#FF2A2A";
    ctx.shadowBlur = primary ? 6 : 2;
    ctx.fillStyle = primary ? "#FF2A2A" : "#FF6A6A";
    ctx.font = fontCyber(16, 600);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label.toUpperCase(), rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    ctx.restore();
    return;
  }

  // Paper themes: buttons match the disc taupe. Night themes keep a darker fill.
  const fill = isLightTheme(theme) ? P.TABLE_FILL : primary ? P.PAPER_DARK : P.FILL;
  const stroke = primary ? P.SELECT : P.INK;
  const shadow = isDarkTheme(theme) ? "rgba(0,0,0,0.4)" : "rgba(30, 24, 18, 0.12)";

  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.4;
  ctx.translate(cx, cy);
  ctx.scale(press, press);
  ctx.translate(-cx, -cy);
  ctx.shadowColor = shadow;
  ctx.shadowBlur = isLightTheme(theme) ? 4 : 6;
  ctx.shadowOffsetY = 1;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = primary ? 1.7 : 1.35;
  ctx.globalAlpha = enabled ? (primary ? 0.9 : 0.55) : 0.3;
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
  if (theme === "paper") {
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.translate(x, y);
    ctx.fillStyle = "#FBF9F4";
    ctx.strokeStyle = P.INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = enabled ? 0.65 : 0.28;
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.fillStyle = P.INK;
    ctx.font = fontHand(Math.round(r * 1.05));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 1);
    ctx.restore();
    return;
  }

  if (theme === "retro") {
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.38;
    ctx.translate(x, y);
    ctx.fillStyle = "#12062A";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "#FF4FB8";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#FF6EC7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = enabled ? 0.55 : 0.22;
    ctx.strokeStyle = "#5CFFF8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = enabled ? 1 : 0.38;
    ctx.shadowColor = "#5CFFF8";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#5CFFF8";
    ctx.font = fontRetro(Math.round(r * 0.85), 700);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 1);
    ctx.restore();
    return;
  }

  if (theme === "punk") {
    const seed = Math.round(x * 5 + y * 11 + r * 3);
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.35;
    ctx.translate(x, y);
    // Magenta under-tear
    ctx.save();
    ctx.translate(1.8, 1.4);
    tornPaperRect(ctx, -r, -r, r * 2, r * 2, seed + 3);
    ctx.fillStyle = "#FF2D95";
    ctx.fill();
    ctx.restore();
    tornPaperRect(ctx, -r, -r, r * 2, r * 2, seed);
    ctx.fillStyle = "#0A0A0A";
    ctx.fill();
    ctx.strokeStyle = "#C8FF00";
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.globalAlpha = enabled ? 0.65 : 0.22;
    ctx.strokeStyle = "#FF2D95";
    ctx.lineWidth = 1.1;
    tornPaperRect(ctx, -r + 5, -r + 5, r * 2 - 10, r * 2 - 10, seed + 7);
    ctx.stroke();
    ctx.globalAlpha = enabled ? 1 : 0.35;
    ctx.fillStyle = "#C8FF00";
    ctx.font = fontPunk(Math.round(r * 0.95));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.rotate((-3 * Math.PI) / 180);
    ctx.fillText(label, 0, 1);
    ctx.restore();
    return;
  }

  if (theme === "mono") {
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.translate(x, y);
    const disc = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, 0, 0, r);
    disc.addColorStop(0, "#1A1A1E");
    disc.addColorStop(1, "#0A0A0C");
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = disc;
    ctx.fill();
    ctx.shadowColor = "#FF2A2A";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#FF2A2A";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 106, 106, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r - 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#FF2A2A";
    ctx.font = fontCyber(Math.round(r * 0.85), 600);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 1);
    ctx.restore();
    return;
  }

  const stroke = P.INK;
  const shadow = isDarkTheme(theme) ? "rgba(0,0,0,0.4)" : "rgba(30, 24, 18, 0.12)";

  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.4;
  ctx.translate(x, y);
  ctx.shadowColor = shadow;
  ctx.shadowBlur = isLightTheme(theme) ? 4 : 6;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = isLightTheme(theme) ? P.TABLE_FILL : P.FILL;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = enabled ? 0.55 : 0.28;
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
  const ink = theme === "paper";
  const retro = theme === "retro";
  const isCompact = compact || !!rect.compact;
  const knobR = isCompact ? 10 : 16;
  const trackThick = isCompact ? 4 : 6.5;
  const labelW = rect.labelW ?? (isCompact ? 42 : 110);
  void time;
  ctx.save();
  ctx.fillStyle = retro ? "#FF9DE0" : theme === "mono" ? "#FF6A6A" : P.INK_FAINT;
  ctx.font = ink
    ? fontHand(isCompact ? 15 : 19)
    : theme === "mono"
      ? fontCyber(isCompact ? 13 : 16, 600)
      : font(700, isCompact ? 13 : 17);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x, rect.y + rect.h / 2);
  const trackX = rect.x + labelW;
  const trackW = rect.w - labelW;
  const trackY = rect.y + rect.h / 2;
  ctx.strokeStyle = ink ? P.INK : retro ? "#C24A9A" : theme === "mono" ? "#3A1214" : P.INK_HAIR;
  ctx.lineWidth = ink ? 1.4 : trackThick;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(trackX, trackY);
  ctx.lineTo(trackX + trackW, trackY);
  ctx.stroke();
  ctx.strokeStyle = ink ? P.INK : retro ? "#FF6EC7" : theme === "mono" ? "#FF2A2A" : P.TABLE_OUTLINE;
  ctx.lineWidth = ink ? 1.8 : trackThick;
  if (retro) {
    ctx.shadowColor = "#FF4FB8";
    ctx.shadowBlur = 6;
  } else if (theme === "mono") {
    ctx.shadowColor = "#FF2A2A";
    ctx.shadowBlur = 6;
  }
  ctx.beginPath();
  ctx.moveTo(trackX, trackY);
  ctx.lineTo(trackX + trackW * rect.value, trackY);
  ctx.stroke();
  ctx.shadowBlur = 0;
  const kx = trackX + trackW * rect.value;
  ctx.fillStyle = ink ? "#FBF9F4" : retro ? "#5CFFF8" : theme === "mono" ? "#FF2A2A" : P.TABLE_FILL;
  if (retro) {
    ctx.shadowColor = "#5CFFF8";
    ctx.shadowBlur = 8;
  } else if (theme === "mono") {
    ctx.shadowColor = "#FF2A2A";
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.arc(kx, trackY, knobR, 0, Math.PI * 2);
  ctx.fill();
  if (ink) {
    ctx.strokeStyle = P.INK;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
  ctx.restore();
}

/** Compact mute checkbox — sits beside the music slider. */
export function drawMuteBox(
  ctx: CanvasRenderingContext2D,
  rect: ButtonRect,
  muted: boolean,
): void {
  const theme = getThemeId();
  const ink = theme === "paper";
  const retro = theme === "retro";
  const punk = theme === "punk";
  const cyber = theme === "mono";
  const size = Math.min(rect.w, rect.h);
  const x = rect.x + (rect.w - size) / 2;
  const y = rect.y + (rect.h - size) / 2;
  ctx.save();
  if (ink) {
    ctx.fillStyle = "#FBF9F4";
    ctx.strokeStyle = P.INK;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, size, size, 3);
    ctx.fill();
    ctx.stroke();
  } else if (retro) {
    ctx.fillStyle = "#12062A";
    ctx.strokeStyle = muted ? "#FF6EC7" : "#5CFFF8";
    ctx.lineWidth = 1.6;
    if (muted) {
      ctx.shadowColor = "#FF4FB8";
      ctx.shadowBlur = 6;
    }
    roundRect(ctx, x, y, size, size, 4);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (punk) {
    ctx.fillStyle = "#0A0A0A";
    ctx.strokeStyle = muted ? "#FF2D95" : "#C8FF00";
    ctx.lineWidth = 1.8;
    roundRect(ctx, x, y, size, size, 2);
    ctx.fill();
    ctx.stroke();
  } else if (cyber) {
    ctx.fillStyle = "#0A0A0C";
    ctx.strokeStyle = muted ? "#FF2A2A" : "#FF6A6A";
    ctx.lineWidth = 1.6;
    roundRect(ctx, x, y, size, size, 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = P.FILL;
    ctx.strokeStyle = P.INK;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, size, size, 3);
    ctx.fill();
    ctx.stroke();
  }
  if (muted) {
    ctx.strokeStyle = ink
      ? P.INK
      : retro
        ? "#FF6EC7"
        : punk
          ? "#FF2D95"
          : cyber
            ? "#FF2A2A"
            : P.SELECT;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + size * 0.22, y + size * 0.52);
    ctx.lineTo(x + size * 0.42, y + size * 0.72);
    ctx.lineTo(x + size * 0.78, y + size * 0.28);
    ctx.stroke();
  }
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = ink ? fontHand(13) : font(600, 11);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("MUTE", rect.x + rect.w + 8, rect.y + rect.h / 2);
  ctx.restore();
}

export function sliderValueAt(rect: SliderRect, px: number): number {
  const labelW = rect.labelW ?? (rect.compact ? 42 : 110);
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
