import { getPalette, getTheme } from "./theme";
import { drawCover, getThemeArt } from "./themeAssets";

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
    if (theme === "anime" || theme === "classic") {
      g.addColorStop(0, "rgba(255,255,255,0.08)");
      g.addColorStop(0.5, "rgba(0,0,0,0.04)");
      g.addColorStop(1, "rgba(0,0,0,0.18)");
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
  opts: { sfxVol?: number },
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

  drawVolumeButton(ctx, opts.sfxVol ?? 0.4);
}

export const VOL_BTN = { x: 656, y: 28, w: 42, h: 46 };

export function hitVolumeButton(x: number, y: number): boolean {
  return (
    x >= VOL_BTN.x &&
    x <= VOL_BTN.x + VOL_BTN.w &&
    y >= VOL_BTN.y &&
    y <= VOL_BTN.y + VOL_BTN.h
  );
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

/** Two bottom buttons: rotate the currently facing face CCW / CW. */
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

  const ccw: UiRect = { x: x0, y, w: btnW, h: btnH };
  const cw: UiRect = { x: x0 + btnW + gap, y, w: btnW, h: btnH };

  drawDockImage(ctx, ccw, () => dockBtnFallback(ctx, ccw));
  drawDockImage(ctx, cw, () => dockBtnFallback(ctx, cw));

  ctx.fillStyle = p.ink;
  ctx.font = "800 42px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u21BA", ccw.x + ccw.w / 2, ccw.y + ccw.h / 2 - 4);
  ctx.fillText("\u21BB", cw.x + cw.w / 2, cw.y + cw.h / 2 - 4);

  ctx.font = "700 14px 'Chakra Petch', sans-serif";
  ctx.fillStyle = p.accent;
  ctx.fillText("CCW", ccw.x + ccw.w / 2, ccw.y + ccw.h - 16);
  ctx.fillText("CW", cw.x + cw.w / 2, cw.y + cw.h - 16);

  return { ccw, cw };
}

export function drawEndOverlay(
  ctx: CanvasRenderingContext2D,
  opts: { moves: number },
): void {
  const p = getPalette();
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
  ctx.fillText("SOLVED!", 150, 530);
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
    if (fill === p.panel) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
    } else if (fill === p.accent) {
      ctx.fillStyle = "rgba(200,255,61,0.25)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
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
  ctx.fillStyle = opts?.text ?? p.ink;
  ctx.font = "800 26px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
}

export const HOME_PLAY: UiRect = { x: 150, y: 860, w: 420, h: 78 };
export const HOME_SETTINGS: UiRect = { x: 150, y: 960, w: 420, h: 70 };

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
    const maxH = 520;
    const scale = Math.min(maxW / logoImg.width, maxH / logoImg.height);
    const lw = logoImg.width * scale;
    const lh = logoImg.height * scale;
    ctx.drawImage(logoImg, (W - lw) / 2, 120, lw, lh);
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
  ctx.fillText("A sticker Rubik\u2019s Cube. No timer. Just twist.", W / 2, 680);

  ctx.fillStyle = p.panel;
  roundRect(ctx, 120, 710, 480, 120, 8);
  ctx.fill();
  ctx.fillStyle = p.accent;
  ctx.fillRect(160, 700, 70, 14);
  ctx.fillStyle = p.paper;
  ctx.font = "600 17px 'Patrick Hand', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("\u2022 Face-turn buttons spin the facing face", 150, 748);
  ctx.fillText("\u2022 Swipe a lane on the cube \u00B7 orbit to peek", 150, 778);
  ctx.fillText("\u2022 Try 2\u00D72 in settings if 3\u00D73 is rough", 150, 808);

  drawPaperButton(ctx, HOME_PLAY, "PLAY", {
    fill: p.hot,
    text: p.white,
    tape: p.accent,
  });
  drawPaperButton(ctx, HOME_SETTINGS, "SETTINGS", {
    fill: p.paper,
    text: p.ink,
    tape: p.hot,
  });
}

export const PAUSE_RESUME: UiRect = { x: 160, y: 420, w: 400, h: 72 };
export const PAUSE_SETTINGS: UiRect = { x: 160, y: 520, w: 400, h: 68 };
export const PAUSE_SCRAMBLE: UiRect = { x: 160, y: 610, w: 400, h: 68 };
export const PAUSE_HOME: UiRect = { x: 160, y: 700, w: 400, h: 68 };

export function drawPauseMenu(ctx: CanvasRenderingContext2D): void {
  const p = getPalette();
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = p.paper;
  roundRect(ctx, 100, 280, 520, 520, 10);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = p.hot;
  ctx.fillRect(140, 268, 90, 18);

  ctx.fillStyle = p.ink;
  ctx.font = "800 40px 'Permanent Marker', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MENU", W / 2, 350);

  drawPaperButton(ctx, PAUSE_RESUME, "RESUME", {
    fill: p.accent,
    text: p.ink,
  });
  drawPaperButton(ctx, PAUSE_SETTINGS, "SETTINGS", {
    fill: p.paper,
    text: p.ink,
  });
  drawPaperButton(ctx, PAUSE_SCRAMBLE, "SCRAMBLE", {
    fill: p.panel,
    text: p.accent,
  });
  drawPaperButton(ctx, PAUSE_HOME, "HOME", {
    fill: p.panel,
    text: p.hot,
  });
}

export const SETTINGS_VOL: UiRect = { x: 140, y: 400, w: 440, h: 72 };
export const SETTINGS_THEME: UiRect = { x: 140, y: 490, w: 440, h: 72 };
export const SETTINGS_SIZE: UiRect = { x: 140, y: 580, w: 440, h: 72 };
export const SETTINGS_BACK: UiRect = { x: 140, y: 690, w: 440, h: 70 };

export function drawSettingsScreen(
  ctx: CanvasRenderingContext2D,
  opts: { sfxVol: number; themeLabel: string; sizeLabel: string },
): void {
  const p = getPalette();
  drawDesk(ctx);

  ctx.fillStyle = p.paper;
  roundRect(ctx, 80, 200, 560, 620, 10);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.fillRect(120, 188, 100, 18);

  ctx.fillStyle = p.ink;
  ctx.font = "800 42px 'Permanent Marker', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SETTINGS", W / 2, 280);

  ctx.font = "600 18px 'Patrick Hand', sans-serif";
  ctx.fillStyle = p.muted;
  ctx.fillText("Sound, look, and cube size", W / 2, 330);

  const volLabel =
    opts.sfxVol <= 0.001 ? "MUTED" : opts.sfxVol < 0.55 ? "SOFT" : "NORMAL";
  drawPaperButton(ctx, SETTINGS_VOL, `SOUND  \u00B7  ${volLabel}`, {
    fill: p.panel,
    text: p.accent,
  });
  drawPaperButton(ctx, SETTINGS_THEME, `THEME  \u00B7  ${opts.themeLabel}`, {
    fill: p.panel,
    text: p.hot,
  });
  drawPaperButton(ctx, SETTINGS_SIZE, `CUBE  \u00B7  ${opts.sizeLabel}`, {
    fill: p.panel,
    text: p.accent,
  });
  drawPaperButton(ctx, SETTINGS_BACK, "BACK", {
    fill: p.hot,
    text: p.white,
  });
}
