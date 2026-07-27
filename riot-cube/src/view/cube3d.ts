import type { ColorId, CubeState, FaceId } from "../core/rubik";
import { getPalette } from "./theme";

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
  rotX: number;
  rotY: number;
};

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

export function facingFaceDot(rotX: number, rotY: number): number {
  const face = facingFace(rotX, rotY);
  return applyRot(FACES[face]!.normal, rotX, rotY).z;
}

/**
 * Which cube face points most toward a screen direction
 * (left/right/up/down in canvas space, +Y down).
 */
export function faceTowardScreenDir(
  rotX: number,
  rotY: number,
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
    const n = applyRot(FACES[i]!.normal, rotX, rotY);
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

function facePointScreen(
  geom: FaceGeom,
  u: number,
  v: number,
  layout: CubeLayout,
): Vec2 {
  const local = facePoint(geom, u, v);
  const w = applyRot(local, layout.rotX, layout.rotY);
  const p = project(w, layout.scale);
  return { x: layout.cx + p.x, y: layout.cy + p.y };
}

export function drawCube3D(
  ctx: CanvasRenderingContext2D,
  layout: CubeLayout,
  cube: CubeState,
  opts: { activeFace: FaceId },
): void {
  type FaceDraw = { i: FaceId; depth: number };
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
    order.push({ i: i as FaceId, depth: center.z });
  }
  order.sort((a, b) => a.depth - b.depth);

  for (const f of order) {
    drawFace(ctx, layout, f.i, cube, f.i === opts.activeFace);
  }
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  layout: CubeLayout,
  faceIndex: FaceId,
  cube: CubeState,
  isActive: boolean,
): void {
  const p = getPalette();
  const geom = FACES[faceIndex]!;
  const board = cube.faces[faceIndex]!;
  const n = cube.size;

  const q = geom.corners.map((c) => {
    const w = applyRot(c, layout.rotX, layout.rotY);
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
  ctx.fillStyle = p.ink;
  ctx.fill();
  ctx.strokeStyle = isActive ? p.accent : p.faceStroke;
  ctx.lineWidth = isActive ? 4 : 2.5;
  ctx.stroke();

  const gap = 0.06;
  const stride = 1 / n;
  const cell = (1 - gap * (n - 1)) / n;
  const pad = (stride - cell) / 2;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const colorId = board[r]![c] as ColorId;
      const u0 = c * stride + pad;
      const v0 = r * stride + pad;
      const u1 = u0 + cell;
      const v1 = v0 + cell;
      const s0 = facePointScreen(geom, u0, v0, layout);
      const s1 = facePointScreen(geom, u1, v0, layout);
      const s2 = facePointScreen(geom, u1, v1, layout);
      const s3 = facePointScreen(geom, u0, v1, layout);
      ctx.beginPath();
      ctx.moveTo(s0.x, s0.y);
      ctx.lineTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.lineTo(s3.x, s3.y);
      ctx.closePath();
      ctx.fillStyle = p.faceColors[colorId]!;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
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
    ctx.fillStyle = pal.panel;
    ctx.beginPath();
    const rr = 7;
    ctx.moveTo(r.x + rr, r.y);
    ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rr);
    ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rr);
    ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rr);
    ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rr);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2;
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
