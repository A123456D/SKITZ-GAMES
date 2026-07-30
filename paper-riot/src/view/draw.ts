import {
  COLS,
  ROWS,
  POWER_BLURBS,
  OBSTACLE_LABELS,
  type PowerUpKind,
  type Progress,
  type TileKind,
  type ZoneId,
} from "../core/types";
import type { Session } from "../core/session";
import { LEVELS, ZONES, unlockedPowers, zoneLevels } from "../core/levels";
import {
  obstacleImage,
  powerImage,
  stickerImage,
  uiImage,
} from "./stickers";
import { Palette, THEME_LABELS, getTheme } from "./theme";
import { drawParticles } from "./particles";
import { floatPose, getVisual } from "./motion";
import { audioModeLabel, getAudioMode } from "./audioMode";

export const W = 720;
export const H = 1280;

export type UiRect = { x: number; y: number; w: number; h: number };

export const HOME_PLAY: UiRect = { x: 70, y: 470, w: 580, h: 120 };
export const HOME_MAP: UiRect = { x: 90, y: 610, w: 540, h: 100 };
export const HOME_THEME: UiRect = { x: 90, y: 730, w: 540, h: 100 };
export const HOME_SOUND: UiRect = { x: 90, y: 850, w: 540, h: 100 };
/** @deprecated alias — home sound control */
export const HOME_SETTINGS = HOME_SOUND;
export const PAUSE_BTN: UiRect = { x: 620, y: 36, w: 64, h: 64 };
export const PLAY_SOUND_BTN: UiRect = { x: 536, y: 36, w: 64, h: 64 };
export const MAP_BACK: UiRect = { x: 36, y: 36, w: 120, h: 56 };
export const MAP_PLAY: UiRect = { x: 200, y: 1160, w: 320, h: 72 };

export function powerDockFor(levelId: number) {
  const shown = unlockedPowers(levelId);
  const n = Math.max(1, shown.length);
  const totalW = n * 100 + (n - 1) * 12;
  const startX = (W - totalW) / 2;
  return shown.map((kind, i) => ({
    kind,
    rect: { x: startX + i * 112, y: 1110, w: 100, h: 100 } as UiRect,
  }));
}

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

export function hitPowerDock(
  x: number,
  y: number,
  levelId: number,
): PowerUpKind | null {
  for (const slot of powerDockFor(levelId)) {
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
  opts?: {
    play?: boolean;
    hot?: boolean;
    time?: number;
    phase?: number;
    hover?: boolean;
    pressed?: boolean;
  },
): void {
  const time = opts?.time ?? 0;
  const phase = opts?.phase ?? 0;
  const hover = !!opts?.hover;
  const pressed = !!opts?.pressed;

  const bob = Math.sin(time * 2.1 + phase) * 3.2;
  const sway = Math.sin(time * 1.25 + phase * 1.4) * 1.4;
  const tilt = Math.sin(time * 1.55 + phase * 0.9) * 0.018;
  const breath = 1 + Math.sin(time * 2.6 + phase) * 0.012;

  let lift = 10 + bob + (hover ? 6 : 0);
  let scale = breath * (hover ? 1.035 : 1);
  if (pressed) {
    lift = 2;
    scale = 0.97;
  }

  const cx = rect.x + rect.w / 2 + sway;
  const cy = rect.y + rect.h / 2 - lift;

  // Ground shadow (detached soft pad under the scrap)
  ctx.save();
  ctx.translate(cx, rect.y + rect.h / 2 + 10);
  ctx.scale(1.05 + lift * 0.012, 0.38 + lift * 0.008);
  const shadowGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, rect.w * 0.48);
  shadowGrad.addColorStop(0, `rgba(0,0,0,${0.38 + lift * 0.012})`);
  shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rect.w * 0.48, rect.h * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Lifted scrap
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt + (hover ? -0.012 : 0) + (pressed ? 0.01 : 0));
  ctx.scale(scale, scale);

  const art = uiImage(opts?.play ? "btn-play" : "btn-paper");
  const drawW = rect.w;
  const drawH = rect.h;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 10 + lift * 0.9;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6 + lift * 0.55;

  if (art && art.complete && art.naturalWidth > 0) {
    ctx.drawImage(art, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    ctx.fillStyle = opts?.play || opts?.hot ? Palette.hot : Palette.paper;
    roundRect(ctx, -drawW / 2, -drawH / 2, drawW, drawH, 8);
    ctx.fill();
  }

  // Label sits on the scrap (no extra shadow so type stays crisp)
  ctx.shadowColor = "transparent";
  ctx.fillStyle = opts?.play || opts?.hot ? Palette.white : Palette.ink;
  ctx.font =
    rect.h >= 120
      ? "800 40px 'Chakra Petch', sans-serif"
      : rect.h >= 100
        ? "800 34px 'Chakra Petch', sans-serif"
        : "800 26px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 2);
  ctx.restore();
}

export type BtnUiState = {
  time: number;
  hover: string | null;
  pressed: string | null;
};

export function drawHome(
  ctx: CanvasRenderingContext2D,
  progress: Progress,
  ui: BtnUiState = { time: 0, hover: null, pressed: null },
): void {
  cover(ctx, uiImage("bg-menu"), Palette.bg);

  const logo = uiImage("logo");
  if (logo && logo.complete) {
    const lw = 560;
    const lh = (logo.naturalHeight / logo.naturalWidth) * lw;
    const bob = Math.sin(ui.time * 1.4) * 4;
    drawImg(ctx, logo, (W - lw) / 2, 120 + bob, lw, Math.min(lh, 320), true);
  } else {
    ctx.fillStyle = Palette.white;
    ctx.font = "800 64px 'Permanent Marker', cursive";
    ctx.textAlign = "center";
    ctx.fillText("PAPER RIOT", W / 2, 260);
  }

  paperBtn(ctx, HOME_PLAY, "PLAY", {
    play: true,
    time: ui.time,
    phase: 0.2,
    hover: ui.hover === "home-play",
    pressed: ui.pressed === "home-play",
  });
  paperBtn(ctx, HOME_MAP, "WORLD MAP", {
    time: ui.time,
    phase: 1.1,
    hover: ui.hover === "home-map",
    pressed: ui.pressed === "home-map",
  });
  paperBtn(ctx, HOME_THEME, `THEME · ${THEME_LABELS[getTheme()]}`, {
    time: ui.time,
    phase: 1.55,
    hover: ui.hover === "home-theme",
    pressed: ui.pressed === "home-theme",
  });
  paperBtn(ctx, HOME_SOUND, `AUDIO · ${audioModeLabel()}`, {
    time: ui.time,
    phase: 2.0,
    hover: ui.hover === "home-sound",
    pressed: ui.pressed === "home-sound",
  });

  ctx.fillStyle = Palette.white;
  ctx.font = "600 22px 'Patrick Hand', cursive";
  ctx.textAlign = "center";
  ctx.fillText(
    `Next: Level ${Math.min(progress.unlocked, 40)}`,
    W / 2,
    980,
  );

  // Lives / gems
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  roundRect(ctx, 40, 1020, 220, 70, 8);
  ctx.fill();
  ctx.fillStyle = Palette.hot;
  ctx.font = "800 26px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`♥  ${progress.lives} FULL`, 60, 1064);

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  roundRect(ctx, 420, 1020, 260, 70, 8);
  ctx.fill();
  ctx.fillStyle = Palette.purple;
  ctx.fillText(`◆  ${progress.gems}`, 440, 1064);

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
  ui: BtnUiState = { time: 0, hover: null, pressed: null },
): void {
  cover(ctx, uiImage("bg-map"), "#1a1510");

  const zi = ZONES.findIndex((z) => z.id === zone);
  const zoneMeta = ZONES[zi]!;
  const levels = zoneLevels(zone);
  const path = zonePath(zi);

  // Zone title scrap
  ctx.save();
  ctx.shadowColor = Palette.shadow;
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = Palette.paper;
  roundRect(ctx, 160, 40 + Math.sin(ui.time * 1.3) * 2, 400, 90, 8);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = Palette.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, 160, 40 + Math.sin(ui.time * 1.3) * 2, 400, 90, 8);
  ctx.stroke();
  ctx.fillStyle = Palette.ink;
  ctx.font = "800 32px 'Permanent Marker', cursive";
  ctx.textAlign = "center";
  ctx.fillText(zoneMeta.name, W / 2, 78 + Math.sin(ui.time * 1.3) * 2);
  ctx.font = "600 20px 'Patrick Hand', cursive";
  ctx.fillText(zoneMeta.tagline, W / 2, 110 + Math.sin(ui.time * 1.3) * 2);

  paperBtn(ctx, MAP_BACK, "BACK", {
    time: ui.time,
    phase: 0.4,
    hover: ui.hover === "map-back",
    pressed: ui.pressed === "map-back",
  });

  // Zone tabs
  ZONES.forEach((z, i) => {
    const r = { x: 40 + i * 170, y: 150, w: 155, h: 48 };
    const unlockedZone = progress.unlocked > i * 10 || i === 0;
    const active = z.id === zone;
    const lift = active ? 5 + Math.sin(ui.time * 3 + i) * 1.5 : 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 8 + lift;
    ctx.shadowOffsetY = 3 + lift;
    ctx.translate(0, -lift);
    ctx.fillStyle = active ? Palette.hot : unlockedZone ? Palette.paper : "#666";
    roundRect(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = active ? Palette.white : Palette.ink;
    ctx.font = "800 16px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(z.name.split(" ")[0]!, r.x + r.w / 2, r.y + 30 - lift);
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
    const bob = unlocked ? Math.sin(ui.time * 2.2 + i * 0.7) * 3 : 0;
    ctx.save();
    ctx.shadowColor = Palette.shadow;
    ctx.shadowBlur = selected ? 16 : 10;
    ctx.shadowOffsetY = selected ? 8 : 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, selected ? 34 : 28, 0, Math.PI * 2);
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
    ctx.fillText(unlocked ? String(lv.id) : "🔒", p.x, p.y + bob);

    if (stars > 0) {
      ctx.fillStyle = Palette.lime;
      ctx.font = "18px sans-serif";
      ctx.fillText("★".repeat(stars), p.x, p.y + bob + 42);
    }
  });

  const sel = LEVELS.find((l) => l.id === selectedLevel);
  if (sel) {
    ctx.save();
    ctx.shadowColor = Palette.shadow;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = Palette.paper;
    roundRect(ctx, 80, 1020, 560, 120, 8);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = Palette.ink;
    ctx.font = "800 24px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `${sel.name}  ·  ${sel.moves} moves  ·  ${sel.shape}`,
      W / 2,
      1060,
    );
    ctx.font = "600 20px 'Patrick Hand', cursive";
    ctx.fillText(sel.brief, W / 2, 1095);
  }

  paperBtn(ctx, MAP_PLAY, "PLAY LEVEL", {
    hot: true,
    time: ui.time,
    phase: 2.4,
    hover: ui.hover === "map-play",
    pressed: ui.pressed === "map-play",
  });
}

export function hitZoneTab(x: number, y: number): ZoneId | null {
  for (let i = 0; i < ZONES.length; i++) {
    const r = { x: 40 + i * 170, y: 150, w: 155, h: 48 };
    if (hitUi(r, x, y)) return ZONES[i]!.id;
  }
  return null;
}

/** Which primary scrap button is under the pointer (for hover / press). */
export function hitButtonId(
  screen: "home" | "map" | "play",
  x: number,
  y: number,
): string | null {
  if (screen === "home") {
    if (hitUi(HOME_PLAY, x, y)) return "home-play";
    if (hitUi(HOME_MAP, x, y)) return "home-map";
    if (hitUi(HOME_THEME, x, y)) return "home-theme";
    if (hitUi(HOME_SOUND, x, y)) return "home-sound";
  } else if (screen === "map") {
    if (hitUi(MAP_BACK, x, y)) return "map-back";
    if (hitUi(MAP_PLAY, x, y)) return "map-play";
  } else {
    if (hitUi(PLAY_SOUND_BTN, x, y)) return "play-sound";
    if (hitUi(PAUSE_BTN, x, y)) return "pause";
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

  // Sound + pause buttons
  {
    const mode = getAudioMode();
    const lift = 6 + Math.sin(opts.time * 2.4 + 1) * 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 10 + lift;
    ctx.shadowOffsetY = 4 + lift * 0.5;
    ctx.translate(0, -lift);
    ctx.fillStyle = Palette.paper;
    roundRect(
      ctx,
      PLAY_SOUND_BTN.x,
      PLAY_SOUND_BTN.y,
      PLAY_SOUND_BTN.w,
      PLAY_SOUND_BTN.h,
      8,
    );
    ctx.fill();
    ctx.fillStyle = Palette.ink;
    ctx.font = "800 22px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const glyph =
      mode === "off" ? "✕" : mode === "sfx" ? "♪" : "♫";
    ctx.fillText(
      glyph,
      PLAY_SOUND_BTN.x + PLAY_SOUND_BTN.w / 2,
      PLAY_SOUND_BTN.y + PLAY_SOUND_BTN.h / 2 + 1,
    );
    ctx.restore();
  }

  {
    const lift = 6 + Math.sin(opts.time * 2.4) * 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 10 + lift;
    ctx.shadowOffsetY = 4 + lift * 0.5;
    ctx.translate(0, -lift);
    ctx.fillStyle = Palette.paper;
    roundRect(ctx, PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h, 8);
    ctx.fill();
    ctx.fillStyle = Palette.ink;
    ctx.fillRect(PAUSE_BTN.x + 20, PAUSE_BTN.y + 18, 8, 28);
    ctx.fillRect(PAUSE_BTN.x + 36, PAUSE_BTN.y + 18, 8, 28);
    ctx.restore();
  }

  // Goals
  ctx.save();
  ctx.shadowColor = Palette.shadow;
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = Palette.paper;
  roundRect(ctx, 56, 120, 608, 160, 8);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = Palette.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, 56, 120, 608, 160, 8);
  ctx.stroke();
  ctx.fillStyle = Palette.hot;
  ctx.font = "800 24px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("GOAL", 90, 155);
  ctx.fillStyle = Palette.ink;
  ctx.font = "600 18px 'Patrick Hand', cursive";
  ctx.fillText(session.level.brief, 90, 182);

  session.goals.forEach((g, i) => {
    const gx = 100 + i * 195;
    const gy = 235;
    const bob = Math.sin(opts.time * 2.4 + i * 1.3) * 3;
    if (g.type === "collect") {
      drawSticker(
        ctx,
        g.kind,
        gx,
        gy + bob,
        48,
        false,
        Math.sin(opts.time * 1.5 + i) * 0.05,
      );
    } else {
      const oimg =
        g.obstacle === "any"
          ? obstacleImage("tape-x")
          : obstacleImage(g.obstacle);
      ctx.save();
      ctx.shadowColor = Palette.shadow;
      ctx.shadowBlur = 8;
      if (oimg && oimg.complete) {
        ctx.drawImage(oimg, gx - 24, gy + bob - 24, 48, 48);
      } else {
        ctx.fillStyle = Palette.tape;
        roundRect(ctx, gx - 24, gy + bob - 24, 48, 48, 6);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.fillStyle = Palette.ink;
    ctx.font = "800 18px 'Chakra Petch', sans-serif";
    ctx.textAlign = "left";
    const tag =
      g.type === "clear"
        ? OBSTACLE_LABELS[g.obstacle]
        : "";
    ctx.fillText(
      tag ? `${tag} ${g.have}/${g.need}` : `${g.have}/${g.need}`,
      gx + 34,
      gy + 6,
    );
  });

  // Board plate art (concept notebook scrap)
  const boardH = layout.cell * ROWS + layout.gap * (ROWS - 1);
  const boardW = layout.cell * COLS + layout.gap * (COLS - 1);
  const plate = uiImage("board-plate");
  const pad = 28;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 12;
  if (plate && plate.complete && plate.naturalWidth > 0) {
    ctx.drawImage(
      plate,
      layout.x - pad,
      layout.y - pad,
      boardW + pad * 2,
      boardH + pad * 2,
    );
  } else {
    ctx.fillStyle = "rgba(247,242,230,0.95)";
    roundRect(ctx, layout.x - 12, layout.y - 12, boardW + 24, boardH + 24, 10);
    ctx.fill();
  }
  ctx.restore();

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
    // stamp handled by particle stampFx; keep a light radial ink rip
    const t = opts.popFx.t;
    ctx.save();
    ctx.translate(opts.popFx.x, opts.popFx.y);
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillStyle = `rgba(10,10,10,${0.35 * (1 - t)})`;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rad = 40 + 70 * t * (i % 2 === 0 ? 1.25 : 0.7);
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawParticles(ctx);

  const dock = powerDockFor(session.level.id);
  for (const slot of dock) {
    const armed = opts.armedPower === slot.kind;
    const charges = session.powers[slot.kind] ?? 0;
    const bob = Math.sin(opts.time * 2.8 + slot.rect.x * 0.02) * 3;
    const lift = armed ? 10 : charges > 0 ? 5 + bob : 2;
    ctx.save();
    ctx.translate(slot.rect.x + slot.rect.w / 2, slot.rect.y + slot.rect.h / 2 + 8);
    ctx.scale(1, 0.35);
    ctx.fillStyle = `rgba(0,0,0,${0.28 + lift * 0.02})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, slot.rect.w * 0.42, slot.rect.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = charges > 0 ? 1 : 0.4;
    ctx.translate(0, -lift);
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10 + lift;
    ctx.shadowOffsetY = 4 + lift * 0.4;
    ctx.fillStyle = armed ? Palette.hot : Palette.paper;
    roundRect(ctx, slot.rect.x, slot.rect.y, slot.rect.w, slot.rect.h, 8);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = Palette.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    const pimg = powerImage(slot.kind);
    const cx = slot.rect.x + slot.rect.w / 2;
    const cy = slot.rect.y + slot.rect.h / 2 - 4;
    const rot = Math.sin(opts.time * 1.6 + slot.rect.x * 0.01) * 0.08;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.shadowColor = Palette.shadow;
    ctx.shadowBlur = 8;
    if (pimg && pimg.complete) ctx.drawImage(pimg, -32, -32, 64, 64);
    ctx.restore();
    ctx.fillStyle = armed ? Palette.white : Palette.ink;
    ctx.font = "800 18px 'Chakra Petch', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      String(charges),
      slot.rect.x + slot.rect.w - 12,
      slot.rect.y + slot.rect.h - 14,
    );
    ctx.restore();
  }

  if (opts.armedPower) {
    ctx.fillStyle = Palette.lime;
    ctx.font = "700 22px 'Patrick Hand', cursive";
    ctx.textAlign = "center";
    ctx.fillText(POWER_BLURBS[opts.armedPower], W / 2, 1090);
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
