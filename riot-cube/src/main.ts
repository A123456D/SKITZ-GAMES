import {
  applyFaceTurn,
  cycleCubeSize,
  doScramble,
  loadCubeSize,
  saveCubeSize,
  setActiveFace,
  sizeLabel,
  startSession,
  type FaceId,
  type Session,
} from "./core/session";
import type { TurnDir } from "./core/rubik";
import {
  W,
  H,
  drawDesk,
  drawEndOverlay,
  drawHomeScreen,
  drawHud,
  drawMenuButton,
  drawPauseMenu,
  drawPlayDock,
  drawSettingsScreen,
  hitRetry,
  hitSolvedHome,
  hitUiRect,
  hitVolumeButton,
  loadLogo,
  HOME_PLAY,
  HOME_SETTINGS,
  MENU_BTN,
  PAUSE_HOME,
  PAUSE_RESUME,
  PAUSE_SCRAMBLE,
  PAUSE_SETTINGS,
  SETTINGS_BACK,
  SETTINGS_SIZE,
  SETTINGS_THEME,
  SETTINGS_VOL,
  type PlayDock,
} from "./view/draw";
import {
  drawCube3D,
  drawCubeOrbitButtons,
  faceTowardScreenDir,
  facingFace,
  FACE_NAMES,
  hitOrbitButton,
  type CubeLayout,
} from "./view/cube3d";
import { applyOrbitDrag, orbitStepDelta, ORBIT_DRAG_SENS, SNAP_Q } from "./view/orbit";
import {
  cycleSfxVolume,
  getSfxVolume,
  sfxPaperRustle,
  sfxPaperSlide,
  unlockAudio,
} from "./audio/paper";
import { loadUiButtons } from "./view/uiButtons";
import { loadStickers } from "./view/stickers";
import { detectQuality, getQuality } from "./view/quality";
import {
  applyThemeChrome,
  cycleTheme,
  getThemeLabel,
} from "./view/theme";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

type Screen = "home" | "play" | "menu" | "settings";
let screen: Screen = "home";
let settingsFrom: Screen = "home";

let session: Session = startSession(loadCubeSize());
let playDock: PlayDock | null = null;
/** 1 = CW, -1 = CCW for dock turns. */
let turnDir: TurnDir = 1;
/** Double-tap select within this window toggles CW/CCW. */
let lastSelectTap = 0;

const DEFAULT_ROT_X = 0.35;
const DEFAULT_ROT_Y = -0.55;
let rotX = DEFAULT_ROT_X;
let rotY = DEFAULT_ROT_Y;
let targetRotX = DEFAULT_ROT_X;
let targetRotY = DEFAULT_ROT_Y;
let rotating = false;

let orbitDrag: {
  x0: number;
  y0: number;
  rotX0: number;
  rotY0: number;
} | null = null;

let orbitBtns: ReturnType<typeof drawCubeOrbitButtons> | null = null;

function cubeLayout(): CubeLayout {
  return {
    cx: W / 2,
    cy: 560,
    scale: session.size <= 2 ? 230 : 215,
    rotX,
    rotY,
  };
}

function resize(): void {
  detectQuality();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, getQuality().dprCap);
  const scale = Math.min(vw / W, vh / H);
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function canvasPoint(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

function syncActiveFace(): void {
  const face = facingFace(rotX, rotY) as FaceId;
  if (face !== session.face) {
    session = setActiveFace(session, face);
  }
}

function doTurn(face: FaceId): void {
  session = applyFaceTurn(session, face, turnDir);
  sfxPaperSlide();
}

function paint(): void {
  drawDesk(ctx);

  if (screen === "home") {
    drawHomeScreen(ctx);
    return;
  }
  if (screen === "settings") {
    drawSettingsScreen(ctx, {
      sfxVol: getSfxVolume(),
      themeLabel: getThemeLabel(),
      sizeLabel: sizeLabel(session.size),
    });
    return;
  }

  syncActiveFace();
  const layout = cubeLayout();

  drawHud(ctx, {
    sizeLabel: sizeLabel(session.size),
    moves: session.moveCount,
    faceName: FACE_NAMES[session.face]!,
    sfxVol: getSfxVolume(),
  });
  drawMenuButton(ctx);

  drawCube3D(ctx, layout, session.cube, { activeFace: session.face });
  orbitBtns = drawCubeOrbitButtons(ctx, layout.cx, layout.cy, layout.scale, W, H);

  playDock = drawPlayDock(ctx, { turnDir });

  if (session.status === "solved") {
    drawEndOverlay(ctx, { moves: session.moveCount });
  }

  if (screen === "menu") {
    drawPauseMenu(ctx);
  }
}

function tick(): void {
  if (screen === "play" || screen === "menu") {
    if (rotating && !orbitDrag) {
      const k = 0.18;
      rotX += (targetRotX - rotX) * k;
      rotY += (targetRotY - rotY) * k;
      if (
        Math.abs(targetRotX - rotX) < 0.002 &&
        Math.abs(targetRotY - rotY) < 0.002
      ) {
        rotX = targetRotX;
        rotY = targetRotY;
        rotating = false;
      }
      syncActiveFace();
    }
  }
  paint();
  requestAnimationFrame(tick);
}

function goHome(): void {
  screen = "home";
  orbitDrag = null;
  rotating = false;
}

function startPlay(): void {
  session = startSession(session.size);
  saveCubeSize(session.size);
  rotX = DEFAULT_ROT_X;
  rotY = DEFAULT_ROT_Y;
  targetRotX = DEFAULT_ROT_X;
  targetRotY = DEFAULT_ROT_Y;
  turnDir = 1;
  screen = "play";
  sfxPaperRustle();
}

canvas.addEventListener("pointerdown", (e) => {
  unlockAudio();
  const { x, y } = canvasPoint(e);

  if (screen === "home") {
    if (hitUiRect(HOME_PLAY, x, y)) {
      startPlay();
      return;
    }
    if (hitUiRect(HOME_SETTINGS, x, y)) {
      settingsFrom = "home";
      screen = "settings";
      return;
    }
    return;
  }

  if (screen === "settings") {
    if (hitUiRect(SETTINGS_VOL, x, y)) {
      cycleSfxVolume();
      return;
    }
    if (hitUiRect(SETTINGS_THEME, x, y)) {
      cycleTheme();
      void loadStickers();
      return;
    }
    if (hitUiRect(SETTINGS_SIZE, x, y)) {
      const next = cycleCubeSize(session.size);
      if (settingsFrom === "menu") {
        session = startSession(next);
      } else {
        session = { ...session, size: next };
      }
      return;
    }
    if (hitUiRect(SETTINGS_BACK, x, y)) {
      screen = settingsFrom === "menu" ? "menu" : settingsFrom;
      return;
    }
    return;
  }

  if (screen === "menu") {
    if (hitUiRect(PAUSE_RESUME, x, y)) {
      screen = "play";
      return;
    }
    if (hitUiRect(PAUSE_SETTINGS, x, y)) {
      settingsFrom = "menu";
      screen = "settings";
      return;
    }
    if (hitUiRect(PAUSE_SCRAMBLE, x, y)) {
      session = doScramble(session);
      screen = "play";
      sfxPaperRustle();
      return;
    }
    if (hitUiRect(PAUSE_HOME, x, y)) {
      goHome();
      return;
    }
    return;
  }

  // play
  if (session.status === "solved") {
    if (hitRetry(x, y)) {
      session = doScramble(session);
      sfxPaperRustle();
      return;
    }
    if (hitSolvedHome(x, y)) {
      goHome();
      return;
    }
    return;
  }

  if (hitUiRect(MENU_BTN, x, y)) {
    screen = "menu";
    return;
  }
  if (hitVolumeButton(x, y)) {
    cycleSfxVolume();
    return;
  }

  if (orbitBtns) {
    const orb = hitOrbitButton(orbitBtns, x, y);
    if (orb) {
      const d = orbitStepDelta(orb);
      targetRotX = rotX + d.dRotX;
      targetRotY = rotY + d.dRotY;
      rotating = true;
      return;
    }
  }

  if (playDock) {
    if (hitUiRect(playDock.select, x, y)) {
      const now = performance.now();
      if (now - lastSelectTap < 350) {
        turnDir = turnDir === 1 ? -1 : 1;
        lastSelectTap = 0;
        sfxPaperRustle();
        return;
      }
      lastSelectTap = now;
      doTurn(session.face);
      return;
    }
    if (hitUiRect(playDock.up, x, y)) {
      doTurn(faceTowardScreenDir(rotX, rotY, "up"));
      return;
    }
    if (hitUiRect(playDock.down, x, y)) {
      doTurn(faceTowardScreenDir(rotX, rotY, "down"));
      return;
    }
    if (hitUiRect(playDock.left, x, y)) {
      doTurn(faceTowardScreenDir(rotX, rotY, "left"));
      return;
    }
    if (hitUiRect(playDock.right, x, y)) {
      doTurn(faceTowardScreenDir(rotX, rotY, "right"));
      return;
    }
  }

  canvas.setPointerCapture(e.pointerId);
  orbitDrag = { x0: x, y0: y, rotX0: rotX, rotY0: rotY };
  rotating = false;
});

canvas.addEventListener("pointermove", (e) => {
  if (!orbitDrag || screen !== "play") return;
  const { x, y } = canvasPoint(e);
  const next = applyOrbitDrag(
    orbitDrag.rotX0,
    orbitDrag.rotY0,
    x - orbitDrag.x0,
    y - orbitDrag.y0,
    ORBIT_DRAG_SENS,
  );
  rotX = next.rotX;
  rotY = next.rotY;
  targetRotX = rotX;
  targetRotY = rotY;
  syncActiveFace();
});

canvas.addEventListener("pointerup", (e) => {
  if (orbitDrag) {
    const q = SNAP_Q;
    targetRotX = Math.round(rotX / q) * q;
    targetRotY = Math.round(rotY / q) * q;
    rotating = true;
    orbitDrag = null;
  }
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
});

canvas.addEventListener("pointercancel", () => {
  orbitDrag = null;
});

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);

async function boot(): Promise<void> {
  applyThemeChrome();
  resize();
  await Promise.all([loadLogo(), loadUiButtons(), loadStickers()]);
  requestAnimationFrame(tick);
}

boot();
