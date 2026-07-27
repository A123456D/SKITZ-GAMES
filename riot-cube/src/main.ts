import {
  applyFaceTurn,
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
import { applyLaneTwist, previewCube } from "./core/lane";
import {
  isSolved,
  type ColorId,
  type CubeState,
} from "./core/rubik";
import {
  W,
  H,
  drawDesk,
  drawEndOverlay,
  drawFaceTurnButtons,
  drawHomeScreen,
  drawHud,
  drawMenuButton,
  drawPauseMenu,
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
  type FaceTurnButtons,
} from "./view/draw";
import {
  drawCube3D,
  drawCubeOrbitButtons,
  facingFaceDot,
  facingFaceQuat,
  hitFrontUV,
  hitOrbitButton,
  screenDeltaToFaceUV,
  type CubeLayout,
  type CubeMotion,
} from "./view/cube3d";
import {
  applyOrbitDragQuat,
  orbitStepQuat,
  ORBIT_DRAG_SENS,
  snapOrbitQuat,
} from "./view/orbit";
import {
  type Quat,
  quatCopy,
  quatDot,
  quatFromEulerYX,
  quatIdentity,
  quatSlerp,
} from "./view/quat";
import {
  cycleSfxVolume,
  getSfxVolume,
  sfxPaperFlutter,
  sfxPaperRustle,
  sfxPaperSlide,
  unlockAudio,
} from "./audio/paper";
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
let faceTurnBtns: FaceTurnButtons | null = null;

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

const TURN_MS = 340;

type TurnAnim =
  | {
      kind: "face";
      face: FaceId;
      dir: 1 | -1;
      t: number;
      ms: number;
    }
  | {
      kind: "lane";
      face: FaceId;
      axis: "row" | "col";
      index: number;
      fromUv: number;
      toUv: number;
      twist: LaneTwist;
      t: number;
      ms: number;
    }
  | {
      kind: "laneOuter";
      face: FaceId;
      axis: "row" | "col";
      index: number;
      dir: 1 | -1;
      /** Colors on the active face line before the move */
      startLine: ColorId[];
      /** Colors on that line after applyLaneTwist */
      endLine: ColorId[];
      /** Full cube after the twist — applied on complete */
      resultCube: CubeState;
      twist: LaneTwist;
      t: number;
      ms: number;
    };
let turnAnim: TurnAnim | null = null;
let lastFrameTs = 0;

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

const DEFAULT_ORIENT = quatFromEulerYX(0.04, -0.05);
let orient: Quat = quatCopy(DEFAULT_ORIENT);
let targetOrient: Quat = quatCopy(DEFAULT_ORIENT);
let rotating = false;

let orbitDrag: {
  x0: number;
  y0: number;
  q0: Quat;
} | null = null;

let orbitBtns: ReturnType<typeof drawCubeOrbitButtons> | null = null;

function cubeLayout(): CubeLayout {
  return {
    cx: W / 2,
    cy: 560,
    scale: session.size <= 2 ? 230 : 215,
    q: orient,
    rotX: 0,
    rotY: 0,
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
  const face = facingFaceQuat(orient) as FaceId;
  if (face !== session.face) {
    session = setActiveFace(session, face);
  }
}

function readFaceLine(
  cube: CubeState,
  face: FaceId,
  axis: "row" | "col",
  index: number,
): ColorId[] {
  const n = cube.size;
  const line: ColorId[] = [];
  if (axis === "row") {
    for (let c = 0; c < n; c++) line.push(cube.faces[face]![index]![c] as ColorId);
  } else {
    for (let r = 0; r < n; r++) line.push(cube.faces[face]![r]![index] as ColorId);
  }
  return line;
}

function activeMotion(): CubeMotion {
  if (turnAnim?.kind === "face") {
    const e = easeOutCubic(turnAnim.t);
    return {
      axis: null,
      index: -1,
      offset: 0,
      hovering: false,
      faceSpin: e * turnAnim.dir * (Math.PI / 2),
    };
  }
  if (turnAnim?.kind === "laneOuter") {
    return {
      axis: turnAnim.axis,
      index: turnAnim.index,
      offset: 0,
      hovering: true,
      outerSlide: {
        dir: turnAnim.dir,
        progress: easeOutCubic(turnAnim.t),
        startLine: turnAnim.startLine,
        endLine: turnAnim.endLine,
        faces: turnAnim.twist.amount ?? 1,
      },
    };
  }
  if (turnAnim?.kind === "lane") {
    const e = easeOutCubic(turnAnim.t);
    return {
      axis: turnAnim.axis,
      index: turnAnim.index,
      offset: turnAnim.fromUv + (turnAnim.toUv - turnAnim.fromUv) * e,
      hovering: true,
    };
  }
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
  return { axis: null, index: -1, offset: 0, hovering: false };
}

function resetPlayVisuals(): void {
  drag = null;
  orbitDrag = null;
  rotating = false;
  turnAnim = null;
  springUv = 0;
  springAxis = null;
  springIndex = -1;
  orient = quatCopy(DEFAULT_ORIENT);
  targetOrient = quatCopy(orient);
}

/** Outer lanes map to real face turns; middle lanes are belt slices. */
function isOuterLane(index: number, size: number): boolean {
  return index === 0 || index === size - 1;
}

function doTwist(twist: LaneTwist, fromUv = 0): void {
  if (session.status === "solved" || turnAnim) return;
  const amount = Math.max(1, twist.amount ?? 1);
  const n = session.size;
  const outer = isOuterLane(twist.index, n);
  if (outer) {
    const face = session.face;
    const twistFull = { ...twist, amount };
    const resultCube = applyLaneTwist(session.cube, face, twistFull);
    const startLine = readFaceLine(session.cube, face, twist.axis, twist.index);
    const endLine = readFaceLine(resultCube, face, twist.axis, twist.index);
    const slideFaces = amount;
    turnAnim = {
      kind: "laneOuter",
      face,
      axis: twist.axis,
      index: twist.index,
      dir: twist.dir,
      startLine,
      endLine,
      resultCube,
      twist: twistFull,
      t: 0,
      ms: TURN_MS * Math.min(2.1, Math.max(1.35, slideFaces * 1.15)),
    };
    sfxPaperSlide();
    return;
  }
  // Middle lanes: belt preview (sticker-by-sticker).
  const toUv = (twist.dir * amount) / n;
  turnAnim = {
    kind: "lane",
    face: session.face,
    axis: twist.axis,
    index: twist.index,
    fromUv,
    toUv,
    twist: { ...twist, amount },
    t: 0,
    ms: TURN_MS,
  };
  sfxPaperSlide();
}

function doFaceTurn(dir: 1 | -1): void {
  if (session.status === "solved" || turnAnim) return;
  turnAnim = { kind: "face", face: session.face, dir, t: 0, ms: TURN_MS };
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

function snapOrient(q: Quat): Quat {
  const snapped = snapOrbitQuat(q);
  // Home tip only on front — keeps a little depth without reintroducing gimbal snaps.
  if (
    facingFaceQuat(snapped) === 0 &&
    Math.abs(quatDot(snapped, quatIdentity())) > 0.999
  ) {
    return quatCopy(DEFAULT_ORIENT);
  }
  return snapped;
}

function startOrbitStep(dir: "left" | "right" | "up" | "down"): void {
  if (drag || session.status !== "playing") return;
  orbitDrag = null;
  if (rotating) {
    orient = quatCopy(targetOrient);
    rotating = false;
    syncActiveFace();
  }
  let q = orient;
  if (Math.abs(quatDot(q, DEFAULT_ORIENT)) > 0.999) {
    q = quatIdentity();
  } else {
    q = snapOrbitQuat(q);
  }
  targetOrient = orbitStepQuat(q, dir);
  rotating = true;
  sfxPaperFlutter();
  syncActiveFace();
}

function beginOrbitDrag(x: number, y: number): void {
  rotating = false;
  orbitDrag = { x0: x, y0: y, q0: quatCopy(orient) };
}

function endOrbitDrag(): void {
  if (!orbitDrag) return;
  orbitDrag = null;
  targetOrient = snapOrient(orient);
  rotating = true;
}

function hitFaceTurnButtons(x: number, y: number): boolean {
  if (!faceTurnBtns || session.status !== "playing") return false;
  if (hitUiRect(faceTurnBtns.ccw, x, y)) {
    doFaceTurn(-1);
    return true;
  }
  if (hitUiRect(faceTurnBtns.cw, x, y)) {
    doFaceTurn(1);
    return true;
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
  // Integer side-peek only while dragging; lane turn anim stays continuous via lanePreview.
  if (
    turnAnim?.kind !== "lane" &&
    turnAnim?.kind !== "laneOuter" &&
    motion.axis &&
    motion.hovering &&
    Math.abs(motion.offset) > 0.001
  ) {
    display = previewCube(
      source,
      session.face,
      motion.axis,
      motion.index,
      motion.offset,
    );
  }

  drawHud(ctx, {
    sfxVol: getSfxVolume(),
  });
  drawMenuButton(ctx);

  drawCube3D(ctx, layout, display, {
    activeFace: session.face,
    motion,
    sourceCube: source,
    faceStickers: session.faceStickers,
  });
  orbitBtns = drawCubeOrbitButtons(ctx, layout.cx, layout.cy, layout.scale, W, H);

  faceTurnBtns = drawFaceTurnButtons(ctx);

  if (session.status === "solved") {
    drawEndOverlay(ctx, { moves: session.moveCount });
  }
  if (screen === "menu") {
    drawPauseMenu(ctx);
  }
}

function tick(ts: number): void {
  const dt = lastFrameTs ? Math.min(48, ts - lastFrameTs) : 16.67;
  lastFrameTs = ts;

  if (screen === "play" || screen === "menu") {
    if (turnAnim) {
      turnAnim.t += dt / turnAnim.ms;
      if (turnAnim.t >= 1) {
        turnAnim.t = 1;
        if (turnAnim.kind === "face") {
          session = applyFaceTurn(session, turnAnim.face, turnAnim.dir);
        } else if (turnAnim.kind === "laneOuter") {
          session = {
            ...session,
            cube: turnAnim.resultCube,
            face: session.face,
            moveCount: session.moveCount + 1,
            status: isSolved(turnAnim.resultCube) ? "solved" : "playing",
          };
        } else {
          const face = session.face;
          session = { ...session, face: turnAnim.face };
          session = applyTwist(session, turnAnim.twist);
          session = { ...session, face };
        }
        turnAnim = null;
      }
    }
    if (springAxis) {
      springUv += (0 - springUv) * 0.16;
      if (Math.abs(springUv) < 0.008) {
        springUv = 0;
        springAxis = null;
        springIndex = -1;
      }
    }
    if (rotating && !orbitDrag) {
      const speed = 0.14;
      orient = quatSlerp(orient, targetOrient, speed);
      if (Math.abs(quatDot(orient, targetOrient)) > 0.9995) {
        orient = snapOrient(targetOrient);
        targetOrient = quatCopy(orient);
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
}

function startPlay(): void {
  resetPlayVisuals();
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
    if (hitFaceTurnButtons(p.x, p.y)) return;

    if (orbitBtns) {
      const orb = hitOrbitButton(orbitBtns, p.x, p.y);
      if (orb) {
        startOrbitStep(orb);
        return;
      }
    }

    const layout = cubeLayout();
    const headOn = facingFaceDot(orient) >= 0.75;
    const hit =
      headOn && !rotating && !turnAnim ? hitFrontUV(layout, p.x, p.y) : null;
    if (hit && hit.face === session.face) {
      const n = session.size;
      const c = Math.min(n - 1, Math.max(0, Math.floor(hit.u * n)));
      const r = Math.min(n - 1, Math.max(0, Math.floor(hit.v * n)));
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
      orient = applyOrbitDragQuat(orbitDrag.q0, dx, dy, orbitSens());
      targetOrient = quatCopy(orient);
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
  const n = session.size;
  const outer = isOuterLane(index, n);
  const stickerSteps = Math.round(offsetUv * n);
  if (stickerSteps === 0) {
    springAxis = axis;
    springIndex = index;
    springUv = offsetUv;
    sfxPaperRustle();
    return;
  }
  if (turnAnim) {
    springAxis = axis;
    springIndex = index;
    springUv = offsetUv;
    return;
  }
  let dir: 1 | -1;
  let amount: number;
  if (outer) {
    // Face-turn units (full edge). Any clear sticker drag still commits one turn.
    let turns = Math.round(offsetUv);
    if (turns === 0) turns = stickerSteps > 0 ? 1 : -1;
    dir = turns > 0 ? 1 : -1;
    amount = Math.min(2, Math.abs(turns));
  } else {
    dir = stickerSteps > 0 ? 1 : -1;
    amount = Math.min(n - 1, Math.abs(stickerSteps));
  }
  springAxis = null;
  springIndex = -1;
  springUv = 0;
  doTwist({ axis, index, dir, amount }, offsetUv);
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
  await Promise.all([loadLogo(), loadStickers()]);
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
