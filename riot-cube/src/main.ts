import { LEVEL_1 } from "./core/levels";
import {
  applyTwist,
  setActiveFace,
  restartSession,
  startSession,
  starsForScore,
  type FaceId,
  type Session,
} from "./core/session";
import {
  cloneBoard,
  findMatches,
  matchedCells,
  type Board,
} from "./core/board";
import { twistCubeFaces, previewCubeFaces } from "./core/cubeTwist";
import type { TileKind, Twist } from "./core/types";
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
  hitUiRect,
  hitVolumeButton,
  loadLogo,
  HOME_PLAY,
  HOME_SETTINGS,
  MENU_BTN,
  PAUSE_HOME,
  PAUSE_RESUME,
  PAUSE_SETTINGS,
  SETTINGS_BACK,
  SETTINGS_VOL,
  type PlayDock,
} from "./view/draw";
import {
  drawCube3D,
  drawCubeOrbitButtons,
  facingFace,
  facingFaceDot,
  hitFrontUV,
  hitOrbitButton,
  screenDeltaToFaceUV,
  type CubeLayout,
} from "./view/cube3d";
import { applyOrbitDrag, orbitStepDelta, ORBIT_DRAG_SENS, SNAP_Q } from "./view/orbit";
import {
  cycleSfxVolume,
  getSfxVolume,
  sfxPaperCrumple,
  sfxPaperFlutter,
  sfxPaperRustle,
  sfxPaperSlide,
  unlockAudio,
} from "./audio/paper";
import { loadStickers } from "./view/stickers";
import { loadUiButtons } from "./view/uiButtons";
import { detectQuality, getQuality } from "./view/quality";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

type Screen = "home" | "play" | "menu" | "settings";
let screen: Screen = "home";
let settingsFrom: Screen = "home";

let session: Session = startSession(LEVEL_1);
let floatText: { text: string; life: number } | null = null;
/** Selected row/col for bottom dock — selected lane floats. */
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

/** Free finger orbit — rot follows the pointer. */
let orbitDrag: {
  x0: number;
  y0: number;
  rotX0: number;
  rotY0: number;
} | null = null;

let visualBoard: Board | null = null;
type Crumple = { r: number; c: number; kind: TileKind; seed: number };
let crumples: Crumple[] = [];
let crumpleT = 0;
let pendingTwist: Twist | null = null;
let busy = false;

let orbitBtns: ReturnType<typeof drawCubeOrbitButtons> | null = null;

function cubeLayout(): CubeLayout {
  return {
    cx: W / 2,
    cy: 600,
    scale: 215,
    rotX,
    rotY,
  };
}

function resize(): void {
  detectQuality();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Keep the portrait canvas upright; letterbox to fit any orientation.
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

function activeMotion(): {
  axis: "row" | "col" | null;
  index: number;
  offset: number;
  hovering: boolean;
} {
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
  // Idle selection from the dock — keep that lane floating.
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
  floatText = null;
  visualBoard = null;
  crumples = [];
  crumpleT = 0;
  pendingTwist = null;
  busy = false;
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

function goHome(): void {
  screen = "home";
  resetPlayVisuals();
  controlMode = "row";
  controlIndex = 0;
  session = startSession(LEVEL_1);
  syncActiveFace();
  paint();
}

function startPlay(): void {
  resetPlayVisuals();
  controlMode = "row";
  controlIndex = 0;
  session = startSession(LEVEL_1);
  syncActiveFace();
  screen = "play";
  paint();
}

function openSettings(from: Screen): void {
  settingsFrom = from;
  screen = "settings";
  paint();
}

function paint(): void {
  if (screen === "home") {
    drawHomeScreen(ctx);
    return;
  }
  if (screen === "settings") {
    drawSettingsScreen(ctx, { sfxVol: getSfxVolume() });
    return;
  }

  drawDesk(ctx);
  drawHud(ctx, {
    title: session.level.title,
    moves: session.movesLeft,
    score: session.score,
    goals: session.goals,
    sfxVol: getSfxVolume(),
  });
  drawMenuButton(ctx);

  const layout = cubeLayout();
  const motion = activeMotion();
  const sourceFaces = session.faces;
  let displayFaces = sourceFaces;
  if (motion.axis && motion.hovering && Math.abs(motion.offset) > 0.001 && !visualBoard) {
    const previewed = previewCubeFaces(
      sourceFaces,
      session.face,
      motion.axis,
      motion.index,
      motion.offset,
    );
    displayFaces = sourceFaces.map((f, i) =>
      i === session.face ? f : previewed[i]!,
    ) as Session["faces"];
  }
  displayFaces = displayFaces.map((f, i) =>
    i === session.face && visualBoard ? visualBoard : f,
  ) as Session["faces"];

  drawCube3D(ctx, layout, displayFaces, {
    activeFace: session.face,
    motion,
    crumples: crumples.map((c) => ({ ...c, t: crumpleT })),
    paper: true,
    sourceFaces,
  });

  orbitBtns = drawCubeOrbitButtons(ctx, layout.cx, layout.cy, layout.scale, W, H);

  const faceName = ["FRONT", "BACK", "RIGHT", "LEFT", "TOP", "BOTTOM"][session.face];
  ctx.fillStyle = "#f3efe6";
  ctx.font = "700 12px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`FACE · ${faceName}`, W / 2, 1008);

  const n = session.level.size;
  controlIndex = ((controlIndex % n) + n) % n;
  playDock = drawPlayDock(ctx, { mode: controlMode, index: controlIndex, size: n });

  if (floatText && floatText.life > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, floatText.life * 2);
    ctx.fillStyle = "#c8ff3d";
    ctx.font = "800 28px 'Permanent Marker', sans-serif";
    ctx.fillText(floatText.text, W / 2 - 60, 250);
    ctx.restore();
  }

  if (session.status !== "playing") {
    drawEndOverlay(ctx, {
      won: session.status === "won",
      score: session.score,
      stars: starsForScore(session.score, session.level.starScores),
    });
  }

  if (screen === "menu") {
    drawPauseMenu(ctx);
  }
}

function tick(): void {
  if (screen !== "play") {
    requestAnimationFrame(tick);
    return;
  }
  let dirty = false;
  if (floatText) {
    floatText.life -= 0.02;
    if (floatText.life <= 0) floatText = null;
    dirty = true;
  }
  if (springAxis) {
    springUv *= 0.78;
    if (Math.abs(springUv) < 0.008) {
      springUv = 0;
      springAxis = null;
      springIndex = -1;
    }
    dirty = true;
  }
  if (rotating && !orbitDrag) {
    const speed = 0.14;
    rotX += (targetRotX - rotX) * speed;
    rotY += (targetRotY - rotY) * speed;
    if (Math.abs(targetRotX - rotX) < 0.01 && Math.abs(targetRotY - rotY) < 0.01) {
      const snapped = snapAngles(targetRotX, targetRotY);
      rotX = snapped.x;
      rotY = snapped.y;
      targetRotX = rotX;
      targetRotY = rotY;
      rotating = false;
      syncActiveFace();
    }
    dirty = true;
  }
  if (crumples.length) {
    crumpleT = Math.min(1, crumpleT + 0.045);
    dirty = true;
    if (crumpleT >= 1 && pendingTwist) finishCrumple();
  }
  const needsPaint =
    dirty ||
    drag ||
    orbitDrag ||
    crumples.length ||
    rotating ||
    springAxis ||
    (session.status === "playing" && !busy);
  if (needsPaint) paint();
  requestAnimationFrame(tick);
}

function finishCrumple(): void {
  const twist = pendingTwist!;
  pendingTwist = null;
  crumples = [];
  crumpleT = 0;
  visualBoard = null;
  const result = applyTwist(session, twist);
  busy = false;
  if (!result.didTwist) {
    paint();
    return;
  }
  session = result.session;
  if (result.combo > 1) floatText = { text: `COMBO x${result.combo}`, life: 1 };
  else if (result.scoreGain > 0) floatText = { text: `+${result.scoreGain}`, life: 0.9 };
  paint();
}

function doTwist(twist: Twist): void {
  if (busy || session.status !== "playing") return;
  const facesTwisted = twistCubeFaces(session.faces, session.face, twist);
  const twisted = facesTwisted[session.face]!;
  const groups = findMatches(twisted);
  sfxPaperSlide();
  if (groups.length === 0) {
    const result = applyTwist(session, twist);
    if (!result.didTwist) return;
    session = result.session;
    paint();
    return;
  }
  busy = true;
  pendingTwist = twist;
  visualBoard = cloneBoard(twisted);
  crumpleT = 0;
  crumples = [];
  for (const k of matchedCells(groups)) {
    const [rs, cs] = k.split(",");
    const r = Number(rs);
    const c = Number(cs);
    const kind = twisted[r]![c];
    if (!kind) continue;
    crumples.push({ r, c, kind, seed: (r * 97 + c * 13 + session.score + 1) | 0 });
  }
  sfxPaperCrumple();
  paint();
}

function inCubeOrbitZone(_layout: CubeLayout, x: number, y: number): boolean {
  // Keep clear of the bottom dock. Stickers still claim the face first.
  return y > 195 && y < 1000 && x > 24 && x < W - 24;
}

function orbitSens(): number {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;
  // Installed / touch PWAs need a bit more pitch gain to feel vertical flips.
  return coarse ? ORBIT_DRAG_SENS * 1.55 : ORBIT_DRAG_SENS;
}

function hitPlayDock(x: number, y: number): boolean {
  if (!playDock || session.status !== "playing" || busy) return false;
  const n = session.level.size;
  const d = playDock;

  if (hitUiRect(d.select, x, y)) {
    controlMode = controlMode === "row" ? "col" : "row";
    controlIndex = Math.min(controlIndex, n - 1);
    sfxPaperRustle();
    paint();
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
      paint();
      return true;
    }
    if (hitUiRect(d.down, x, y)) {
      controlIndex = (controlIndex + 1) % n;
      sfxPaperRustle();
      paint();
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
      paint();
      return true;
    }
    if (hitUiRect(d.right, x, y)) {
      controlIndex = (controlIndex + 1) % n;
      sfxPaperRustle();
      paint();
      return true;
    }
  }
  return false;
}

function snapAngles(rx: number, ry: number): { x: number; y: number } {
  // Snap to axis-aligned face views. Tiny home tip only on upright front.
  const qx = Math.round(rx / SNAP_Q);
  const qy = Math.round(ry / SNAP_Q);
  let x = qx * SNAP_Q;
  let y = qy * SNAP_Q;
  const pitchCycle = ((qx % 4) + 4) % 4;
  const yawCycle = ((qy % 4) + 4) % 4;
  if (pitchCycle === 0 && yawCycle === 0) {
    x = DEFAULT_ROT_X;
    y = DEFAULT_ROT_Y;
  }
  return { x, y };
}

/** Closest angle to `from` that matches `to` (avoids long-way spins on snap). */
function nearestAngle(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d;
}

function startOrbitStep(dir: "left" | "right" | "up" | "down"): void {
  if (busy || drag || session.status !== "playing") return;
  orbitDrag = null;
  // Finish any in-flight tip before stacking another step.
  if (rotating) {
    rotX = targetRotX;
    rotY = targetRotY;
    rotating = false;
    syncActiveFace();
  }
  // Step on the quarter-turn grid (strip home tip), keep full angle so flips never stop.
  let tx = rotX;
  let ty = rotY;
  if (Math.abs(tx - DEFAULT_ROT_X) < 0.02 && Math.abs(ty - DEFAULT_ROT_Y) < 0.02) {
    tx = 0;
    ty = 0;
  } else {
    tx = Math.round(tx / SNAP_Q) * SNAP_Q;
    ty = Math.round(ty / SNAP_Q) * SNAP_Q;
  }
  const { dRotX, dRotY } = orbitStepDelta(dir);
  targetRotX = tx + dRotX;
  targetRotY = ty + dRotY;
  rotating = true;
  sfxPaperFlutter();
  syncActiveFace();
  paint();
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
      sfxPaperRustle();
      openSettings("home");
      return;
    }
    return;
  }

  if (screen === "settings") {
    if (hitUiRect(SETTINGS_VOL, p.x, p.y)) {
      cycleSfxVolume();
      paint();
      return;
    }
    if (hitUiRect(SETTINGS_BACK, p.x, p.y)) {
      sfxPaperRustle();
      screen = settingsFrom === "settings" ? "home" : settingsFrom;
      paint();
      return;
    }
    return;
  }

  if (screen === "menu") {
    if (hitUiRect(PAUSE_RESUME, p.x, p.y)) {
      sfxPaperRustle();
      screen = "play";
      paint();
      return;
    }
    if (hitUiRect(PAUSE_SETTINGS, p.x, p.y)) {
      sfxPaperRustle();
      openSettings("menu");
      return;
    }
    if (hitUiRect(PAUSE_HOME, p.x, p.y)) {
      sfxPaperFlutter();
      goHome();
      return;
    }
    return;
  }

  // screen === "play"
  if (session.status !== "playing") {
    if (hitVolumeButton(p.x, p.y)) {
      cycleSfxVolume();
      paint();
      return;
    }
    if (hitUiRect(MENU_BTN, p.x, p.y)) {
      drag = null;
      orbitDrag = null;
      screen = "menu";
      paint();
      return;
    }
    if (hitRetry(p.x, p.y)) {
      session = restartSession(session);
      resetPlayVisuals();
      syncActiveFace();
      paint();
    }
    return;
  }
  if (busy) return;

  if (hitUiRect(MENU_BTN, p.x, p.y)) {
    drag = null;
    orbitDrag = null;
    rotating = false;
    screen = "menu";
    sfxPaperRustle();
    paint();
    return;
  }

  if (hitVolumeButton(p.x, p.y)) {
    cycleSfxVolume();
    paint();
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
  // Twist when reasonably facing a face; otherwise orbit
  const headOn = facingFaceDot(rotX, rotY) >= 0.75;
  const hit = headOn && !rotating ? hitFrontUV(layout, p.x, p.y) : null;
  if (hit && hit.face === session.face) {
    const n = session.level.size;
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
  if (screen !== "play" || session.status !== "playing" || busy) return;
  const p = canvasPoint(e);

  if (orbitDrag) {
    const dx = p.x - orbitDrag.x0;
    const dy = p.y - orbitDrag.y0;
    const next = applyOrbitDrag(orbitDrag.rotX0, orbitDrag.rotY0, dx, dy, orbitSens());
    rotX = next.rotX;
    rotY = next.rotY;
    targetRotX = rotX;
    targetRotY = rotY;
    syncActiveFace();
    paint();
    return;
  }

  if (!drag || rotating) return;
  const layout = cubeLayout();
  // Map drag in the facing face's screen axes so wrap peeks track the finger
  // even when the pointer leaves the face quad.
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
  // Column: finger down (+V) pulls content down so TOP slides in from the top edge.
  drag.offsetUv = drag.axis === "row" ? du : dv;
  paint();
  },
  { passive: false },
);

function endDrag(): void {
  if (screen !== "play") return;
  if (orbitDrag) {
    endOrbitDrag();
    paint();
    return;
  }
  if (!drag) return;
  const axis = drag.axis;
  const index = drag.index;
  const offsetUv = drag.offsetUv;
  drag = null;
  if (!axis || index < 0) {
    paint();
    return;
  }
  const steps = Math.round(offsetUv * session.level.size);
  if (steps === 0) {
    springAxis = axis;
    springIndex = index;
    springUv = offsetUv;
    sfxPaperRustle();
    paint();
    return;
  }
  const dir: 1 | -1 = steps > 0 ? 1 : -1;
  const amount = Math.min(session.level.size - 1, Math.abs(steps));
  springAxis = null;
  springIndex = -1;
  springUv = 0;
  doTwist({ axis, index, dir, amount });
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", () => {
  if (screen !== "play") return;
  if (orbitDrag) {
    endOrbitDrag();
  }
  if (drag?.axis) {
    springAxis = drag.axis;
    springIndex = drag.index;
    springUv = drag.offsetUv;
  }
  drag = null;
  paint();
});

window.addEventListener("resize", () => {
  resize();
  paint();
});

loadStickers().then(async () => {
  await Promise.all([loadLogo(), loadUiButtons()]);
  syncActiveFace();
  resize();
  paint();
  requestAnimationFrame(tick);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
