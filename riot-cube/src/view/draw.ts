import {
  getAnimeMode,
  getPalette,
  getTheme,
  THEMES,
  type ThemeId,
} from "./theme";
import { drawCover, getThemeArt } from "./themeAssets";
import { stickerPoolForTheme, type TileKind } from "../core/stickers";
import { stickerImage } from "./stickers";

export const W = 720;
export const H = 1280;

export type UiRect = { x: number; y: number; w: number; h: number };

function hitRect(r: UiRect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function hitUiRect(r: UiRect, x: number, y: number): boolean {
  return hitRect(r, x, y);
}

export function hitRetry(x: number, y: number): boolean {
  return x >= 230 && x <= 490 && y >= 640 && y <= 694;
}

export function hitSolvedHome(x: number, y: number): boolean {
  return x >= 230 && x <= 490 && y >= 710 && y <= 764;
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

export function drawDesk(ctx: CanvasRenderingContext2D): void {
  const p = getPalette();
  const theme = getTheme();
  const art = getThemeArt(theme);
  if (art.bg && art.bg.complete && art.bg.naturalWidth > 0) {
    drawCover(ctx, art.bg, 0, 0, W, H);
    // Soft readability wash — keep anime daytime bright (heavy black looked like night).
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const lightWash =
      theme === "classroom" ||
      theme === "doodle" ||
      theme === "relic" ||
      (theme === "anime" && getAnimeMode() === "day");
    if (lightWash) {
      // Bright craft themes: paper wash so the cube stays easy to read.
      if (theme === "doodle" || theme === "relic") {
        g.addColorStop(0, "rgba(255,255,255,0.18)");
        g.addColorStop(0.45, "rgba(255,255,255,0.08)");
        g.addColorStop(1, "rgba(0,0,0,0.16)");
      } else {
        g.addColorStop(0, "rgba(255,255,255,0.08)");
        g.addColorStop(0.5, "rgba(0,0,0,0.04)");
        g.addColorStop(1, "rgba(0,0,0,0.18)");
      }
    } else {
      g.addColorStop(0, "rgba(0,0,0,0.28)");
      g.addColorStop(0.45, "rgba(0,0,0,0.12)");
      g.addColorStop(1, "rgba(0,0,0,0.45)");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.desk0);
  g.addColorStop(1, p.desk1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  opts: {
    sfxVol?: number;
    moves?: number;
    moveLimit?: number | null;
  },
): void {
  const p = getPalette();
  ctx.fillStyle = p.hudBg;
  roundRect(ctx, 36, 28, 210, 46, 5);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = p.hot;
  ctx.fillRect(46, 22, 48, 12);
  ctx.fillStyle = p.hudInk;
  ctx.font = "800 24px 'Permanent Marker', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("RIOT CUBE", 50, 58);

  if (opts.moves != null) {
    const limited = opts.moveLimit != null;
    const chip = movesChipRect(limited);
    ctx.fillStyle = p.hudBg;
    roundRect(ctx, chip.x, chip.y, chip.w, chip.h, 5);
    ctx.fill();
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = p.hudInk;
    ctx.font = "700 16px 'Chakra Petch', sans-serif";
    ctx.textAlign = "left";
    if (limited) {
      const left = Math.max(0, opts.moveLimit! - opts.moves);
      ctx.fillText(
        `${left}/${opts.moveLimit} MOVES`,
        chip.x + 12,
        chip.y + 26,
      );
    } else {
      ctx.fillText(`${opts.moves} MOVES`, chip.x + 12, chip.y + 26);
    }
  }

  if (getTheme() === "anime") {
    drawAnimeModeButton(ctx);
  }
  drawVolumeButton(ctx, opts.sfxVol ?? 0.4);
}

/** Moves chip under the title — tap to cycle the move cap. */
export function movesChipRect(limited = false): UiRect {
  return { x: 36, y: 84, w: limited ? 168 : 120, h: 40 };
}

export function hitMovesChip(x: number, y: number, limited = false): boolean {
  return hitRect(movesChipRect(limited), x, y);
}

export const ANIME_MODE_BTN: UiRect = { x: 270, y: 28, w: 120, h: 46 };

export function hitAnimeModeButton(x: number, y: number): boolean {
  if (getTheme() !== "anime") return false;
  return hitRect(ANIME_MODE_BTN, x, y);
}

function drawAnimeModeButton(ctx: CanvasRenderingContext2D): void {
  const p = getPalette();
  const { x, y, w, h } = ANIME_MODE_BTN;
  const dark = getAnimeMode() === "dark";
  ctx.fillStyle = dark ? p.panel : p.hudBg;
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = dark ? p.accent : p.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = dark ? p.hot : p.accent;
  ctx.fillRect(x + 10, y - 6, 36, 10);
  ctx.fillStyle = dark ? p.accent : p.hudInk;
  ctx.font = "800 16px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(dark ? "DARK" : "DAY", x + w / 2, y + h / 2 + 1);
}

export const VOL_BTN: UiRect = { x: 648, y: 20, w: 56, h: 58 };

export function hitVolumeButton(x: number, y: number): boolean {
  return hitRect(VOL_BTN, x, y);
}

function drawVolumeButton(ctx: CanvasRenderingContext2D, vol: number): void {
  const p = getPalette();
  const { x, y, w, h } = VOL_BTN;
  ctx.fillStyle = p.hudBg;
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.stroke();

  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.fillStyle = p.hudInk;
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy - 5);
  ctx.lineTo(cx - 3, cy - 5);
  ctx.lineTo(cx + 3, cy - 10);
  ctx.lineTo(cx + 3, cy + 10);
  ctx.lineTo(cx - 3, cy + 5);
  ctx.lineTo(cx - 9, cy + 5);
  ctx.closePath();
  ctx.fill();

  if (vol <= 0.001) {
    ctx.strokeStyle = p.hot;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 7);
    ctx.lineTo(cx + 13, cy + 7);
    ctx.moveTo(cx + 13, cy - 7);
    ctx.lineTo(cx + 6, cy + 7);
    ctx.stroke();
  } else {
    ctx.strokeStyle = p.hudInk;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + 3, cy, 6, -0.6, 0.6);
    ctx.stroke();
    if (vol > 0.5) {
      ctx.beginPath();
      ctx.arc(cx + 3, cy, 10, -0.7, 0.7);
      ctx.stroke();
    }
  }
}

export type FaceTurnButtons = {
  ccw: UiRect;
  cw: UiRect;
};

function drawDockImage(
  ctx: CanvasRenderingContext2D,
  r: UiRect,
  fallback: () => void,
): void {
  const art = getThemeArt(getTheme());
  const btn = art.btn;
  if (btn && btn.complete && btn.naturalWidth > 0) {
    ctx.save();
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.clip();
    drawCover(ctx, btn, r.x, r.y, r.w, r.h);
    ctx.restore();
    const p = getPalette();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 3;
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.stroke();
    return;
  }
  fallback();
}

function dockBtnFallback(ctx: CanvasRenderingContext2D, r: UiRect): void {
  const p = getPalette();
  ctx.fillStyle = p.ink;
  roundRect(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  ctx.stroke();
}

/** Two bottom buttons: rotate the currently facing face CW / CCW. */
export function drawFaceTurnButtons(ctx: CanvasRenderingContext2D): FaceTurnButtons {
  const p = getPalette();
  const btnW = 148;
  const btnH = 96;
  const gap = 28;
  const edge = 28;
  const y = H - edge - btnH;
  const totalW = btnW * 2 + gap;
  const x0 = (W - totalW) / 2;

  const panelPad = 16;
  ctx.fillStyle = p.panel;
  roundRect(
    ctx,
    x0 - panelPad,
    y - panelPad,
    totalW + panelPad * 2,
    btnH + panelPad * 2,
    10,
  );
  ctx.fill();
  ctx.fillStyle = p.accent;
  ctx.fillRect(x0 - panelPad + 16, y - panelPad - 8, 48, 12);

  const cw: UiRect = { x: x0, y, w: btnW, h: btnH };
  const ccw: UiRect = { x: x0 + btnW + gap, y, w: btnW, h: btnH };

  drawDockImage(ctx, cw, () => dockBtnFallback(ctx, cw));
  drawDockImage(ctx, ccw, () => dockBtnFallback(ctx, ccw));

  ctx.font = "800 42px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const strokeLabel = (
    text: string,
    x: number,
    y: number,
    fill: string,
    strokeW = 3,
  ) => {
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineJoin = "round";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  };
  strokeLabel("\u21BB", cw.x + cw.w / 2, cw.y + cw.h / 2 - 4, p.ink);
  strokeLabel("\u21BA", ccw.x + ccw.w / 2, ccw.y + ccw.h / 2 - 4, p.ink);

  ctx.font = "700 14px 'Chakra Petch', sans-serif";
  strokeLabel("CW", cw.x + cw.w / 2, cw.y + cw.h - 16, p.ink, 2.5);
  strokeLabel("CCW", ccw.x + ccw.w / 2, ccw.y + ccw.h - 16, p.ink, 2.5);

  return { ccw, cw };
}

export function drawEndOverlay(
  ctx: CanvasRenderingContext2D,
  opts: { moves: number; outcome?: "solved" | "lost" },
): void {
  const p = getPalette();
  const lost = opts.outcome === "lost";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = p.paper;
  roundRect(ctx, 120, 460, 480, 340, 8);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = p.ink;
  ctx.font = "800 40px 'Permanent Marker', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(lost ? "OUT OF MOVES" : "SOLVED!", 150, 530);
  ctx.font = "700 20px 'Chakra Petch', sans-serif";
  ctx.fillText(`${opts.moves} moves`, 150, 575);

  ctx.fillStyle = p.hot;
  roundRect(ctx, 230, 640, 260, 54, 7);
  ctx.fill();
  ctx.fillStyle = p.white;
  ctx.font = "800 22px 'Chakra Petch', sans-serif";
  ctx.fillText("SCRAMBLE", 288, 676);

  ctx.fillStyle = p.panel;
  roundRect(ctx, 230, 710, 260, 54, 7);
  ctx.fill();
  ctx.fillStyle = p.accent;
  ctx.fillText("HOME", 318, 746);
}

export const MENU_BTN: UiRect = { x: 572, y: 28, w: 72, h: 46 };

export function drawMenuButton(ctx: CanvasRenderingContext2D): void {
  const p = getPalette();
  const { x, y, w, h } = MENU_BTN;
  ctx.fillStyle = p.panel;
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.font = "800 14px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("MENU", x + w / 2, y + h / 2 + 1);
}

function drawPaperButton(
  ctx: CanvasRenderingContext2D,
  r: UiRect,
  label: string,
  opts?: { fill?: string; text?: string; tape?: string },
): void {
  const p = getPalette();
  const art = getThemeArt(getTheme());
  const btn = art.btn;
  const fill = opts?.fill ?? p.paper;
  const useTex =
    btn &&
    btn.complete &&
    btn.naturalWidth > 0 &&
    fill !== p.hot;

  if (useTex) {
    ctx.save();
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.clip();
    drawCover(ctx, btn!, r.x, r.y, r.w, r.h);
    // Light wash so ink labels stay readable on any button texture.
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  } else {
    ctx.fillStyle = fill;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.stroke();
  if (opts?.tape) {
    ctx.fillStyle = opts.tape;
    ctx.fillRect(r.x + 18, r.y - 8, 56, 14);
  }
  ctx.fillStyle = useTex ? p.ink : (opts?.text ?? p.ink);
  ctx.font = "800 26px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
}

export const HOME_PLAY: UiRect = { x: 150, y: 820, w: 420, h: 72 };
export const HOME_HOW: UiRect = { x: 150, y: 910, w: 420, h: 64 };
export const HOME_SETTINGS: UiRect = { x: 150, y: 990, w: 420, h: 64 };

let logoImg: HTMLImageElement | null = null;
let logoReady = false;

export function loadLogo(): Promise<void> {
  if (logoReady) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      logoImg = img;
      logoReady = true;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = "./logo-riot-cube.png?v=4";
  });
}

export function drawHomeScreen(ctx: CanvasRenderingContext2D): void {
  const p = getPalette();
  drawDesk(ctx);

  if (logoImg && logoReady) {
    const maxW = 520;
    const maxH = 480;
    const scale = Math.min(maxW / logoImg.width, maxH / logoImg.height);
    const lw = logoImg.width * scale;
    const lh = logoImg.height * scale;
    ctx.drawImage(logoImg, (W - lw) / 2, 100, lw, lh);
  } else {
    ctx.fillStyle = p.paper;
    roundRect(ctx, 70, 220, 580, 160, 8);
    ctx.fill();
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = p.ink;
    ctx.font = "800 64px 'Permanent Marker', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RIOT CUBE", W / 2, 310);
  }

  ctx.fillStyle = p.accent;
  ctx.font = "600 20px 'Patrick Hand', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("A sticker Rubik\u2019s Cube. No timer. Just twist.", W / 2, 760);

  drawPaperButton(ctx, HOME_PLAY, "PLAY", {
    fill: p.hot,
    text: p.white,
    tape: p.accent,
  });
  drawPaperButton(ctx, HOME_HOW, "HOW TO PLAY", {
    fill: p.paper,
    text: p.ink,
    tape: p.accent,
  });
  drawPaperButton(ctx, HOME_SETTINGS, "SETTINGS", {
    fill: p.paper,
    text: p.ink,
    tape: p.hot,
  });
}

export const PAUSE_RESUME: UiRect = { x: 160, y: 340, w: 400, h: 64 };
export const PAUSE_THEMES: UiRect = { x: 160, y: 420, w: 400, h: 60 };
export const PAUSE_HOW: UiRect = { x: 160, y: 496, w: 400, h: 60 };
export const PAUSE_SETTINGS: UiRect = { x: 160, y: 572, w: 400, h: 60 };
export const PAUSE_HOME: UiRect = { x: 160, y: 648, w: 400, h: 60 };

export function drawPauseMenu(ctx: CanvasRenderingContext2D): void {
  const p = getPalette();
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = p.paper;
  roundRect(ctx, 100, 220, 520, 560, 10);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = p.hot;
  ctx.fillRect(140, 208, 90, 18);

  ctx.fillStyle = p.ink;
  ctx.font = "800 40px 'Permanent Marker', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MENU", W / 2, 290);

  drawPaperButton(ctx, PAUSE_RESUME, "RESUME", {
    fill: p.accent,
    text: p.ink,
  });
  drawPaperButton(ctx, PAUSE_THEMES, "THEMES", {
    fill: p.paper,
    text: p.ink,
    tape: p.hot,
  });
  drawPaperButton(ctx, PAUSE_HOW, "HOW TO PLAY", {
    fill: p.paper,
    text: p.ink,
    tape: p.accent,
  });
  drawPaperButton(ctx, PAUSE_SETTINGS, "SETTINGS", {
    fill: p.paper,
    text: p.ink,
  });
  drawPaperButton(ctx, PAUSE_HOME, "HOME", {
    fill: p.panel,
    text: p.hot,
  });
}

export const SETTINGS_VOL: UiRect = { x: 140, y: 300, w: 440, h: 54 };
export const SETTINGS_MUSIC: UiRect = { x: 140, y: 368, w: 440, h: 54 };
export const SETTINGS_THEME: UiRect = { x: 140, y: 436, w: 440, h: 54 };
export const SETTINGS_SIZE: UiRect = { x: 140, y: 504, w: 440, h: 54 };
export const SETTINGS_MOVES: UiRect = { x: 140, y: 572, w: 440, h: 54 };
export const SETTINGS_HINTS: UiRect = { x: 140, y: 640, w: 440, h: 54 };
export const SETTINGS_BACK: UiRect = { x: 140, y: 728, w: 440, h: 54 };

export function drawSettingsScreen(
  ctx: CanvasRenderingContext2D,
  opts: {
    sfxVol: number;
    musicVol: number;
    themeLabel: string;
    sizeLabel: string;
    moveLimitLabel: string;
    hintsOn: boolean;
  },
): void {
  const p = getPalette();
  drawDesk(ctx);

  ctx.fillStyle = p.paper;
  roundRect(ctx, 80, 130, 560, 700, 10);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.fillRect(120, 118, 100, 18);

  ctx.fillStyle = p.ink;
  ctx.font = "800 42px 'Permanent Marker', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SETTINGS", W / 2, 210);

  ctx.font = "600 18px 'Patrick Hand', sans-serif";
  ctx.fillStyle = p.muted;
  ctx.fillText("Sound, look, cube, move cap, hints", W / 2, 255);

  const volLabel =
    opts.sfxVol <= 0.001 ? "MUTED" : opts.sfxVol < 0.55 ? "SOFT" : "NORMAL";
  const musicLabel =
    opts.musicVol <= 0.001
      ? "MUTED"
      : opts.musicVol < 0.5
        ? "SOFT"
        : "NORMAL";
  drawPaperButton(ctx, SETTINGS_VOL, `SFX  \u00B7  ${volLabel}`, {
    fill: p.panel,
    text: p.accent,
  });
  drawPaperButton(ctx, SETTINGS_MUSIC, `MUSIC  \u00B7  ${musicLabel}`, {
    fill: p.panel,
    text: p.accent,
  });
  drawPaperButton(ctx, SETTINGS_THEME, `THEMES  \u00B7  ${opts.themeLabel}`, {
    fill: p.panel,
    text: p.hot,
  });
  drawPaperButton(ctx, SETTINGS_SIZE, `CUBE  \u00B7  ${opts.sizeLabel}`, {
    fill: p.panel,
    text: p.accent,
  });
  drawPaperButton(ctx, SETTINGS_MOVES, `MOVES  \u00B7  ${opts.moveLimitLabel}`, {
    fill: p.panel,
    text: p.accent,
  });
  drawPaperButton(
    ctx,
    SETTINGS_HINTS,
    `HINTS  \u00B7  ${opts.hintsOn ? "ON" : "OFF"}`,
    {
      fill: p.panel,
      text: opts.hintsOn ? p.accent : p.muted,
    },
  );
  drawPaperButton(ctx, SETTINGS_BACK, "BACK", {
    fill: p.hot,
    text: p.white,
  });
}

/** Theme picker — one row per pack, anime gets a DAY/DARK toggle. */
export const THEMES_BACK: UiRect = { x: 140, y: 1140, w: 440, h: 56 };
export const THEMES_ANIME_MODE: UiRect = { x: 140, y: 1040, w: 440, h: 56 };

export function themePickerRect(index: number): UiRect {
  return { x: 140, y: 270 + index * 78, w: 440, h: 68 };
}

export function hitThemePicker(x: number, y: number): ThemeId | null {
  for (let i = 0; i < THEMES.length; i++) {
    if (hitRect(themePickerRect(i), x, y)) return THEMES[i]!.id;
  }
  return null;
}

export function drawThemesScreen(
  ctx: CanvasRenderingContext2D,
  opts: {
    selected: ThemeId;
    animeMode: "day" | "dark";
    backLabel?: string;
    subtitle?: string;
  },
): void {
  const p = getPalette();
  drawDesk(ctx);

  ctx.fillStyle = p.paper;
  roundRect(ctx, 80, 120, 560, 1100, 10);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = p.hot;
  ctx.fillRect(120, 108, 100, 18);

  ctx.fillStyle = p.ink;
  ctx.font = "800 40px 'Permanent Marker', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("THEMES", W / 2, 200);
  ctx.font = "600 18px 'Patrick Hand', sans-serif";
  ctx.fillStyle = p.muted;
  ctx.fillText(
    opts.subtitle ?? "Pick a sticker pack \u00B7 music follows the vibe",
    W / 2,
    245,
  );

  for (let i = 0; i < THEMES.length; i++) {
    const def = THEMES[i]!;
    const r = themePickerRect(i);
    const on = def.id === opts.selected;
    const art = getThemeArt(def.id);
    drawPaperButton(ctx, r, "", {
      fill: on ? p.accent : p.panel,
      text: p.ink,
      tape: on ? p.hot : undefined,
    });
    if (art.bg && art.bg.complete && art.bg.naturalWidth > 0) {
      ctx.save();
      roundRect(ctx, r.x + 12, r.y + 12, 52, 52, 6);
      ctx.clip();
      drawCover(ctx, art.bg, r.x + 12, r.y + 12, 52, 52);
      ctx.restore();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2;
      roundRect(ctx, r.x + 12, r.y + 12, 52, 52, 6);
      ctx.stroke();
    }
    ctx.fillStyle = on ? p.ink : p.accent;
    ctx.font = "800 26px 'Chakra Petch', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(def.label, r.x + 80, r.y + r.h / 2);
    if (on) {
      ctx.fillStyle = p.hot;
      ctx.font = "700 14px 'Patrick Hand', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("ON", r.x + r.w - 18, r.y + r.h / 2);
    }
  }

  if (opts.selected === "anime") {
    drawPaperButton(
      ctx,
      THEMES_ANIME_MODE,
      `ANIME MODE  \u00B7  ${opts.animeMode === "day" ? "DAY" : "DARK"}`,
      {
        fill: p.paper,
        text: p.ink,
        tape: p.accent,
      },
    );
  }

  drawPaperButton(ctx, THEMES_BACK, opts.backLabel ?? "BACK", {
    fill: p.hot,
    text: p.white,
  });
}

export const HELP_PAGES = [
  {
    title: "GOAL",
    lines: [
      "Each face of the cube wants one sticker kind.",
      "Twist until every face is a matching set.",
      "No timer. Your progress is saved automatically.",
    ],
  },
  {
    title: "TWIST",
    lines: [
      "Swipe a row or column on the front face.",
      "Drag freely — longer swipes move more cells.",
      "CW / CCW buttons spin the whole facing face.",
    ],
  },
  {
    title: "ORBIT",
    lines: [
      "Tap the arrows around the cube to peek.",
      "Or drag in the empty space beside the cube.",
      "Turn the cube to work on another face.",
    ],
  },
  {
    title: "TOOLS",
    lines: [
      "STICKERS — pick six face designs (saved per theme).",
      "SCRAMBLE — shuffle for a fresh puzzle (icons stay).",
      "MOVES — optional move cap in Settings (or tap the chip).",
      "HINT — draw a suggested move (Settings).",
    ],
  },
] as const;

export const HELP_PREV: UiRect = { x: 140, y: 980, w: 200, h: 58 };
export const HELP_NEXT: UiRect = { x: 380, y: 980, w: 200, h: 58 };
export const HELP_BACK: UiRect = { x: 140, y: 1060, w: 440, h: 58 };

/** Coach card during the interactive tutorial (top of play view). */
export const TUTORIAL_NEXT: UiRect = { x: 420, y: 248, w: 200, h: 50 };
export const TUTORIAL_SKIP: UiRect = { x: 100, y: 248, w: 200, h: 50 };

export function drawTutorialCoach(
  ctx: CanvasRenderingContext2D,
  opts: {
    step: number;
    total: number;
    title: string;
    lines: readonly string[];
    hint: string;
    showNext: boolean;
    showSkip: boolean;
    nextLabel?: string;
  },
): void {
  const p = getPalette();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, 48, 78, 624, 240, 10);
  ctx.fill();
  ctx.fillStyle = p.paper;
  roundRect(ctx, 56, 86, 608, 224, 8);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = p.hot;
  ctx.fillRect(72, 78, 72, 12);

  ctx.fillStyle = p.ink;
  ctx.font = "800 26px 'Permanent Marker', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(opts.title, 80, 128);
  ctx.fillStyle = p.muted;
  ctx.font = "600 16px 'Patrick Hand', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${opts.step + 1} / ${opts.total}`, 640, 128);

  ctx.textAlign = "left";
  ctx.fillStyle = p.ink;
  ctx.font = "600 18px 'Patrick Hand', sans-serif";
  let y = 158;
  for (const line of opts.lines) {
    ctx.fillText(line, 80, y);
    y += 26;
  }

  ctx.fillStyle = p.accent;
  ctx.font = "700 16px 'Chakra Petch', sans-serif";
  ctx.fillText(opts.hint, 80, 248);

  if (opts.showSkip) {
    drawPaperButton(ctx, TUTORIAL_SKIP, "SKIP", {
      fill: p.panel,
      text: p.muted,
    });
  }
  if (opts.showNext) {
    drawPaperButton(ctx, TUTORIAL_NEXT, opts.nextLabel ?? "NEXT", {
      fill: p.accent,
      text: p.ink,
    });
  }
}

export function drawHelpScreen(
  ctx: CanvasRenderingContext2D,
  opts: { page: number; hideBack?: boolean },
): void {
  const p = getPalette();
  drawDesk(ctx);
  const page = Math.max(0, Math.min(HELP_PAGES.length - 1, opts.page));
  const content = HELP_PAGES[page]!;

  ctx.fillStyle = p.paper;
  roundRect(ctx, 80, 160, 560, 1000, 10);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.fillRect(120, 148, 120, 18);

  ctx.fillStyle = p.ink;
  ctx.font = "800 40px 'Permanent Marker', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("HOW TO PLAY", W / 2, 250);

  ctx.fillStyle = p.hot;
  ctx.fillRect(160, 300, 80, 14);
  ctx.fillStyle = p.ink;
  ctx.font = "800 36px 'Permanent Marker', sans-serif";
  ctx.fillText(content.title, W / 2, 370);

  ctx.font = "600 22px 'Patrick Hand', sans-serif";
  ctx.fillStyle = p.ink;
  ctx.textAlign = "left";
  let y = 450;
  for (const line of content.lines) {
    const words = line.split(" ");
    let row = "";
    for (const w of words) {
      const next = row ? `${row} ${w}` : w;
      if (ctx.measureText(next).width > 460) {
        ctx.fillText(row, 140, y);
        y += 36;
        row = w;
      } else {
        row = next;
      }
    }
    if (row) {
      ctx.fillText(row, 140, y);
      y += 48;
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = p.muted;
  ctx.font = "600 18px 'Patrick Hand', sans-serif";
  ctx.fillText(`${page + 1} / ${HELP_PAGES.length}`, W / 2, 920);

  drawPaperButton(ctx, HELP_PREV, "PREV", {
    fill: page <= 0 ? p.paperDeep : p.panel,
    text: page <= 0 ? p.muted : p.accent,
  });
  drawPaperButton(ctx, HELP_NEXT, page >= HELP_PAGES.length - 1 ? "DONE" : "NEXT", {
    fill: p.accent,
    text: p.ink,
  });
  if (!opts.hideBack) {
    drawPaperButton(ctx, HELP_BACK, "BACK", {
      fill: p.hot,
      text: p.white,
    });
  }
}

/** Mid play row — HINT / SCRAMBLE / STICKERS above the face-turn dock. */
export const PLAY_HINT: UiRect = { x: 36, y: 1038, w: 200, h: 50 };
export const PLAY_SCRAMBLE: UiRect = { x: 260, y: 1038, w: 200, h: 50 };
export const PLAY_STICKERS: UiRect = { x: 484, y: 1038, w: 200, h: 50 };
/** Layout used when HINT is hidden (tutorial / hints off). */
export const PLAY_SCRAMBLE_WIDE: UiRect = { x: 100, y: 1038, w: 240, h: 50 };
export const PLAY_STICKERS_WIDE: UiRect = { x: 380, y: 1038, w: 240, h: 50 };

export function drawPlayActions(
  ctx: CanvasRenderingContext2D,
  opts: { hintsOn: boolean },
): void {
  const p = getPalette();
  if (opts.hintsOn) {
    drawPaperButton(ctx, PLAY_HINT, "HINT", {
      fill: p.paper,
      text: p.ink,
      tape: p.accent,
    });
    drawPaperButton(ctx, PLAY_SCRAMBLE, "SCRAMBLE", {
      fill: p.panel,
      text: p.accent,
    });
    drawPaperButton(ctx, PLAY_STICKERS, "STICKERS", {
      fill: p.paper,
      text: p.ink,
      tape: p.hot,
    });
    return;
  }
  drawPaperButton(ctx, PLAY_SCRAMBLE_WIDE, "SCRAMBLE", {
    fill: p.panel,
    text: p.accent,
  });
  drawPaperButton(ctx, PLAY_STICKERS_WIDE, "STICKERS", {
    fill: p.paper,
    text: p.ink,
    tape: p.hot,
  });
}

export function hitPlayScramble(x: number, y: number, hintsOn: boolean): boolean {
  if (hintsOn) return hitRect(PLAY_SCRAMBLE, x, y);
  return hitRect(PLAY_SCRAMBLE_WIDE, x, y);
}

export function hitPlayStickers(x: number, y: number, hintsOn: boolean): boolean {
  if (hintsOn) return hitRect(PLAY_STICKERS, x, y);
  return hitRect(PLAY_STICKERS_WIDE, x, y);
}

export function hitPlayHint(x: number, y: number, hintsOn: boolean): boolean {
  if (!hintsOn) return false;
  return hitRect(PLAY_HINT, x, y);
}

/**
 * Soft orbit gesture band between the cube and the HINT/SCRAMBLE row.
 * Drag here to spin the cube; a translucent circle follows the finger.
 */
export const ORBIT_BAND: UiRect = { x: 48, y: 880, w: 624, h: 140 };

export function hitOrbitBand(x: number, y: number): boolean {
  return hitRect(ORBIT_BAND, x, y);
}

/** Finger-follow ring while orbiting (no opaque pad). */
export function drawOrbitFinger(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 36, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fill();
  ctx.restore();
}

const SLOT_LABELS = ["F", "B", "R", "L", "U", "D"] as const;

export const STICKERS_BACK: UiRect = { x: 40, y: 1168, w: 200, h: 56 };
export const STICKERS_RANDOM: UiRect = { x: 260, y: 1168, w: 200, h: 56 };
export const STICKERS_APPLY: UiRect = { x: 480, y: 1168, w: 200, h: 56 };

export const STICKERS_GRID: UiRect = { x: 40, y: 360, w: 640, h: 780 };

/** Kinds still free to pick (hides ones already in other slots). */
export function availableStickerKinds(
  draft: readonly (TileKind | null)[],
  slot: number,
): TileKind[] {
  const taken = new Set<TileKind>();
  for (let i = 0; i < draft.length; i++) {
    const k = draft[i];
    if (k && i !== slot) taken.add(k);
  }
  const theme = getTheme();
  const pool = stickerPoolForTheme(
    theme,
    theme === "anime" ? getAnimeMode() : "day",
  );
  return pool.filter((k) => !taken.has(k));
}

export function drawStickersScreen(
  ctx: CanvasRenderingContext2D,
  opts: {
    draft: readonly (TileKind | null)[];
    slot: number;
    scroll: number;
    /** Extra line under the title (e.g. theme rematch). */
    banner?: string;
    hideBack?: boolean;
  },
): void {
  const p = getPalette();
  drawDesk(ctx);

  ctx.fillStyle = p.paper;
  roundRect(ctx, 24, 40, 672, 1220, 10);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = p.hot;
  ctx.fillRect(48, 28, 90, 16);

  ctx.fillStyle = p.ink;
  ctx.font = "800 34px 'Permanent Marker', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CHOOSE STICKERS", W / 2, 95);
  ctx.font = "600 16px 'Patrick Hand', sans-serif";
  ctx.fillStyle = p.muted;
  ctx.fillText(
    opts.banner ?? "Pick 6 different stickers for the faces",
    W / 2,
    128,
  );

  const slotW = 88;
  const slotGap = 12;
  const slotsW = 6 * slotW + 5 * slotGap;
  const sx0 = (W - slotsW) / 2;
  for (let i = 0; i < 6; i++) {
    const sx = sx0 + i * (slotW + slotGap);
    const sy = 160;
    const selected = opts.slot === i;
    ctx.fillStyle = selected ? p.accent : p.panel;
    roundRect(ctx, sx, sy, slotW, slotW + 22, 8);
    ctx.fill();
    ctx.strokeStyle = selected ? p.ink : p.panelEdge;
    ctx.lineWidth = selected ? 3 : 2;
    ctx.stroke();

    const kind = opts.draft[i];
    const img = kind ? stickerImage(kind) : null;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, sx + 8, sy + 8, slotW - 16, slotW - 16);
    } else {
      ctx.fillStyle = selected ? p.ink : p.muted;
      ctx.font = "700 14px 'Chakra Petch', sans-serif";
      ctx.fillText(kind ? kind.slice(0, 4).toUpperCase() : "?", sx + slotW / 2, sy + slotW / 2 + 4);
    }
    ctx.fillStyle = selected ? p.ink : p.accent;
    ctx.font = "800 14px 'Chakra Petch', sans-serif";
    ctx.fillText(SLOT_LABELS[i]!, sx + slotW / 2, sy + slotW + 14);
  }

  // Grid clip — only unused stickers (plus current slot’s kind so you can keep it).
  const g = STICKERS_GRID;
  const pool = availableStickerKinds(opts.draft, opts.slot);
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, g.x, g.y, g.w, g.h, 8);
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(g.x, g.y, g.w, g.h);

  const cols = 4;
  const cell = 140;
  const gap = 16;
  const pad = 20;
  for (let i = 0; i < pool.length; i++) {
    const kind = pool[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = g.x + pad + col * (cell + gap);
    const cy = g.y + pad + row * (cell + gap) - opts.scroll;
    if (cy + cell < g.y || cy > g.y + g.h) continue;

    const current = opts.draft[opts.slot] === kind;
    ctx.fillStyle = current ? p.accent : p.paperDeep;
    roundRect(ctx, cx, cy, cell, cell, 8);
    ctx.fill();
    ctx.strokeStyle = current ? p.ink : p.ink;
    ctx.lineWidth = current ? 3 : 2;
    ctx.stroke();

    const img = stickerImage(kind);
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, cx + 18, cy + 10, cell - 36, cell - 36);
    }
    ctx.fillStyle = p.ink;
    ctx.font = "700 12px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(kind.toUpperCase(), cx + cell / 2, cy + cell - 12);
  }
  ctx.restore();

  const filled = opts.draft.filter(Boolean).length;
  const ready = filled === 6 && new Set(opts.draft).size === 6;
  if (!opts.hideBack) {
    drawPaperButton(ctx, STICKERS_BACK, "BACK", {
      fill: p.panel,
      text: p.accent,
    });
  }
  drawPaperButton(ctx, STICKERS_RANDOM, "RANDOM", {
    fill: p.paper,
    text: p.ink,
  });
  drawPaperButton(ctx, STICKERS_APPLY, ready ? "APPLY" : `${filled}/6`, {
    fill: ready ? p.hot : p.panel,
    text: ready ? p.white : p.muted,
  });
}

export function stickersGridContentHeight(
  draft: readonly (TileKind | null)[],
  slot: number,
): number {
  const cols = 4;
  const cell = 140;
  const gap = 16;
  const pad = 20;
  const count = availableStickerKinds(draft, slot).length;
  const rows = Math.max(1, Math.ceil(count / cols));
  return pad * 2 + rows * cell + (rows - 1) * gap;
}

export function hitStickersSlot(x: number, y: number): number | null {
  const slotW = 88;
  const slotGap = 12;
  const slotsW = 6 * slotW + 5 * slotGap;
  const sx0 = (W - slotsW) / 2;
  const sy = 160;
  for (let i = 0; i < 6; i++) {
    const sx = sx0 + i * (slotW + slotGap);
    if (x >= sx && x <= sx + slotW && y >= sy && y <= sy + slotW + 22) return i;
  }
  return null;
}

export function hitStickersGridKind(
  x: number,
  y: number,
  scroll: number,
  draft: readonly (TileKind | null)[],
  slot: number,
): TileKind | null {
  const g = STICKERS_GRID;
  if (!hitRect(g, x, y)) return null;
  const pool = availableStickerKinds(draft, slot);
  const cols = 4;
  const cell = 140;
  const gap = 16;
  const pad = 20;
  const lx = x - g.x - pad;
  const ly = y - g.y - pad + scroll;
  if (lx < 0 || ly < 0) return null;
  const col = Math.floor(lx / (cell + gap));
  const row = Math.floor(ly / (cell + gap));
  if (col < 0 || col >= cols) return null;
  const inCellX = lx - col * (cell + gap);
  const inCellY = ly - row * (cell + gap);
  if (inCellX > cell || inCellY > cell) return null;
  const i = row * cols + col;
  if (i < 0 || i >= pool.length) return null;
  return pool[i]!;
}

