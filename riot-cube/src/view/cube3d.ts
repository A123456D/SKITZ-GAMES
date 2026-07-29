import type { ColorId, CubeState, FaceId } from "../core/rubik";
import { stickerForColor, type TileKind } from "../core/stickers";
import { lanePreview } from "../core/lane";
import type { HintMove } from "../core/hint";
import { getQuality } from "./quality";
import { stickerImage } from "./stickers";
import { getPalette, getTheme } from "./theme";
import { drawCover, getThemeArt } from "./themeAssets";
import {
  type Quat,
  quatFromEulerYX,
  quatRotateVec,
} from "./quat";

export type Vec3 = { x: number; y: number; z: number };
export type Vec2 = { x: number; y: number };
export type { Quat };

export type { FaceId };
export const FACE_NAMES = ["FRONT", "BACK", "RIGHT", "LEFT", "TOP", "BOTTOM"] as const;

type FaceGeom = {
  /** TL, TR, BR, BL in cube space (half-extent 1). U increases right, V down. */
  corners: [Vec3, Vec3, Vec3, Vec3];
  normal: Vec3;
};

const FACES: FaceGeom[] = [
  {
    corners: [
      { x: -1, y: -1, z: 1 },
      { x: 1, y: -1, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: -1, y: 1, z: 1 },
    ],
    normal: { x: 0, y: 0, z: 1 },
  },
  {
    corners: [
      { x: 1, y: -1, z: -1 },
      { x: -1, y: -1, z: -1 },
      { x: -1, y: 1, z: -1 },
      { x: 1, y: 1, z: -1 },
    ],
    normal: { x: 0, y: 0, z: -1 },
  },
  {
    corners: [
      { x: 1, y: -1, z: 1 },
      { x: 1, y: -1, z: -1 },
      { x: 1, y: 1, z: -1 },
      { x: 1, y: 1, z: 1 },
    ],
    normal: { x: 1, y: 0, z: 0 },
  },
  {
    corners: [
      { x: -1, y: -1, z: -1 },
      { x: -1, y: -1, z: 1 },
      { x: -1, y: 1, z: 1 },
      { x: -1, y: 1, z: -1 },
    ],
    normal: { x: -1, y: 0, z: 0 },
  },
  {
    corners: [
      { x: -1, y: -1, z: -1 },
      { x: 1, y: -1, z: -1 },
      { x: 1, y: -1, z: 1 },
      { x: -1, y: -1, z: 1 },
    ],
    normal: { x: 0, y: -1, z: 0 },
  },
  {
    corners: [
      { x: -1, y: 1, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: 1, y: 1, z: -1 },
      { x: -1, y: 1, z: -1 },
    ],
    normal: { x: 0, y: 1, z: 0 },
  },
];

function applyRot(v: Vec3, q: Quat): Vec3 {
  return quatRotateVec(q, v);
}

function project(v: Vec3, scale: number): Vec2 {
  const persp = 3.6 / (3.6 - v.z);
  return { x: v.x * scale * persp, y: v.y * scale * persp };
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export type CubeLayout = {
  cx: number;
  cy: number;
  scale: number;
  q: Quat;
  /** Unused legacy fields; rotation uses `q`. */
  rotX: number;
  rotY: number;
};

export function facingFaceQuat(q: Quat): FaceId {
  let best: FaceId = 0;
  let bestZ = -Infinity;
  for (let i = 0; i < 6; i++) {
    const n = applyRot(FACES[i]!.normal, q);
    if (n.z > bestZ) {
      bestZ = n.z;
      best = i as FaceId;
    }
  }
  return best;
}

/** Euler-compat wrapper for tests / callers that still pass pitch/yaw. */
export function facingFace(rotX: number, rotY: number): FaceId {
  return facingFaceQuat(quatFromEulerYX(rotX, rotY));
}

export function facingFaceDot(q: Quat): number {
  const face = facingFaceQuat(q);
  return applyRot(FACES[face]!.normal, q).z;
}

/**
 * Which cube face points most toward a screen direction
 * (left/right/up/down in canvas space, +Y down).
 */
export function faceTowardScreenDir(
  q: Quat,
  dir: "left" | "right" | "up" | "down",
): FaceId {
  const target =
    dir === "left"
      ? { x: -1, y: 0 }
      : dir === "right"
        ? { x: 1, y: 0 }
        : dir === "up"
          ? { x: 0, y: -1 }
          : { x: 0, y: 1 };
  let best: FaceId = 0;
  let bestDot = -Infinity;
  for (let i = 0; i < 6; i++) {
    const n = applyRot(FACES[i]!.normal, q);
    const xy = Math.hypot(n.x, n.y) || 1;
    const nx = n.x / xy;
    const ny = n.y / xy;
    const dot = nx * target.x + ny * target.y;
    // Prefer faces that are somewhat visible / side-on
    const score = dot - Math.max(0, n.z) * 0.15;
    if (score > bestDot) {
      bestDot = score;
      best = i as FaceId;
    }
  }
  return best;
}

export function frontFaceScreenQuad(
  layout: CubeLayout,
): { tl: Vec2; tr: Vec2; br: Vec2; bl: Vec2; face: FaceId } | null {
  const face = facingFaceQuat(layout.q);
  const geom = FACES[face]!;
  const n = applyRot(geom.normal, layout.q);
  if (n.z < 0.35) return null;
  const pts = geom.corners.map((c) => {
    const w = applyRot(c, layout.q);
    const p = project(w, layout.scale);
    return { x: layout.cx + p.x, y: layout.cy + p.y };
  });
  return { tl: pts[0]!, tr: pts[1]!, br: pts[2]!, bl: pts[3]!, face };
}

export function hitFrontUV(
  layout: CubeLayout,
  x: number,
  y: number,
): { face: FaceId; u: number; v: number } | null {
  const q = frontFaceScreenQuad(layout);
  if (!q) return null;
  const { tl, tr, br, bl } = q;
  const minX = Math.min(tl.x, tr.x, br.x, bl.x);
  const maxX = Math.max(tl.x, tr.x, br.x, bl.x);
  const minY = Math.min(tl.y, tr.y, br.y, bl.y);
  const maxY = Math.max(tl.y, tr.y, br.y, bl.y);
  if (x < minX || x > maxX || y < minY || y > maxY) return null;
  const hit = hitInQuad(x, y, tl, tr, br, bl);
  if (!hit) return null;
  return { face: q.face, u: hit.u, v: hit.v };
}

export function screenDeltaToFaceUV(
  layout: CubeLayout,
  dx: number,
  dy: number,
): { du: number; dv: number } | null {
  const q = frontFaceScreenQuad(layout);
  if (!q) return null;
  const ux = q.tr.x - q.tl.x;
  const uy = q.tr.y - q.tl.y;
  const vx = q.bl.x - q.tl.x;
  const vy = q.bl.y - q.tl.y;
  const det = ux * vy - uy * vx;
  if (Math.abs(det) < 1e-6) return null;
  return {
    du: (dx * vy - dy * vx) / det,
    dv: (ux * dy - uy * dx) / det,
  };
}

function hitInQuad(
  px: number,
  py: number,
  tl: Vec2,
  tr: Vec2,
  br: Vec2,
  bl: Vec2,
): { u: number; v: number } | null {
  const a = bary(px, py, tl, tr, br);
  if (a) {
    const u = a.w2 * 1 + a.w3 * 1;
    const v = a.w3 * 1;
    return { u, v };
  }
  const b = bary(px, py, tl, br, bl);
  if (b) {
    const u = b.w2 * 1;
    const v = b.w2 * 1 + b.w3 * 1;
    return { u, v };
  }
  return null;
}

function bary(
  px: number,
  py: number,
  a: Vec2,
  b: Vec2,
  c: Vec2,
): { w1: number; w2: number; w3: number } | null {
  const den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(den) < 1e-6) return null;
  const w1 = ((b.y - c.y) * (px - c.x) + (c.x - b.x) * (py - c.y)) / den;
  const w2 = ((c.y - a.y) * (px - c.x) + (a.x - c.x) * (py - c.y)) / den;
  const w3 = 1 - w1 - w2;
  if (w1 < -0.02 || w2 < -0.02 || w3 < -0.02) return null;
  return { w1, w2, w3 };
}

function facePoint(geom: FaceGeom, u: number, v: number): Vec3 {
  const top = lerp3(geom.corners[0]!, geom.corners[1]!, u);
  const bot = lerp3(geom.corners[3]!, geom.corners[2]!, u);
  return lerp3(top, bot, v);
}

export type CubeMotion = {
  axis: "row" | "col" | null;
  index: number;
  offset: number;
  hovering: boolean;
  /** Radians; rotates active-face stickers around face center in UV. */
  faceSpin?: number;
  /** 0..1 settle pulse after a twist lands (0 = just dropped). */
  dropT?: number;
  /** Which stickers settle — only the lane/face that just landed. */
  dropFace?: FaceId;
  dropKind?: "row" | "col" | "face";
  dropIndex?: number;
};

/** Rotate UV around face center. +angle = screen CW with V-down (matches faceTurn CW). */
function spinUV(u: number, v: number, a: number): { u: number; v: number } {
  const cu = u - 0.5;
  const cv = v - 0.5;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { u: 0.5 + cu * c - cv * s, v: 0.5 + cu * s + cv * c };
}

function rotateCellCW(r: number, c: number, n: number): { r: number; c: number } {
  return { r: c, c: n - 1 - r };
}

/** One sticker step on the face grid (CW or CCW). */
function rotateCell(
  r: number,
  c: number,
  n: number,
  dir: 1 | -1,
): { r: number; c: number } {
  if (dir === 1) return rotateCellCW(r, c, n);
  let p = { r, c };
  for (let i = 0; i < 3; i++) p = rotateCellCW(p.r, p.c, n);
  return p;
}

function facePointScreen(
  geom: FaceGeom,
  u: number,
  v: number,
  layout: CubeLayout,
): Vec2 {
  const local = facePoint(geom, u, v);
  const w = applyRot(local, layout.q);
  const p = project(w, layout.scale);
  return { x: layout.cx + p.x, y: layout.cy + p.y };
}

function facePointLifted(
  geom: FaceGeom,
  u: number,
  v: number,
  lift: number,
  layout: CubeLayout,
): Vec2 {
  const local = facePoint(geom, u, v);
  const lifted: Vec3 = {
    x: local.x + geom.normal.x * lift,
    y: local.y + geom.normal.y * lift,
    z: local.z + geom.normal.z * lift,
  };
  const w = applyRot(lifted, layout.q);
  const p = project(w, layout.scale);
  return { x: layout.cx + p.x, y: layout.cy + p.y };
}

/** Animated guide line for a suggested face turn or lane swipe. */
function drawHintMoveLine(
  ctx: CanvasRenderingContext2D,
  layout: CubeLayout,
  size: number,
  move: HintMove,
  t: number,
): void {
  const p = getPalette();
  const geom = FACES[move.face]!;
  const nView = applyRot(geom.normal, layout.q);
  if (nView.z <= 0.05) return;

  const lift = 0.1;
  const ease = t < 1 ? t : 1;
  const alpha = 0.6 + 0.35 * Math.sin(ease * Math.PI);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = p.hot;
  ctx.fillStyle = p.hot;
  ctx.lineWidth = 5;
  ctx.shadowColor = p.hot;
  ctx.shadowBlur = 10;

  if (move.kind === "face") {
    // Quarter-turn only (one sticker step on the face ring) — not a full 360°.
    const inset = 0.22;
    const steps = 24;
    const sweep = (Math.PI / 2) * move.dir;
    const pts: Vec2[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * sweep;
      const u = 0.5 + Math.cos(a) * (0.5 - inset);
      const v = 0.5 + Math.sin(a) * (0.5 - inset);
      pts.push(facePointLifted(geom, u, v, lift, layout));
    }
    const drawTo = Math.max(2, Math.floor(pts.length * Math.min(1, ease * 1.15)));
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < drawTo; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
    ctx.stroke();
    const tip = pts[Math.min(pts.length - 1, drawTo - 1)]!;
    const prev = pts[Math.max(0, drawTo - 3)]!;
    drawArrowHead(ctx, prev, tip, 14);

    // Label: one sticker / quarter turn
    const mid = pts[Math.min(pts.length - 1, Math.floor(drawTo * 0.55))]!;
    ctx.shadowBlur = 0;
    ctx.globalAlpha = Math.min(1, alpha + 0.2);
    ctx.font = "800 18px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 3;
    ctx.strokeText("1", mid.x, mid.y - 16);
    ctx.fillText("1", mid.x, mid.y - 16);
  } else {
    // One-sticker slide: from a cell center to the neighboring cell on that lane.
    const amount = Math.max(1, move.amount ?? 1);
    const mid = (move.index + 0.5) / size;
    const cell = 1 / size;
    // Start at first sticker center along the lane; end `amount` cells later.
    const fromCenter = 0.5 * cell;
    const toCenter = fromCenter + amount * cell * move.dir;
    const u0 = move.axis === "row" ? fromCenter : mid;
    const v0 = move.axis === "row" ? mid : fromCenter;
    const u1 = move.axis === "row" ? toCenter : mid;
    const v1 = move.axis === "row" ? mid : toCenter;
    // If dir is -1, start near the far end so the arrow still travels with the swipe.
    const startU = move.dir === 1 ? u0 : u0 + (size - 1) * cell * (move.axis === "row" ? 1 : 0);
    const startV = move.dir === 1 ? v0 : v0 + (size - 1) * cell * (move.axis === "col" ? 1 : 0);
    const endU =
      move.dir === 1
        ? u1
        : startU - amount * cell * (move.axis === "row" ? 1 : 0);
    const endV =
      move.dir === 1
        ? v1
        : startV - amount * cell * (move.axis === "col" ? 1 : 0);

    const start = facePointLifted(geom, startU, startV, lift, layout);
    const end = facePointLifted(geom, endU, endV, lift, layout);
    const head = {
      x: start.x + (end.x - start.x) * Math.min(1, ease),
      y: start.y + (end.y - start.y) * Math.min(1, ease),
    };
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(head.x, head.y);
    ctx.stroke();
    const along = {
      x: start.x + (end.x - start.x) * Math.max(0, Math.min(1, ease) - 0.12),
      y: start.y + (end.y - start.y) * Math.max(0, Math.min(1, ease) - 0.12),
    };
    drawArrowHead(ctx, along, head, 14);

    // Highlight source sticker cell
    const half = cell * 0.38;
    const c0 = facePointLifted(geom, startU - half, startV - half, lift * 0.5, layout);
    const c1 = facePointLifted(geom, startU + half, startV - half, lift * 0.5, layout);
    const c2 = facePointLifted(geom, startU + half, startV + half, lift * 0.5, layout);
    const c3 = facePointLifted(geom, startU - half, startV + half, lift * 0.5, layout);
    ctx.globalAlpha = 0.35 * alpha;
    ctx.beginPath();
    ctx.moveTo(c0.x, c0.y);
    ctx.lineTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.lineTo(c3.x, c3.y);
    ctx.closePath();
    ctx.fill();

    const label = {
      x: (start.x + head.x) / 2,
      y: (start.y + head.y) / 2,
    };
    ctx.globalAlpha = Math.min(1, alpha + 0.2);
    ctx.shadowBlur = 0;
    ctx.font = "800 18px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 3;
    const txt = String(amount);
    ctx.strokeText(txt, label.x, label.y - 14);
    ctx.fillStyle = p.hot;
    ctx.fillText(txt, label.x, label.y - 14);
  }

  ctx.restore();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: Vec2,
  to: Vec2,
  size: number,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - ux * size + px * size * 0.45, to.y - uy * size + py * size * 0.45);
  ctx.lineTo(to.x - ux * size - px * size * 0.45, to.y - uy * size - py * size * 0.45);
  ctx.closePath();
  ctx.fill();
}

export function drawCube3D(
  ctx: CanvasRenderingContext2D,
  layout: CubeLayout,
  cube: CubeState,
  opts: {
    activeFace: FaceId;
    motion?: CubeMotion;
    /** Unshifted cube for lane peeks (defaults to `cube`). */
    sourceCube?: CubeState;
    /** Per-face sticker kinds; defaults to FACE_STICKERS. */
    faceStickers?: readonly TileKind[];
    /** Animated move guide (line travels along the suggested turn). */
    hintMove?: HintMove | null;
    /** 0..1 animation phase for the hint line. */
    hintT?: number;
    /** Face just completed — satisfying flash (t 0..1). */
    faceCelebrate?: { face: FaceId; t: number } | null;
  },
): void {
  type FaceDraw = { i: FaceId; depth: number };
  const order: FaceDraw[] = [];
  for (let i = 0; i < 6; i++) {
    const n = applyRot(FACES[i]!.normal, layout.q);
    if (n.z <= 0.02) continue;
    const center = applyRot(
      {
        x: FACES[i]!.normal.x,
        y: FACES[i]!.normal.y,
        z: FACES[i]!.normal.z,
      },
      layout.q,
    );
    order.push({ i: i as FaceId, depth: center.z });
  }
  order.sort((a, b) => a.depth - b.depth);

  const motion: CubeMotion = opts.motion ?? {
    axis: null,
    index: -1,
    offset: 0,
    hovering: false,
  };
  const celebrate = opts.faceCelebrate ?? null;

  for (const f of order) {
    drawFace(
      ctx,
      layout,
      f.i,
      cube,
      opts.sourceCube ?? cube,
      motion,
      f.i === opts.activeFace,
      opts.faceStickers,
      celebrate && celebrate.face === f.i ? celebrate.t : 0,
    );
  }

  if (celebrate && celebrate.t > 0 && celebrate.t < 1) {
    drawFaceCompleteFx(ctx, layout, celebrate.face, celebrate.t);
  }

  if (opts.hintMove && (opts.hintT ?? 0) < 1) {
    drawHintMoveLine(ctx, layout, cube.size, opts.hintMove, opts.hintT ?? 0);
  }
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  layout: CubeLayout,
  faceIndex: FaceId,
  cube: CubeState,
  source: CubeState,
  motion: CubeMotion,
  isActive: boolean,
  faceStickers?: readonly TileKind[],
  celebrateT = 0,
): void {
  const p = getPalette();
  const geom = FACES[faceIndex]!;
  const board = cube.faces[faceIndex]!;
  const n = cube.size;
  const quality = getQuality();

  const q = geom.corners.map((c) => {
    const w = applyRot(c, layout.q);
    const pr = project(w, layout.scale);
    return { x: layout.cx + pr.x, y: layout.cy + pr.y };
  });

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(q[0]!.x, q[0]!.y);
  ctx.lineTo(q[1]!.x, q[1]!.y);
  ctx.lineTo(q[2]!.x, q[2]!.y);
  ctx.lineTo(q[3]!.x, q[3]!.y);
  ctx.closePath();
  ctx.fillStyle = isActive ? p.faceActive : p.faceSide;
  ctx.fill();
  ctx.strokeStyle = isActive ? p.accent : p.faceStroke;
  ctx.lineWidth = isActive ? 4 : 2.5;
  ctx.stroke();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = isActive ? p.faceRule : p.faceRuleDim;
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const a = lerp2(q[0]!, q[3]!, t);
    const b = lerp2(q[1]!, q[2]!, t);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  const gap = 0.04;
  const stride = 1 / n;
  const cell = (1 - gap * (n - 1)) / n;
  const pad = (stride - cell) / 2;
  const faceSpin = isActive && motion.faceSpin ? motion.faceSpin : 0;
  const spinning = Math.abs(faceSpin) > 1e-5;
  const spinProgress = spinning ? Math.min(1, Math.abs(faceSpin) / (Math.PI / 2)) : 0;
  const spinDir: 1 | -1 = faceSpin >= 0 ? 1 : -1;
  const movingRow =
    !spinning && isActive && motion.hovering && motion.axis === "row"
      ? motion.index
      : -1;
  const movingCol =
    !spinning && isActive && motion.hovering && motion.axis === "col"
      ? motion.index
      : -1;
  const hoverT = performance.now() / 1000;
  const dropTAll = motion.dropT ?? 0;
  const dropOnFace =
    dropTAll > 0 &&
    dropTAll < 1 &&
    motion.dropFace === faceIndex &&
    motion.dropKind != null;
  const cellDrops = (r: number, c: number): number => {
    if (!dropOnFace) return 0;
    if (motion.dropKind === "face") return dropTAll;
    if (motion.dropKind === "row" && r === motion.dropIndex) return dropTAll;
    if (motion.dropKind === "col" && c === motion.dropIndex) return dropTAll;
    return 0;
  };
  const liftPulse =
    quality.hoverAnim && (movingRow >= 0 || movingCol >= 0)
      ? 0.038 + 0.01 * Math.sin(hoverT * 3.4)
      : movingRow >= 0 || movingCol >= 0
        ? 0.04
        : spinning
          ? 0.032
          : 0.012;

  const paintSticker = (
    colorId: ColorId,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    hovering: boolean,
    artSpin = 0,
    /** Soft drop-shadow only while a row/col lane is lifted. */
    castShadow = false,
    dropT = 0,
  ) => {
    if (u1 <= 0 || u0 >= 1 || v1 <= 0 || v0 >= 1) return;
    const corners =
      Math.abs(artSpin) > 1e-5
        ? [
            spinUV(u0, v0, artSpin),
            spinUV(u1, v0, artSpin),
            spinUV(u1, v1, artSpin),
            spinUV(u0, v1, artSpin),
          ]
        : [
            { u: u0, v: v0 },
            { u: u1, v: v0 },
            { u: u1, v: v1 },
            { u: u0, v: v1 },
          ];
    const dropLift =
      dropT > 0 && dropT < 1 ? 0.028 * Math.exp(-dropT * 4.5) * (1 - dropT) : 0;
    const lift = hovering || spinning ? liftPulse : 0.012 + dropLift;
    const s0 = facePointLifted(geom, corners[0]!.u, corners[0]!.v, lift, layout);
    const s1 = facePointLifted(geom, corners[1]!.u, corners[1]!.v, lift, layout);
    const s2 = facePointLifted(geom, corners[2]!.u, corners[2]!.v, lift, layout);
    const s3 = facePointLifted(geom, corners[3]!.u, corners[3]!.v, lift, layout);
    const kind = stickerForColor(colorId, faceStickers);
    drawStickerOnQuad(
      ctx,
      kind,
      s0,
      s1,
      s2,
      s3,
      q,
      hovering || spinning,
      hoverT,
      dropT,
      celebrateT,
      castShadow,
    );
  };

  if (spinning) {
    // Per-sticker slide to the next cell (one step), not a rigid full-face texture spin.
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const colorId = board[r]![c] as ColorId;
        const dest = rotateCell(r, c, n, spinDir);
        const uA = c * stride + pad;
        const vA = r * stride + pad;
        const uB = dest.c * stride + pad;
        const vB = dest.r * stride + pad;
        const u0 = uA + (uB - uA) * spinProgress;
        const v0 = vA + (vB - vA) * spinProgress;
        // Center cubie still needs art rotation; edge stickers keep upright while sliding.
        const isCenter = n % 2 === 1 && r === (n - 1) / 2 && c === (n - 1) / 2;
        paintSticker(
          colorId,
          u0,
          v0,
          u0 + cell,
          v0 + cell,
          true,
          isCenter ? faceSpin : 0,
          false,
          cellDrops(r, c),
        );
      }
    }
  } else {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (r === movingRow || c === movingCol) continue;
        const colorId = board[r]![c] as ColorId;
        paintSticker(
          colorId,
          c * stride + pad,
          r * stride + pad,
          c * stride + pad + cell,
          r * stride + pad + cell,
          false,
          0,
          false,
          cellDrops(r, c),
        );
      }
    }

    if (movingRow >= 0) {
      const r = movingRow;
      const items = lanePreview(source, faceIndex, "row", r, motion.offset);
      for (const { pos, color } of items) {
        const u0 = (pos - 0.5) * stride + pad;
        const u1 = u0 + cell;
        const v0 = r * stride + pad;
        const v1 = v0 + cell;
        // Moving lane stickers are mid-air — no settle yet.
        paintSticker(color, u0, v0, u1, v1, true, 0, true, 0);
      }
    } else if (movingCol >= 0) {
      const c = movingCol;
      const items = lanePreview(source, faceIndex, "col", c, motion.offset);
      for (const { pos, color } of items) {
        const u0 = c * stride + pad;
        const u1 = u0 + cell;
        const v0 = (pos - 0.5) * stride + pad;
        const v1 = v0 + cell;
        paintSticker(color, u0, v0, u1, v1, true, 0, true, 0);
      }
    }
  }

  ctx.restore();
  ctx.restore();
}

function lerp2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function drawStickerOnQuad(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  tl: Vec2,
  tr: Vec2,
  br: Vec2,
  bl: Vec2,
  faceQuad: Vec2[],
  hovering: boolean,
  hoverT: number,
  dropT = 0,
  celebrateT = 0,
  castShadow = false,
): void {
  const cx = (tl.x + tr.x + br.x + bl.x) / 4;
  const cy = (tl.y + tr.y + br.y + bl.y) / 4;
  const bw =
    (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) /
    2;
  const bh =
    (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) /
    2;
  const anim = getQuality().hoverAnim && hovering;
  const phase = hoverT * 4.2 + cx * 0.02 + cy * 0.015;
  const bob = anim ? Math.sin(phase) * 2.4 : 0;
  const wobble = anim ? Math.sin(phase * 0.85 + 0.6) * 0.045 : 0;
  const breathe = anim
    ? 1.04 + Math.sin(phase * 0.7) * 0.025
    : hovering
      ? 1.03
      : 1.015;
  const celeb =
    celebrateT > 0 && celebrateT < 1
      ? 1 + Math.sin(Math.min(1, celebrateT * 1.4) * Math.PI) * 0.14
      : 1;

  // Soft drop: fall from a slight raise, then a tiny squash bounce.
  let dropY = 0;
  let dropScaleX = 1;
  let dropScaleY = 1;
  if (dropT > 0 && dropT < 1 && !hovering) {
    const damp = Math.exp(-3.4 * dropT);
    dropY = -Math.cos(dropT * Math.PI * 1.15) * 5.2 * damp;
    const impact =
      Math.sin(Math.min(1, dropT * 1.8) * Math.PI) * Math.exp(-dropT * 2.2);
    dropScaleX = 1 + impact * 0.07;
    dropScaleY = 1 - impact * 0.1;
  }

  const s = Math.min(bw, bh) * breathe * celeb;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(faceQuad[0]!.x, faceQuad[0]!.y);
  ctx.lineTo(faceQuad[1]!.x, faceQuad[1]!.y);
  ctx.lineTo(faceQuad[2]!.x, faceQuad[2]!.y);
  ctx.lineTo(faceQuad[3]!.x, faceQuad[3]!.y);
  ctx.closePath();
  ctx.clip();

  if (anim) {
    ctx.translate(cx, cy + bob + dropY);
    ctx.rotate(wobble);
    ctx.translate(-cx, -cy - bob - dropY);
  }

  const img = stickerImage(kind);
  const drawY = cy - (s * dropScaleY) / 2 + bob + dropY;
  const drawX = cx - (s * dropScaleX) / 2;
  const drawW = s * dropScaleX;
  const drawH = s * dropScaleY;

  // Soft shaped shadow behind the sticker (lane lift only) — not a ground oval.
  if (castShadow) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.42)";
    ctx.shadowBlur = Math.max(8, s * 0.18);
    ctx.shadowOffsetX = s * 0.04;
    ctx.shadowOffsetY = s * 0.1;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(drawX, drawY, drawW, drawH);
    }
    ctx.restore();
    // Clear shadow state, redraw crisp sticker on top.
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    const p = getPalette();
    ctx.fillStyle = p.paper;
    ctx.fillRect(drawX, drawY, drawW, drawH);
    ctx.fillStyle = p.ink;
    ctx.font = `800 ${Math.floor(s * 0.22)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(kind.slice(0, 3).toUpperCase(), cx, cy + bob + dropY);
  }
  ctx.restore();
}

/** Expanding rings + spark burst when a face locks in. */
function drawFaceCompleteFx(
  ctx: CanvasRenderingContext2D,
  layout: CubeLayout,
  face: FaceId,
  t: number,
): void {
  const geom = FACES[face]!;
  const nView = applyRot(geom.normal, layout.q);
  if (nView.z <= 0.05) return;
  const p = getPalette();
  const c = facePointScreen(geom, 0.5, 0.5, layout);
  const corner = facePointScreen(geom, 0.08, 0.08, layout);
  const radius = Math.hypot(corner.x - c.x, corner.y - c.y) * 1.35;
  const ease = 1 - Math.pow(1 - Math.min(1, t), 2);
  const pulse = Math.sin(Math.min(1, t * 1.15) * Math.PI);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Soft face wash
  ctx.fillStyle = p.hot;
  ctx.globalAlpha = 0.18 * pulse;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const u = i === 0 || i === 3 ? 0.04 : 0.96;
    const v = i < 2 ? 0.04 : 0.96;
    const pt = facePointScreen(geom, u, v, layout);
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
  ctx.fill();

  // Expanding rings
  for (let i = 0; i < 3; i++) {
    const delay = i * 0.12;
    const local = Math.max(0, Math.min(1, (t - delay) / 0.7));
    if (local <= 0) continue;
    const r = radius * (0.35 + local * 0.95);
    ctx.strokeStyle = i % 2 === 0 ? p.hot : p.accent;
    ctx.globalAlpha = (1 - local) * 0.85;
    ctx.lineWidth = 4 - i;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Spark dots
  const sparks = 12;
  for (let i = 0; i < sparks; i++) {
    const a = (i / sparks) * Math.PI * 2 + t * 1.2;
    const dist = radius * (0.25 + ease * 0.9);
    const sx = c.x + Math.cos(a) * dist;
    const sy = c.y + Math.sin(a) * dist;
    const size = 3 + pulse * 4;
    ctx.fillStyle = i % 2 === 0 ? p.hot : p.accent;
    ctx.globalAlpha = (1 - ease) * 0.95;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawCubeOrbitButtons(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cubeScale: number,
  canvasW = 720,
  canvasH = 1280,
): {
  left: { x: number; y: number; w: number; h: number };
  right: { x: number; y: number; w: number; h: number };
  up: { x: number; y: number; w: number; h: number };
  down: { x: number; y: number; w: number; h: number };
} {
  const pal = getPalette();
  const half = cubeScale * 1.42;
  const gap = 12;
  const sideW = 34;
  const sideH = 54;
  const endW = 64;
  const endH = 44;
  const edge = 14;
  const hitPadX = 14;
  const hitPadY = 18;

  const left = {
    x: Math.max(edge, cx - half - gap - sideW),
    y: cy - sideH / 2,
    w: sideW,
    h: sideH,
  };
  const right = {
    x: Math.min(canvasW - edge - sideW, cx + half + gap),
    y: cy - sideH / 2,
    w: sideW,
    h: sideH,
  };
  const up = {
    x: cx - endW / 2,
    y: Math.max(edge, cy - half - gap - endH),
    w: endW,
    h: endH,
  };
  const down = {
    x: cx - endW / 2,
    y: Math.min(canvasH - edge - endH, cy + half + gap),
    w: endW,
    h: endH,
  };
  const draw = (r: typeof left, label: string) => {
    const art = getThemeArt(getTheme());
    const btn = art.btn;
    ctx.beginPath();
    const rr = 7;
    ctx.moveTo(r.x + rr, r.y);
    ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rr);
    ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rr);
    ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rr);
    ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rr);
    ctx.closePath();
    if (btn && btn.complete && btn.naturalWidth > 0) {
      ctx.save();
      ctx.clip();
      drawCover(ctx, btn, r.x, r.y, r.w, r.h);
      ctx.restore();
    } else {
      ctx.fillStyle = pal.panel;
      ctx.fill();
    }
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x + rr, r.y);
    ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rr);
    ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rr);
    ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rr);
    ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rr);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.font = "800 18px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  };
  draw(left, "\u2039");
  draw(right, "\u203A");
  draw(up, "\u02C4");
  draw(down, "\u02C5");
  return {
    left: {
      x: left.x - hitPadX,
      y: left.y - hitPadY,
      w: left.w + hitPadX * 2,
      h: left.h + hitPadY * 2,
    },
    right: {
      x: right.x - hitPadX,
      y: right.y - hitPadY,
      w: right.w + hitPadX * 2,
      h: right.h + hitPadY * 2,
    },
    up: {
      x: up.x - hitPadX,
      y: up.y - hitPadY,
      w: up.w + hitPadX * 2,
      h: up.h + hitPadY * 2,
    },
    down: {
      x: down.x - hitPadX,
      y: down.y - hitPadY,
      w: down.w + hitPadX * 2,
      h: down.h + hitPadY * 2,
    },
  };
}

export function hitOrbitButton(
  btns: ReturnType<typeof drawCubeOrbitButtons>,
  x: number,
  y: number,
): "left" | "right" | "up" | "down" | null {
  const hit = (r: { x: number; y: number; w: number; h: number }) =>
    x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  if (hit(btns.left)) return "left";
  if (hit(btns.right)) return "right";
  if (hit(btns.up)) return "up";
  if (hit(btns.down)) return "down";
  return null;
}
