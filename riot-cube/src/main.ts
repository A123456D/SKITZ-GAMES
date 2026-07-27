import {
  applyTwist,
  cycleCubeSize,
  doScramble,
  loadCubeSize,
  saveCubeSize,
  setActiveFace,
  sizeLabel,
  startSession,
  type FaceId,
  type LaneTwist,
  type Session,
} from "./core/session";
import { previewCube } from "./core/lane";
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
  facingFace,
  facingFaceDot,
  FACE_NAMES,
  hitFrontUV,
  hitOrbitButton,
  screenDeltaToFaceUV,
  type CubeLayout,
  type CubeMotion,
} from "./view/cube3d";
import {
  applyOrbitDrag,
  orbitStepTarget,
  ORBIT_DRAG_SENS,
  snapOrbitToFace,
} from "./view/orbit";
import {
  cycleSfxVolume,
  getSfxVolume,
  sfxPaperFlutter,
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
  getTheme,
  getThemeLabel,
} from "./view/theme";
import {
  ensureThemeArt,
  onThemeArtReady,
  reloadThemeArt,
} from "./view/themeAssets";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

type Screen = "home" | "play" | "menu" | "settings";
let screen: Screen = "home";
let settingsFrom: Screen = "home";

let session: Session = startSession(loadCubeSize());
let controlMode: "row" | "col" = "row";
let controlIndex = 0;
let playDock: PlayDock | null = null;

type DragState = {
  u0: number;
  v0: number;
  x0: number;
  y0: number;
  axis: "row" | "col" | null;
  index: number;
  offsetUv: number;
  r: number;
  c: number;
};

let drag: DragState | null = null;
let springUv = 0;
let springAxis: "row" | "col" | null = null;
let springIndex = -1;

const DEFAULT_ROT_X = 0.04;
const DEFAULT_ROT_Y = -0.05;
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

function activeMotion(): CubeMotion {
  if (drag?.axis) {
    return {
      axis: drag.axis,
      index: drag.index,
      offset: drag.offsetUv,
      hovering: true,
    };
  }
  if (springAxis) {
    return {
      axis: springAxis,
      index: springIndex,
      offset: springUv,
      hovering: Math.abs(springUv) > 0.01,
    };
  }
  if (screen === "play" && session.status === "playing") {
    return {
      axis: controlMode,
      index: controlIndex,
      offset: 0,
      hovering: true,
    };
  }
  return { axis: null, index: -1, offset: 0, hovering: false };
}

function resetPlayVisuals(): void {
  drag = null;
  orbitDrag = null;
  rotating = false;
  springUv = 0;
  springAxis = null;
  springIndex = -1;
  rotX = DEFAULT_ROT_X;
  rotY = DEFAULT_ROT_Y;
  targetRotX = rotX;
  targetRotY = rotY;
}

function doTwist(twist: LaneTwist): void {
  if (session.status === "solved") return;
  session = applyTwist(session, twist);
  sfxPaperSlide();
}

function inCubeOrbitZone(_layout: CubeLayout, x: number, y: number): boolean {
  return y > 195 && y < 1000 && x > 24 && x < W - 24;
}

function orbitSens(): number {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;
  return coarse ? ORBIT_DRAG_SENS * 1.55 : ORBIT_DRAG_SENS;
}

function snapAngles(rx: number, ry: number): { x: number; y: number } {
  const snapped = snapOrbitToFace(rx, ry);
  // Home tip only on front — keeps a little depth without reintroducing gimbal snaps.
  if (
    Math.abs(nearestAngle(snapped.x, 0) - snapped.x) < 0.001 &&
    Math.abs(nearestAngle(snapped.y, 0) - snapped.y) < 0.001
  ) {
    return { x: DEFAULT_ROT_X, y: DEFAULT_ROT_Y };
  }
  return snapped;
}

function nearestAngle(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d;
}

function startOrbitStep(dir: "left" | "right" | "up" | "down"): void {
  if (drag || session.status !== "playing") return;
  orbitDrag = null;
  if (rotating) {
    rotX = targetRotX;
    rotY = targetRotY;
    rotating = false;
    syncActiveFace();
  }
  let tx = rotX;
  let ty = rotY;
  if (Math.abs(tx - DEFAULT_ROT_X) < 0.02 && Math.abs(ty - DEFAULT_ROT_Y) < 0.02) {
    tx = 0;
    ty = 0;
  } else {
    const snapped = snapOrbitToFace(tx, ty);
    tx = snapped.x;
    ty = snapped.y;
  }
  const next = orbitStepTarget(tx, ty, dir);
  targetRotX = next.rotX;
  targetRotY = next.rotY;
  rotating = true;
  sfxPaperFlutter();
  syncActiveFace();
}

function beginOrbitDrag(x: number, y: number): void {
  rotating = false;
  orbitDrag = { x0: x, y0: y, rotX0: rotX, rotY0: rotY };
}

function endOrbitDrag(): void {
  if (!orbitDrag) return;
  orbitDrag = null;
  const snapped = snapAngles(rotX, rotY);
  targetRotX = nearestAngle(rotX, snapped.x);
  targetRotY = nearestAngle(rotY, snapped.y);
  rotating = true;
}

function hitPlayDock(x: number, y: number): boolean {
  if (!playDock || session.status !== "playing") return false;
  const n = session.size;
  const d = playDock;

  if (hitUiRect(d.select, x, y)) {
    controlMode = controlMode === "row" ? "col" : "row";
    controlIndex = Math.min(controlIndex, n - 1);
    sfxPaperRustle();
    return true;
  }

  if (controlMode === "row") {
    if (hitUiRect(d.left, x, y)) {
      doTwist({ axis: "row", index: controlIndex, dir: -1, amount: 1 });
      return true;
    }
    if (hitUiRect(d.right, x, y)) {
      doTwist({ axis: "row", index: controlIndex, dir: 1, amount: 1 });
      return true;
    }
    if (hitUiRect(d.up, x, y)) {
      controlIndex = (controlIndex - 1 + n) % n;
      sfxPaperRustle();
      return true;
    }
    if (hitUiRect(d.down, x, y)) {
      controlIndex = (controlIndex + 1) % n;
      sfxPaperRustle();
      return true;
    }
  } else {
    if (hitUiRect(d.up, x, y)) {
      doTwist({ axis: "col", index: controlIndex, dir: -1, amount: 1 });
      return true;
    }
    if (hitUiRect(d.down, x, y)) {
      doTwist({ axis: "col", index: controlIndex, dir: 1, amount: 1 });
      return true;
    }
    if (hitUiRect(d.left, x, y)) {
      controlIndex = (controlIndex - 1 + n) % n;
      sfxPaperRustle();
      return true;
    }
    if (hitUiRect(d.right, x, y)) {
      controlIndex = (controlIndex + 1) % n;
      sfxPaperRustle();
      return true;
    }
  }
  return false;
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
  const motion = activeMotion();
  const source = session.cube;
  let display = source;
  if (motion.axis && motion.hovering && Math.abs(motion.offset) > 0.001) {
    display = previewCube(
      source,
      session.face,
      motion.axis,
      motion.index,
      motion.offset,
    );
  }

  drawHud(ctx, {
    sizeLabel: sizeLabel(session.size),
    moves: session.moveCount,
    faceName: FACE_NAMES[session.face]!,
    sfxVol: getSfxVolume(),
  });
  drawMenuButton(ctx);

  drawCube3D(ctx, layout, display, {
    activeFace: session.face,
    motion,
    sourceCube: source,
  });
  orbitBtns = drawCubeOrbitButtons(ctx, layout.cx, layout.cy, layout.scale, W, H);

  const n = session.size;
  controlIndex = ((controlIndex % n) + n) % n;
  playDock = drawPlayDock(ctx, {
    mode: controlMode,
    index: controlIndex,
    size: n,
  });

  if (session.status === "solved") {
    drawEndOverlay(ctx, { moves: session.moveCount });
  }
  if (screen === "menu") {
    drawPauseMenu(ctx);
  }
}

function tick(): void {
  if (screen === "play" || screen === "menu") {
    if (springAxis) {
      springUv *= 0.78;
      if (Math.abs(springUv) < 0.008) {
        springUv = 0;
        springAxis = null;
        springIndex = -1;
      }
    }
    if (rotating && !orbitDrag) {
      const speed = 0.14;
      rotX += (targetRotX - rotX) * speed;
      rotY += (targetRotY - rotY) * speed;
      if (
        Math.abs(targetRotX - rotX) < 0.01 &&
        Math.abs(targetRotY - rotY) < 0.01
      ) {
        const snapped = snapAngles(targetRotX, targetRotY);
        rotX = snapped.x;
        rotY = snapped.y;
        targetRotX = rotX;
        targetRotY = rotY;
        rotating = false;
        syncActiveFace();
      }
    }
  }
  paint();
  requestAnimationFrame(tick);
}

function goHome(): void {
  screen = "home";
  resetPlayVisuals();
  controlMode = "row";
  controlIndex = 0;
}

function startPlay(): void {
  resetPlayVisuals();
  controlMode = "row";
  controlIndex = 0;
  session = startSession(session.size);
  saveCubeSize(session.size);
  syncActiveFace();
  screen = "play";
  sfxPaperRustle();
}

canvas.addEventListener(
  "pointerdown",
  (e) => {
    e.preventDefault();
    unlockAudio();
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);

    if (screen === "home") {
      if (hitUiRect(HOME_PLAY, p.x, p.y)) {
        sfxPaperFlutter();
        startPlay();
        return;
      }
      if (hitUiRect(HOME_SETTINGS, p.x, p.y)) {
        settingsFrom = "home";
        screen = "settings";
        return;
      }
      return;
    }

    if (screen === "settings") {
      if (hitUiRect(SETTINGS_VOL, p.x, p.y)) {
        cycleSfxVolume();
        return;
      }
    if (hitUiRect(SETTINGS_THEME, p.x, p.y)) {
      cycleTheme();
      reloadThemeArt(getTheme());
      void loadStickers();
      sfxPaperRustle();
      return;
    }
      if (hitUiRect(SETTINGS_SIZE, p.x, p.y)) {
        const next = cycleCubeSize(session.size);
        if (settingsFrom === "menu") session = startSession(next);
        else session = { ...session, size: next };
        controlIndex = 0;
        return;
      }
      if (hitUiRect(SETTINGS_BACK, p.x, p.y)) {
        screen = settingsFrom === "menu" ? "menu" : settingsFrom;
        return;
      }
      return;
    }

    if (screen === "menu") {
      if (hitUiRect(PAUSE_RESUME, p.x, p.y)) {
        screen = "play";
        return;
      }
      if (hitUiRect(PAUSE_SETTINGS, p.x, p.y)) {
        settingsFrom = "menu";
        screen = "settings";
        return;
      }
      if (hitUiRect(PAUSE_SCRAMBLE, p.x, p.y)) {
        session = doScramble(session);
        resetPlayVisuals();
        syncActiveFace();
        screen = "play";
        sfxPaperRustle();
        return;
      }
      if (hitUiRect(PAUSE_HOME, p.x, p.y)) {
        goHome();
        return;
      }
      return;
    }

    if (session.status === "solved") {
      if (hitVolumeButton(p.x, p.y)) {
        cycleSfxVolume();
        return;
      }
      if (hitUiRect(MENU_BTN, p.x, p.y)) {
        screen = "menu";
        return;
      }
      if (hitRetry(p.x, p.y)) {
        session = doScramble(session);
        resetPlayVisuals();
        syncActiveFace();
        sfxPaperRustle();
        return;
      }
      if (hitSolvedHome(p.x, p.y)) {
        goHome();
        return;
      }
      return;
    }

    if (hitUiRect(MENU_BTN, p.x, p.y)) {
      drag = null;
      orbitDrag = null;
      rotating = false;
      screen = "menu";
      sfxPaperRustle();
      return;
    }
    if (hitVolumeButton(p.x, p.y)) {
      cycleSfxVolume();
      return;
    }
    if (hitPlayDock(p.x, p.y)) return;

    if (orbitBtns) {
      const orb = hitOrbitButton(orbitBtns, p.x, p.y);
      if (orb) {
        startOrbitStep(orb);
        return;
      }
    }

    const layout = cubeLayout();
    const headOn = facingFaceDot(rotX, rotY) >= 0.75;
    const hit = headOn && !rotating ? hitFrontUV(layout, p.x, p.y) : null;
    if (hit && hit.face === session.face) {
      const n = session.size;
      const c = Math.min(n - 1, Math.max(0, Math.floor(hit.u * n)));
      const r = Math.min(n - 1, Math.max(0, Math.floor(hit.v * n)));
      controlIndex = controlMode === "row" ? r : c;
      drag = {
        u0: hit.u,
        v0: hit.v,
        x0: p.x,
        y0: p.y,
        axis: null,
        index: -1,
        offsetUv: 0,
        r,
        c,
      };
      return;
    }

    if (inCubeOrbitZone(layout, p.x, p.y)) {
      beginOrbitDrag(p.x, p.y);
    }
  },
  { passive: false },
);

canvas.addEventListener(
  "pointermove",
  (e) => {
    e.preventDefault();
    if (screen !== "play" || session.status !== "playing") return;
    const p = canvasPoint(e);

    if (orbitDrag) {
      const dx = p.x - orbitDrag.x0;
      const dy = p.y - orbitDrag.y0;
      const next = applyOrbitDrag(
        orbitDrag.rotX0,
        orbitDrag.rotY0,
        dx,
        dy,
        orbitSens(),
      );
      rotX = next.rotX;
      rotY = next.rotY;
      targetRotX = rotX;
      targetRotY = rotY;
      syncActiveFace();
      return;
    }

    if (!drag || rotating) return;
    const layout = cubeLayout();
    const mapped = screenDeltaToFaceUV(layout, p.x - drag.x0, p.y - drag.y0);
    const du = mapped?.du ?? (p.x - drag.x0) / (layout.scale * 2);
    const dv = mapped?.dv ?? (p.y - drag.y0) / (layout.scale * 2);

    if (!drag.axis) {
      if (Math.abs(du) < 0.03 && Math.abs(dv) < 0.03) return;
      if (Math.abs(du) >= Math.abs(dv)) {
        drag.axis = "row";
        drag.index = drag.r;
      } else {
        drag.axis = "col";
        drag.index = drag.c;
      }
      controlMode = drag.axis;
      controlIndex = drag.index;
      sfxPaperRustle();
    }
    drag.offsetUv = drag.axis === "row" ? du : dv;
  },
  { passive: false },
);

function endDrag(): void {
  if (screen !== "play") return;
  if (orbitDrag) {
    endOrbitDrag();
    return;
  }
  if (!drag) return;
  const axis = drag.axis;
  const index = drag.index;
  const offsetUv = drag.offsetUv;
  drag = null;
  if (!axis || index < 0) return;
  const steps = Math.round(offsetUv * session.size);
  if (steps === 0) {
    springAxis = axis;
    springIndex = index;
    springUv = offsetUv;
    sfxPaperRustle();
    return;
  }
  const dir: 1 | -1 = steps > 0 ? 1 : -1;
  const amount = Math.min(session.size - 1, Math.abs(steps));
  springAxis = null;
  springIndex = -1;
  springUv = 0;
  doTwist({ axis, index, dir, amount });
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", () => {
  if (screen !== "play") return;
  if (orbitDrag) endOrbitDrag();
  if (drag?.axis) {
    springAxis = drag.axis;
    springIndex = drag.index;
    springUv = drag.offsetUv;
  }
  drag = null;
});

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);

async function boot(): Promise<void> {
  applyThemeChrome();
  ensureThemeArt(getTheme());
  onThemeArtReady(() => {
    /* next paint picks up art */
  });
  resize();
  await Promise.all([loadLogo(), loadUiButtons(), loadStickers()]);
  ensureThemeArt("classic");
  ensureThemeArt("grime");
  syncActiveFace();
  requestAnimationFrame(tick);
}

boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
