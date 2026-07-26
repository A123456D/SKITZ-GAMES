import type { Board } from "../core/board";
import { lanePreview } from "../core/cubeTwist";
import type { CubeFaces, FaceId } from "../core/session";
import type { TileKind } from "../core/types";
import { drawCrumpledSticker } from "./crumple";
import { drawStickerSprite } from "./draw";

export type Vec3 = { x: number; y: number; z: number };
export type Vec2 = { x: number; y: number };

export type { FaceId };
export const FACE_NAMES = ["FRONT", "BACK", "RIGHT", "LEFT", "TOP", "BOTTOM"] as const;

type FaceGeom = {
  /** TL, TR, BR, BL in cube space (half-extent 1). U increases right, V down. */
  corners: [Vec3, Vec3, Vec3, Vec3];
  normal: Vec3;
};

const FACES: FaceGeom[] = [
  { // 0 Front +Z
    corners: [
      { x: -1, y: -1, z: 1 },
      { x: 1, y: -1, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: -1, y: 1, z: 1 },
    ],
    normal: { x: 0, y: 0, z: 1 },
  },
  { // 1 Back -Z
    corners: [
      { x: 1, y: -1, z: -1 },
      { x: -1, y: -1, z: -1 },
      { x: -1, y: 1, z: -1 },
      { x: 1, y: 1, z: -1 },
    ],
    normal: { x: 0, y: 0, z: -1 },
  },
  { // 2 Right +X
    corners: [
      { x: 1, y: -1, z: 1 },
      { x: 1, y: -1, z: -1 },
      { x: 1, y: 1, z: -1 },
      { x: 1, y: 1, z: 1 },
    ],
    normal: { x: 1, y: 0, z: 0 },
  },
  { // 3 Left -X
    corners: [
      { x: -1, y: -1, z: -1 },
      { x: -1, y: -1, z: 1 },
      { x: -1, y: 1, z: 1 },
      { x: -1, y: 1, z: -1 },
    ],
    normal: { x: -1, y: 0, z: 0 },
  },
  { // 4 Top +Y (y up in 3D, but V down on stickers)
    corners: [
      { x: -1, y: -1, z: -1 },
      { x: 1, y: -1, z: -1 },
      { x: 1, y: -1, z: 1 },
      { x: -1, y: -1, z: 1 },
    ],
    normal: { x: 0, y: -1, z: 0 },
  },
  { // 5 Bottom +Y down
    corners: [
      { x: -1, y: 1, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: 1, y: 1, z: -1 },
      { x: -1, y: 1, z: -1 },
    ],
    normal: { x: 0, y: 1, z: 0 },
  },
];

function rotX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
}

function rotY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
}

function applyRot(v: Vec3, rx: number, ry: number): Vec3 {
  return rotY(rotX(v, rx), ry);
}

function project(v: Vec3, scale: number): Vec2 {
  // +Z toward the camera. Near faces (larger z) must appear bigger.
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

export type CubeMotion = {
  axis: "row" | "col" | null;
  index: number;
  offset: number;
  hovering: boolean;
};

export type CrumpleDraw = {
  r: number;
  c: number;
  kind: TileKind;
  seed: number;
  t: number;
};

export type CubeLayout = {
  cx: number;
  cy: number;
  scale: number;
  rotX: number;
  rotY: number;
};

/** Which face normal points most toward the camera (+Z after rotation). */
export function facingFace(rotX: number, rotY: number): FaceId {
  let best: FaceId = 0;
  let bestZ = -Infinity;
  for (let i = 0; i < 6; i++) {
    const n = applyRot(FACES[i]!.normal, rotX, rotY);
    if (n.z > bestZ) {
      bestZ = n.z;
      best = i as FaceId;
    }
  }
  return best;
}

/** How head-on the facing face is (1 = dead-on, ~0 = edge-on). */
export function facingFaceDot(rotX: number, rotY: number): number {
  const face = facingFace(rotX, rotY);
  return applyRot(FACES[face]!.normal, rotX, rotY).z;
}

export function frontFaceScreenQuad(
  layout: CubeLayout,
): { tl: Vec2; tr: Vec2; br: Vec2; bl: Vec2; face: FaceId } | null {
  const face = facingFace(layout.rotX, layout.rotY);
  const geom = FACES[face]!;
  const n = applyRot(geom.normal, layout.rotX, layout.rotY);
  if (n.z < 0.35) return null;
  const pts = geom.corners.map((c) => {
    const w = applyRot(c, layout.rotX, layout.rotY);
    const p = project(w, layout.scale);
    return { x: layout.cx + p.x, y: layout.cy + p.y };
  });
  return { tl: pts[0]!, tr: pts[1]!, br: pts[2]!, bl: pts[3]!, face };
}

/** Map screen point to face UV (0..1). null if outside front face. */
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

/** Convert a screen-space drag delta into face UV delta (works outside the face). */
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
    // tl(0,0) tr(1,0) br(1,1)
    const u = a.w2 * 1 + a.w3 * 1;
    const v = a.w3 * 1;
    return { u, v };
  }
  const b = bary(px, py, tl, br, bl);
  if (b) {
    // tl(0,0) br(1,1) bl(0,1)
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

export function drawCube3D(
  ctx: CanvasRenderingContext2D,
  layout: CubeLayout,
  faces: Board[],
  opts: {
    activeFace: FaceId;
    motion: CubeMotion;
    crumples: CrumpleDraw[];
    paper?: boolean;
    /** Unshifted faces for lane peeks (defaults to `faces`). */
    sourceFaces?: Board[];
  },
): void {
  type FaceDraw = { i: FaceId; depth: number; nZ: number };
  const order: FaceDraw[] = [];
  for (let i = 0; i < 6; i++) {
    const n = applyRot(FACES[i]!.normal, layout.rotX, layout.rotY);
    if (n.z <= 0.02) continue;
    const center = applyRot(
      {
        x: FACES[i]!.normal.x,
        y: FACES[i]!.normal.y,
        z: FACES[i]!.normal.z,
      },
      layout.rotX,
      layout.rotY,
    );
    order.push({ i: i as FaceId, depth: center.z, nZ: n.z });
  }
  order.sort((a, b) => a.depth - b.depth); // far (small z) first

  for (const f of order) {
    drawFace(ctx, layout, f.i, faces, opts, f.i === opts.activeFace);
  }
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  layout: CubeLayout,
  faceIndex: FaceId,
  faces: Board[],
  opts: {
    activeFace: FaceId;
    motion: CubeMotion;
    crumples: CrumpleDraw[];
    paper?: boolean;
    sourceFaces?: Board[];
  },
  isActive: boolean,
): void {
  const geom = FACES[faceIndex]!;
  const board = faces[faceIndex]!;
  const source = (opts.sourceFaces ?? faces) as CubeFaces;
  const n = board.length;
  const crumpleMap = new Map(
    opts.crumples.filter(() => isActive).map((c) => [`${c.r},${c.c}`, c] as const),
  );

  // Paper face backing
  const q = geom.corners.map((c) => {
    const w = applyRot(c, layout.rotX, layout.rotY);
    const p = project(w, layout.scale);
    return { x: layout.cx + p.x, y: layout.cy + p.y };
  });
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(q[0]!.x, q[0]!.y);
  ctx.lineTo(q[1]!.x, q[1]!.y);
  ctx.lineTo(q[2]!.x, q[2]!.y);
  ctx.lineTo(q[3]!.x, q[3]!.y);
  ctx.closePath();
  ctx.fillStyle = isActive ? "#f4eee0" : "#e5dcc8";
  ctx.fill();
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = isActive ? 4 : 2.5;
  ctx.stroke();

  paintPaperTexture(ctx, q, faceIndex, isActive);

  const gap = 0.04;
  const stride = 1 / n;
  const cell = (1 - gap * (n - 1)) / n;
  const pad = (stride - cell) / 2;
  const movingRow =
    isActive && opts.motion.hovering && opts.motion.axis === "row"
      ? opts.motion.index
      : -1;
  const movingCol =
    isActive && opts.motion.hovering && opts.motion.axis === "col"
      ? opts.motion.index
      : -1;
  const hoverT = performance.now() / 1000;
  const liftPulse =
    movingRow >= 0 || movingCol >= 0
      ? 0.038 + 0.01 * Math.sin(hoverT * 3.4)
      : 0;
  const liftAmt = liftPulse;

  const paintSticker = (
    kind: TileKind,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    hovering: boolean,
    crumple?: CrumpleDraw,
  ) => {
    if (u1 <= 0 || u0 >= 1 || v1 <= 0 || v0 >= 1) return;
    const s0 = facePointLifted(geom, u0, v0, hovering ? liftAmt : 0, layout);
    const s1 = facePointLifted(geom, u1, v0, hovering ? liftAmt : 0, layout);
    const s2 = facePointLifted(geom, u1, v1, hovering ? liftAmt : 0, layout);
    const s3 = facePointLifted(geom, u0, v1, hovering ? liftAmt : 0, layout);
    if (crumple) {
      const bx = Math.min(s0.x, s1.x, s2.x, s3.x);
      const by = Math.min(s0.y, s1.y, s2.y, s3.y);
      const bw = Math.max(s0.x, s1.x, s2.x, s3.x) - bx;
      const bh = Math.max(s0.y, s1.y, s2.y, s3.y) - by;
      drawCrumpledSticker(
        ctx,
        crumple.kind,
        bx,
        by,
        Math.min(bw, bh),
        crumple.t,
        crumple.seed,
      );
      return;
    }
    drawStickerOnQuad(ctx, kind, s0, s1, s2, s3, q, hovering, hoverT);
  };

  // Stationary stickers (skip the sliding strip — drawn next)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (r === movingRow || c === movingCol) continue;
      const crumple = crumpleMap.get(`${r},${c}`);
      const kind = crumple?.kind ?? board[r]![c];
      if (!kind) continue;
      paintSticker(
        kind,
        c * stride + pad,
        r * stride + pad,
        c * stride + pad + cell,
        r * stride + pad + cell,
        false,
        crumple,
      );
    }
  }

  // Sliding strip from the real adjacent-face belt (not within-face wrap)
  if (movingRow >= 0) {
    const r = movingRow;
    const items = lanePreview(
      source,
      faceIndex,
      "row",
      r,
      opts.motion.offset,
    );
    for (const { pos, kind } of items) {
      const crumple =
        pos >= 0 && pos < n ? crumpleMap.get(`${r},${Math.floor(pos)}`) : undefined;
      const u0 = (pos - 0.5) * stride + pad;
      const u1 = u0 + cell;
      const v0 = r * stride + pad;
      const v1 = v0 + cell;
      paintSticker(crumple?.kind ?? kind, u0, v0, u1, v1, true, crumple);
    }
  } else if (movingCol >= 0) {
    const c = movingCol;
    const items = lanePreview(
      source,
      faceIndex,
      "col",
      c,
      opts.motion.offset,
    );
    for (const { pos, kind } of items) {
      const crumple =
        pos >= 0 && pos < n ? crumpleMap.get(`${Math.floor(pos)},${c}`) : undefined;
      const u0 = c * stride + pad;
      const u1 = u0 + cell;
      const v0 = (pos - 0.5) * stride + pad;
      const v1 = v0 + cell;
      paintSticker(crumple?.kind ?? kind, u0, v0, u1, v1, true, crumple);
    }
  }
  ctx.restore();
}

function facePointLifted(
  geom: FaceGeom,
  u: number,
  v: number,
  lift: number,
  layout: CubeLayout,
): Vec2 {
  const local = facePoint(geom, u, v);
  // Lift along face normal so stickers hover off the paper in 3D
  const lifted: Vec3 = {
    x: local.x + geom.normal.x * lift,
    y: local.y + geom.normal.y * lift,
    z: local.z + geom.normal.z * lift,
  };
  const w = applyRot(lifted, layout.rotX, layout.rotY);
  const p = project(w, layout.scale);
  return { x: layout.cx + p.x, y: layout.cy + p.y };
}

function lerp2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Soft lined paper + fold creases + light grain, clipped to the face quad. */
function paintPaperTexture(
  ctx: CanvasRenderingContext2D,
  q: Vec2[],
  faceIndex: number,
  isActive: boolean,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(q[0]!.x, q[0]!.y);
  ctx.lineTo(q[1]!.x, q[1]!.y);
  ctx.lineTo(q[2]!.x, q[2]!.y);
  ctx.lineTo(q[3]!.x, q[3]!.y);
  ctx.closePath();
  ctx.clip();

  // Ruled lines
  ctx.strokeStyle = isActive ? "rgba(80,140,200,0.18)" : "rgba(80,140,200,0.12)";
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

  // Fold banding — soft shade bands that read as paper bent at creases
  const bands = [
    { t: 0.22, w: 0.07, a: 0.07 },
    { t: 0.55, w: 0.05, a: 0.055 },
    { t: 0.78, w: 0.06, a: 0.06 },
  ];
  for (const band of bands) {
    const a0 = lerp2(q[0]!, q[3]!, band.t - band.w);
    const b0 = lerp2(q[1]!, q[2]!, band.t - band.w);
    const a1 = lerp2(q[0]!, q[3]!, band.t + band.w);
    const b1 = lerp2(q[1]!, q[2]!, band.t + band.w);
    const g = ctx.createLinearGradient(a0.x, a0.y, a1.x, a1.y);
    g.addColorStop(0, "rgba(90,70,40,0)");
    g.addColorStop(0.45, `rgba(70,52,28,${band.a})`);
    g.addColorStop(0.55, `rgba(255,250,235,${band.a * 0.55})`);
    g.addColorStop(1, "rgba(90,70,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(a0.x, a0.y);
    ctx.lineTo(b0.x, b0.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(a1.x, a1.y);
    ctx.closePath();
    ctx.fill();
  }

  // Crease strokes — slightly bent fold lines
  const creases: Array<[number, number, number, number, number]> = [
    [0.08, 0.12, 0.92, 0.38, 0.14],
    [0.15, 0.72, 0.88, 0.55, 0.11],
    [0.35, 0.05, 0.62, 0.95, 0.1],
    [0.05, 0.48, 0.95, 0.62, 0.09],
  ];
  for (const [u0, v0, u1, v1, alpha] of creases) {
    const p0 = bilerp(q, u0, v0);
    const p1 = bilerp(q, u1, v1);
    const mid = bilerp(q, (u0 + u1) * 0.5 + 0.04 * ((faceIndex % 3) - 1), (v0 + v1) * 0.5);
    ctx.strokeStyle = `rgba(60,45,25,${isActive ? alpha : alpha * 0.7})`;
    ctx.lineWidth = isActive ? 1.35 : 1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(mid.x, mid.y, p1.x, p1.y);
    ctx.stroke();
    // Highlight twin for paper-fold sheen
    ctx.strokeStyle = `rgba(255,252,240,${isActive ? alpha * 0.55 : alpha * 0.35})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(p0.x + 1.2, p0.y + 1.2);
    ctx.quadraticCurveTo(mid.x + 1, mid.y + 1, p1.x + 1.2, p1.y + 1.2);
    ctx.stroke();
  }

  // Deterministic paper grain (no Math.random flicker)
  let seed = (faceIndex + 1) * 9973;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  ctx.fillStyle = isActive ? "rgba(40,30,18,0.045)" : "rgba(40,30,18,0.03)";
  for (let i = 0; i < 90; i++) {
    const u = next();
    const v = next();
    const p = bilerp(q, u, v);
    const r = 0.6 + next() * 1.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function bilerp(q: Vec2[], u: number, v: number): Vec2 {
  const a = lerp2(q[0]!, q[1]!, u);
  const b = lerp2(q[3]!, q[2]!, u);
  return lerp2(a, b, v);
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
  hoverT = 0,
): void {
  const cx = (tl.x + tr.x + br.x + bl.x) / 4;
  const cy = (tl.y + tr.y + br.y + bl.y) / 4;
  const bw =
    (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) /
    2;
  const bh =
    (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) /
    2;
  const phase = hoverT * 4.2 + cx * 0.02 + cy * 0.015;
  const bob = hovering ? Math.sin(phase) * 2.4 : 0;
  const wobble = hovering ? Math.sin(phase * 0.85 + 0.6) * 0.045 : 0;
  const breathe = hovering ? 1.04 + Math.sin(phase * 0.7) * 0.025 : 1;
  const s = Math.min(bw, bh) * breathe;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(faceQuad[0]!.x, faceQuad[0]!.y);
  ctx.lineTo(faceQuad[1]!.x, faceQuad[1]!.y);
  ctx.lineTo(faceQuad[2]!.x, faceQuad[2]!.y);
  ctx.lineTo(faceQuad[3]!.x, faceQuad[3]!.y);
  ctx.closePath();
  ctx.clip();

  ctx.translate(cx, cy + bob);
  ctx.rotate(wobble);
  ctx.translate(-cx, -cy - bob);

  // Sprite at the projected cell center — stable for wrap peeks (affine on
  // off-face UV quads was distorting "some" edge stickers into the wrong look).
  drawStickerSprite(ctx, kind, cx - s / 2, cy - s / 2 + bob, s, 1, hovering ? 4 + bob : 0);
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
  // Front face projects larger than `cubeScale` under perspective.
  const half = cubeScale * 1.42;
  const gap = 22;
  const sideW = 50;
  const sideH = 86;
  const endW = 86;
  const endH = 50;
  const edge = 14;

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
    ctx.fillStyle = "#111";
    ctx.beginPath();
    const rr = 10;
    ctx.moveTo(r.x + rr, r.y);
    ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rr);
    ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rr);
    ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rr);
    ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rr);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c8ff3d";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#c8ff3d";
    ctx.font = "800 26px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  };
  draw(left, "‹");
  draw(right, "›");
  draw(up, "˄");
  draw(down, "˅");
  return { left, right, up, down };
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
