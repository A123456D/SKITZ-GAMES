import {
  COLS,
  ROWS,
  POWERUP_KINDS,
  type PowerUpKind,
  type Progress,
  type TileKind,
  type ZoneId,
} from "../core/types";
import type { Session } from "../core/session";
import { LEVELS, ZONES, zoneLevels } from "../core/levels";
import {
  fxImage,
  obstacleImage,
  powerImage,
  stickerImage,
  uiImage,
} from "./stickers";
import { Palette } from "./theme";
import { drawParticles } from "./particles";
import { floatPose, getVisual } from "./motion";

export const W = 720;
export const H = 1280;

export type UiRect = { x: number; y: number; w: number; h: number };

export const HOME_PLAY: UiRect = { x: 90, y: 520, w: 540, h: 100 };
export const HOME_MAP: UiRect = { x: 110, y: 640, w: 500, h: 80 };
export const HOME_SETTINGS: UiRect = { x: 110, y: 740, w: 500, h: 80 };
export const PAUSE_BTN: UiRect = { x: 620, y: 36, w: 64, h: 64 };
export const MAP_BACK: UiRect = { x: 36, y: 36, w: 120, h: 56 };
export const MAP_PLAY: UiRect = { x: 200, y: 1160, w: 320, h: 72 };

export const POWER_DOCK: { kind: PowerUpKind; rect: UiRect }[] = POWERUP_KINDS.map(
  (kind, i) => ({
    kind,
    rect: { x: 48 + i * 112, y: 1110, w: 100, h: 100 },
  }),
);

export type BoardLayout = {
  x: number;
  y: number;
  cell: number;
  gap: number;
};

export function boardLayout(): BoardLayout {
  const gap = 5;
  const width = 640;
  const cell = (width - gap * (COLS - 1)) / COLS;
  return {
    x: (W - width) / 2,
    y: 320,
    cell,
    gap,
  };
}

export function hitUi(r: UiRect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function hitPowerDock(x: number, y: number): PowerUpKind | null {
  for (const slot of POWER_DOCK) {
    if (hitUi(slot.rect, x, y)) return slot.kind;
  }
  return null;
}

export function cellAt(
  layout: BoardLayout,
  x: number,
  y: number,
): { c: number; r: number } | null {
  const localX = x - layout.x;
  const localY = y - layout.y;
  if (localX < 0 || localY < 0) return null;
  const stride = layout.cell + layout.gap;
  const c = Math.floor(localX / stride);
  const r = Math.floor(localY / stride);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  const inCellX = localX - c * stride;
  const inCellY = localY - r * stride;
  if (inCellX > layout.cell || inCellY > layout.cell) return null;
  return { c, r };
}

export function cellCenter(
  layout: BoardLayout,
  c: number,
  r: number,
): { x: number; y: number } {
  return {
    x: layout.x + c * (layout.cell + layout.gap) + layout.cell / 2,
    y: layout.y + r * (layout.cell + layout.gap) + layout.cell / 2,
  };
}

function cover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  fallback: string,
): void {
  if (image && image.complete && image.naturalWidth > 0) {
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    const scale = Math.max(W / iw, H / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(image, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return;
  }
  ctx.fillStyle = fallback;
  ctx.fillRect(0, 0, W, H);
}

function drawImg(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  shadow = true,
): void {
  if (!image || !image.complete) return;
  ctx.save();
  if (shadow) {
    ctx.shadowColor = Palette.shadow;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;
  }
  ctx.drawImage(image, x, y, w, h);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number,
): void {
  const r = Math.min(rad, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSticker(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  cx: number,
  cy: number,
  size: number,
  selected = false,
  rot = 0,
  opacity = 1,
): void {
  const image = stickerImage(kind);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);
  ctx.shadowColor = Palette.shadow;
  ctx.shadowBlur = Math.max(6, size * 0.14);
  ctx.shadowOffsetX = size * 0.05;
  ctx.shadowOffsetY = size * 0.09;
  const x = -size / 2;
  const y = -size / 2;
  if (image && image.complete) {
    ctx.drawImage(image, x, y, size, size);
  } else {
    ctx.fillStyle = Palette.paper;
    roundRect(ctx, x, y, size, size, 10);
    ctx.fill();
  }
  if (selected) {
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = Palette.hot;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 4, y - 4, size + 8, size + 8, 12);
    ctx.stroke();
  }
  ctx.restore();
}

function paperBtn(
  ctx: CanvasRenderingContext2D,
  rect: UiRect,
  label: string,
  opts?: { play?: boolean; hot?: boolean },
): void {
  const art = uiImage(opts?.play ? "btn-play" : "btn-paper");
  if (art && art.complete) {
    drawImg(ctx, art, rect.x, rect.y, rect.w, rect.h, true);
  } else {
    ctx.fillStyle = opts?.play || opts?.hot ? Palette.hot : Palette.paper;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
  }
  ctx.fillStyle = opts?.play || opts?.hot ? Palette.white : Palette.ink;
  ctx.font = "800 34px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 2);
}

export function drawHome(ctx: CanvasRenderingContext2D, progress: Progress): void {
  cover(ctx, uiImage("bg-menu"), Palette.bg);

  const logo = uiImage("logo");
  if (logo && logo.complete) {
    const lw = 560;
    const lh = (logo.naturalHeight / logo.naturalWidth) * lw;
    drawImg(ctx, logo, (W - lw) / 2, 120, lw, Math.min(lh, 320), true);
  } else {
    ctx.fillStyle = Palette.white;
    ctx.font = "800 64px 'Permanent Marker', cursive";
    ctx.textAlign = "center";
    ctx.fillText("PAPER RIOT", W / 2, 260);
  }

  paperBtn(ctx, HOME_PLAY, "PLAY", { play: true });
  paperBtn(ctx, HOME_MAP, "WORLD MAP");
  paperBtn(ctx, HOME_SETTINGS, "SETTINGS");

  ctx.fillStyle = Palette.white;
  ctx.font = "600 22px 'Patrick Hand', cursive";
  ctx.textAlign = "center";
  ctx.fillText(
    `Next: Level ${Math.min(progress.unlocked, 40)}`,
    W / 2,
    880,
  );

  // Lives / gems
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  roundRect(ctx, 40, 980, 220, 70, 8);
  ctx.fill();
  ctx.fillStyle = Palette.hot;
  ctx.font = "800 26px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`♥  ${progress.lives} FULL`, 60, 1024);

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  roundRect(ctx, 420, 980, 260, 70, 8);
  ctx.fill();
  ctx.fillStyle = Palette.purple;
  ctx.fillText(`◆  ${progress.gems}`, 440, 1024);

  ctx.fillStyle = Palette.white;
  ctx.font = "600 28px 'Patrick Hand', cursive";
  ctx.textAlign = "center";
  ctx.fillText("RIP. MATCH. REPEAT.", W / 2, 1180);
}

/** Candy Crush–style zigzag path through a zone (bottom → top). */
function zonePath(zoneIndex: number): { x: number; y: number }[] {
  const sway = [0, 1, 0, -1, 0, 1, 0, -1, 0, 1] as const;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const lane = sway[(i + zoneIndex) % sway.length]!;
    const x = W / 2 + lane * 160 + Math.sin(t * Math.PI * 2 + zoneIndex) * 18;
    const y = 1000 - t * 720;
    pts.push({ x, y });
  }
  return pts;
}

export function mapNodeAt(
  zone: ZoneId,
  x: number,
  y: number,
): number | null {
  const zi = ZONES.findIndex((z) => z.id === zone);
  const levels = zoneLevels(zone);
  const path = zonePath(zi);
  for (let i = 0; i < levels.length; i++) {
    const p = path[i]!;
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy <= 40 * 40) return levels[i]!.id;
  }
  return null;
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  progress: Progress,
  zone: ZoneId,
  selectedLevel: number,
): void {
  cover(ctx, uiImage("bg-map"), "#1a1510");

  const zi = ZONES.findIndex((z) => z.id === zone);
  const zoneMeta = ZONES[zi]!;
  const levels = zoneLevels(zone);
  const path = zonePath(zi);

  // Zone title scrap
  ctx.fillStyle = Palette.paper;
  roundRect(ctx, 160, 40, 400, 90, 8);
  ctx.fill();
  ctx.strokeStyle = Palette.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = Palette.ink;
  ctx.font = "800 32px 'Permanent Marker', cursive";
  ctx.textAlign = "center";
  ctx.fillText(zoneMeta.name, W / 2, 78);
  ctx.font = "600 20px 'Patrick Hand', cursive";
  ctx.fillText(zoneMeta.tagline, W / 2, 110);

  paperBtn(ctx, MAP_BACK, "BACK");

  // Zone tabs
  ZONES.forEach((z, i) => {
    const r = { x: 40 + i * 170, y: 150, w: 155, h: 48 };
    const unlockedZone = progress.unlocked > i * 10;
    ctx.fillStyle = z.id === zone ? Palette.hot : unlockedZone ? Palette.paper : "#666";
    roundRect(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.fill();
    ctx.fillStyle = z.id === zone ? Palette.white : Palette.ink;
    ctx.font = "800 16px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(z.name.split(" ")[0]!, r.x + r.w / 2, r.y + 30);
  });

  // Path line
  ctx.strokeStyle = Palette.tape;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  path.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.strokeStyle = Palette.ink;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Nodes
  levels.forEach((lv, i) => {
    const p = path[i]!;
    const unlocked = lv.id <= progress.unlocked;
    const stars = progress.stars[lv.id] ?? 0;
    const selected = lv.id === selectedLevel;
    ctx.save();
    ctx.shadowColor = Palette.shadow;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, selected ? 34 : 28, 0, Math.PI * 2);
    ctx.fillStyle = !unlocked ? "#444" : selected ? Palette.hot : Palette.paper;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = Palette.ink;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = !unlocked ? "#aaa" : selected ? Palette.white : Palette.ink;
    ctx.font = "800 22px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(unlocked ? String(lv.id) : "🔒", p.x, p.y);

    if (stars > 0) {
      ctx.fillStyle = Palette.lime;
      ctx.font = "18px sans-serif";
      ctx.fillText("★".repeat(stars), p.x, p.y + 42);
    }
  });

  const sel = LEVELS.find((l) => l.id === selectedLevel);
  if (sel) {
    ctx.fillStyle = Palette.paper;
    roundRect(ctx, 80, 1040, 560, 100, 8);
    ctx.fill();
    ctx.fillStyle = Palette.ink;
    ctx.font = "800 26px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${sel.name}  ·  ${sel.moves} moves  ·  ${sel.shape}`, W / 2, 1080);
  }

  paperBtn(ctx, MAP_PLAY, "PLAY LEVEL", { hot: true });
}

export function hitZoneTab(x: number, y: number): ZoneId | null {
  for (let i = 0; i < ZONES.length; i++) {
    const r = { x: 40 + i * 170, y: 150, w: 155, h: 48 };
    if (hitUi(r, x, y)) return ZONES[i]!.id;
  }
  return null;
}

export function drawPlay(
  ctx: CanvasRenderingContext2D,
  session: Session,
  opts: {
    selected: { c: number; r: number } | null;
    clearing: Set<string>;
    burstT: number;
    armedPower: PowerUpKind | null;
    popFx: { x: number; y: number; t: number } | null;
    time: number;
  },
): void {
  cover(ctx, uiImage("bg-play"), Palette.paper);

  const layout = boardLayout();

  // HUD
  ctx.fillStyle = Palette.paper;
  roundRect(ctx, 36, 36, 200, 70, 8);
  ctx.fill();
  ctx.strokeStyle = Palette.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = Palette.ink;
  ctx.font = "800 26px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`MOVES  ${session.movesLeft}`, 56, 72);

  ctx.fillStyle = Palette.ink;
  roundRect(ctx, 260, 40, 220, 62, 8);
  ctx.fill();
  ctx.fillStyle = Palette.white;
  ctx.textAlign = "center";
  ctx.fillText(`LEVEL ${session.level.id}`, 370, 72);

  ctx.fillStyle = Palette.paper;
  roundRect(ctx, PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h, 8);
  ctx.fill();
  ctx.fillStyle = Palette.ink;
  ctx.fillRect(PAUSE_BTN.x + 20, PAUSE_BTN.y + 18, 8, 28);
  ctx.fillRect(PAUSE_BTN.x + 36, PAUSE_BTN.y + 18, 8, 28);

  // Goals
  ctx.fillStyle = Palette.paper;
  roundRect(ctx, 56, 120, 608, 160, 8);
  ctx.fill();
  ctx.strokeStyle = Palette.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = Palette.ink;
  ctx.font = "800 24px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("GOAL", 90, 155);

  session.goals.forEach((g, i) => {
    const gx = 110 + i * 180;
    const gy = 220;
    const bob = Math.sin(opts.time * 2.4 + i * 1.3) * 3;
    drawSticker(ctx, g.kind, gx, gy + bob, 52, false, Math.sin(opts.time * 1.5 + i) * 0.05);
    ctx.fillStyle = Palette.ink;
    ctx.font = "800 22px 'Chakra Petch', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${g.have}/${g.need}`, gx + 38, gy + 6);
  });

  // Board paper plate
  const boardH = layout.cell * ROWS + layout.gap * (ROWS - 1) + 24;
  const boardW = layout.cell * COLS + layout.gap * (COLS - 1) + 24;
  ctx.fillStyle = "rgba(247,242,230,0.92)";
  roundRect(ctx, layout.x - 12, layout.y - 12, boardW, boardH, 10);
  ctx.fill();
  ctx.strokeStyle = Palette.ink;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Tiles (motion + float)
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!session.mask[c]![r]) continue;
      const key = `${c},${r}`;
      const cell = session.board[c]![r];
      if (!cell) continue;
      const clearing = opts.clearing.has(key);
      const selected =
        !!opts.selected && opts.selected.c === c && opts.selected.r === r;
      const visual = getVisual(cell.id);
      const base = cellCenter(layout, c, r);
      const pose = visual
        ? floatPose(visual, opts.time, selected)
        : { x: base.x, y: base.y, rot: 0, scale: 1 };
      const size = layout.cell * 0.86 * pose.scale;
      const opacity = clearing
        ? Math.max(0, 1 - opts.burstT)
        : visual?.opacity ?? 1;
      if (opacity <= 0.02) continue;
      drawSticker(
        ctx,
        cell.kind,
        pose.x,
        pose.y,
        size,
        selected,
        pose.rot,
        opacity,
      );
      if (cell.obstacle && !clearing) {
        const oimg = obstacleImage(cell.obstacle);
        const s = layout.cell * 0.92 * pose.scale;
        ctx.save();
        ctx.translate(pose.x, pose.y);
        ctx.rotate(pose.rot * 0.5);
        ctx.shadowColor = Palette.shadow;
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 5;
        if (oimg && oimg.complete) {
          ctx.drawImage(oimg, -s / 2, -s / 2, s, s);
        }
        ctx.restore();
        if ((cell.hits ?? 1) > 1) {
          ctx.fillStyle = Palette.hot;
          ctx.font = "800 16px 'Chakra Petch', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            String(cell.hits),
            pose.x + s * 0.32,
            pose.y - s * 0.28,
          );
        }
      }
    }
  }

  if (opts.burstT > 0 && opts.burstT < 1) {
    for (const key of opts.clearing) {
      const [cs, rs] = key.split(",").map(Number);
      if (!session.mask[cs!]?.[rs!]) continue;
      const cell = session.board[cs!]![rs!];
      const visual = cell ? getVisual(cell.id) : null;
      const center = visual
        ? { x: visual.x, y: visual.y }
        : cellCenter(layout, cs!, rs!);
      const t = opts.burstT;
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.fillStyle = `rgba(10,10,10,${0.55 * (1 - t)})`;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const rad =
          layout.cell * (0.35 + 0.55 * t) * (i % 2 === 0 ? 1.2 : 0.7);
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  if (opts.popFx && opts.popFx.t < 1) {
    const frames = ["pop-skull", "swap-star", "match-hearts"] as const;
    const fi = Math.floor(opts.popFx.t * frames.length * 3) % frames.length;
    const image = fxImage(frames[fi]!) ?? fxImage("pop-skull");
    const s = 90 + 50 * (1 - opts.popFx.t);
    const spin = opts.popFx.t * Math.PI * 1.2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - opts.popFx.t);
    ctx.translate(opts.popFx.x, opts.popFx.y);
    ctx.rotate(spin);
    ctx.shadowColor = Palette.shadow;
    ctx.shadowBlur = 14;
    if (image && image.complete) {
      ctx.drawImage(image, -s / 2, -s / 2, s, s);
    }
    ctx.restore();
  }

  drawParticles(ctx);

  for (const slot of POWER_DOCK) {
    const armed = opts.armedPower === slot.kind;
    ctx.fillStyle = armed ? Palette.hot : Palette.paper;
    roundRect(ctx, slot.rect.x, slot.rect.y, slot.rect.w, slot.rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = Palette.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    const pimg = powerImage(slot.kind);
    const cx = slot.rect.x + slot.rect.w / 2;
    const cy = slot.rect.y + slot.rect.h / 2 - 4;
    const bob = Math.sin(opts.time * 2.8 + slot.rect.x * 0.02) * 3;
    const rot = Math.sin(opts.time * 1.6 + slot.rect.x * 0.01) * 0.08;
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.rotate(rot);
    ctx.shadowColor = Palette.shadow;
    ctx.shadowBlur = 8;
    if (pimg && pimg.complete) ctx.drawImage(pimg, -32, -32, 64, 64);
    ctx.restore();
    ctx.fillStyle = armed ? Palette.white : Palette.ink;
    ctx.font = "800 18px 'Chakra Petch', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      String(session.powers[slot.kind] ?? 0),
      slot.rect.x + slot.rect.w - 12,
      slot.rect.y + slot.rect.h - 14,
    );
  }

  if (opts.armedPower) {
    ctx.fillStyle = Palette.lime;
    ctx.font = "700 22px 'Patrick Hand', cursive";
    ctx.textAlign = "center";
    ctx.fillText("TAP A TILE TO BLAST", W / 2, 1090);
  }

  if (session.status === "won" || session.status === "lost") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = Palette.paper;
    roundRect(ctx, 110, 480, 500, 240, 12);
    ctx.fill();
    ctx.fillStyle = Palette.ink;
    ctx.font = "800 48px 'Permanent Marker', cursive";
    ctx.textAlign = "center";
    ctx.fillText(
      session.status === "won" ? "CLEARED!" : "OUT OF MOVES",
      W / 2,
      560,
    );
    ctx.font = "800 26px 'Chakra Petch', sans-serif";
    ctx.fillText("TAP FOR MAP", W / 2, 640);
  }
}
