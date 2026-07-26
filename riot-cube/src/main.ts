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
import { twistCubeFaces } from "./core/cubeTwist";
import type { TileKind, Twist } from "./core/types";
import {
  W,
  H,
  drawDesk,
  drawEndOverlay,
  drawHint,
  drawHud,
  hitRetry,
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
import { loadStickers } from "./view/stickers";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

let session: Session = startSession(LEVEL_1);
let floatText: { text: string; life: number } | null = null;

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

const DEFAULT_ROT_X = 0.035;
const DEFAULT_ROT_Y = -0.045;
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
const ORBIT_DRAG_SENS = 0.0065; // radians per canvas pixel

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
    cy: 620,
    scale: 175,
    rotX,
    rotY,
  };
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
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
  return { axis: null, index: -1, offset: 0, hovering: false };
}

function paint(): void {
  drawDesk(ctx);
  drawHud(ctx, {
    title: session.level.title,
    moves: session.movesLeft,
    score: session.score,
    goals: session.goals,
  });

  const layout = cubeLayout();
  const faces = session.faces.map((f, i) =>
    i === session.face && visualBoard ? visualBoard : f,
  ) as Session["faces"];

  drawCube3D(ctx, layout, faces, {
    activeFace: session.face,
    motion: activeMotion(),
    crumples: crumples.map((c) => ({ ...c, t: crumpleT })),
    paper: true,
  });

  orbitBtns = drawCubeOrbitButtons(ctx, layout.cx, layout.cy, layout.scale, W, H);

  const faceName = ["FRONT", "BACK", "RIGHT", "LEFT", "TOP", "BOTTOM"][session.face];
  ctx.fillStyle = "#f3efe6";
  ctx.font = "700 16px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`FACE · ${faceName}`, W / 2, 980);

  drawHint(
    ctx,
    session.status === "playing"
      ? "Drag a row/col — stickers slide in from the side faces. Drag around the cube to spin."
      : session.status === "won"
        ? "Rip. Match. Repeat."
        : "Try another twist path.",
  );

  if (floatText && floatText.life > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, floatText.life * 2);
    ctx.fillStyle = "#c8ff3d";
    ctx.font = "800 42px 'Permanent Marker', sans-serif";
    ctx.fillText(floatText.text, W / 2 - 80, 300);
    ctx.restore();
  }

  if (session.status !== "playing") {
    drawEndOverlay(ctx, {
      won: session.status === "won",
      score: session.score,
      stars: starsForScore(session.score, session.level.starScores),
    });
  }
}

function tick(): void {
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
      rotX = targetRotX;
      rotY = targetRotY;
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
  if (dirty || drag || orbitDrag || crumples.length || rotating) paint();
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
  paint();
}

function inCubeOrbitZone(_layout: CubeLayout, x: number, y: number): boolean {
  // Whole play band around the cube — stickers are claimed first on pointerdown.
  return y > 300 && y < 1000 && x > 24 && x < W - 24;
}

function startOrbitStep(dir: "left" | "right" | "up" | "down"): void {
  if (busy || drag || orbitDrag || session.status !== "playing") return;
  const q = Math.PI / 2;
  let tx = Math.round((rotX - DEFAULT_ROT_X) / q) * q + DEFAULT_ROT_X;
  let ty = Math.round((rotY - DEFAULT_ROT_Y) / q) * q + DEFAULT_ROT_Y;
  if (dir === "left") ty += q;
  if (dir === "right") ty -= q;
  if (dir === "up") tx -= q;
  if (dir === "down") tx += q;
  targetRotX = tx;
  targetRotY = ty;
  rotating = true;
}

function beginOrbitDrag(x: number, y: number): void {
  rotating = false;
  orbitDrag = { x0: x, y0: y, rotX0: rotX, rotY0: rotY };
}

function endOrbitDrag(): void {
  if (!orbitDrag) return;
  orbitDrag = null;
  // Soft-settle onto the nearest playable face
  const q = Math.PI / 2;
  targetRotX = Math.round((rotX - DEFAULT_ROT_X) / q) * q + DEFAULT_ROT_X;
  targetRotY = Math.round((rotY - DEFAULT_ROT_Y) / q) * q + DEFAULT_ROT_Y;
  rotating = true;
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = canvasPoint(e);
  if (session.status !== "playing") {
    if (hitRetry(p.x, p.y)) {
      session = restartSession(session);
      floatText = null;
      visualBoard = null;
      crumples = [];
      crumpleT = 0;
      pendingTwist = null;
      busy = false;
      orbitDrag = null;
      rotating = false;
      rotX = DEFAULT_ROT_X;
      rotY = DEFAULT_ROT_Y;
      targetRotX = rotX;
      targetRotY = rotY;
      paint();
    }
    return;
  }
  if (busy) return;

  if (orbitBtns) {
    const orb = hitOrbitButton(orbitBtns, p.x, p.y);
    if (orb) {
      startOrbitStep(orb);
      return;
    }
  }

  if (rotating) return;

  const layout = cubeLayout();
  // Only twist when the face is mostly head-on; angled views are for looking around.
  const headOn = facingFaceDot(rotX, rotY) >= 0.88;
  const hit = headOn ? hitFrontUV(layout, p.x, p.y) : null;
  if (hit && hit.face === session.face) {
    const n = session.level.size;
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

  // Drag anywhere in the play band = free aim with your finger
  if (inCubeOrbitZone(layout, p.x, p.y)) {
    beginOrbitDrag(p.x, p.y);
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (session.status !== "playing" || busy) return;
  const p = canvasPoint(e);

  if (orbitDrag) {
    const dx = p.x - orbitDrag.x0;
    const dy = p.y - orbitDrag.y0;
    rotY = orbitDrag.rotY0 + dx * ORBIT_DRAG_SENS;
    rotX = orbitDrag.rotX0 + dy * ORBIT_DRAG_SENS;
    // Keep pitch from flipping over the poles too wildly
    rotX = Math.max(-Math.PI * 0.85, Math.min(Math.PI * 0.85, rotX));
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
  }
  drag.offsetUv = drag.axis === "row" ? du : dv;
  paint();
});

function endDrag(): void {
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

loadStickers().then(() => {
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
