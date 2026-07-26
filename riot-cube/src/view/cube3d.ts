import type { Board } from "../core/board";
import type { FaceId } from "../core/session";
import type { TileKind } from "../core/types";
import { drawCrumpledSticker } from "./crumple";
import { drawStickerSprite } from "./draw";
import { stickerImage } from "./stickers";

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
    drawFace(ctx, layout, f.i, faces[f.i]!, opts, f.i === opts.activeFace);
  }
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  layout: CubeLayout,
  faceIndex: FaceId,
  board: Board,
  opts: {
    activeFace: FaceId;
    motion: CubeMotion;
    crumples: CrumpleDraw[];
    paper?: boolean;
  },
  isActive: boolean,
): void {
  const geom = FACES[faceIndex]!;
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

  // Lined paper hint
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(80,140,200,0.2)";
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
  ctx.restore();

  const gap = 0.04;
  const stride = 1 / n;
  const cell = (1 - gap * (n - 1)) / n;
  const pad = (stride - cell) / 2;
  const activeLift =
    isActive && opts.motion.hovering && opts.motion.axis ? 0.045 : 0;

  const drawCell = (r: number, c: number, movingOnly: boolean) => {
    const moving = Boolean(
      isActive &&
        opts.motion.axis &&
        opts.motion.hovering &&
        ((opts.motion.axis === "row" && opts.motion.index === r) ||
          (opts.motion.axis === "col" && opts.motion.index === c)),
    );
    if (movingOnly !== moving) return;

    const crumple = isActive ? crumpleMap.get(`${r},${c}`) : undefined;
    const kind = crumple?.kind ?? board[r]![c];
    if (!kind) return;

    // Match the flat board: modulo-wrap into the face, plus ±1 copies so the
    // far-side stickers slide in continuously instead of leaving an empty gap.
    const copies = moving ? [-1, 0, 1] : [0];
    for (const copy of copies) {
      let u0: number;
      let v0: number;
      let u1: number;
      let v1: number;

      if (moving && opts.motion.axis === "row") {
        const uLeft =
          ((((c * stride + opts.motion.offset) % 1) + 1) % 1) + copy;
        u0 = uLeft + pad;
        u1 = u0 + cell;
        v0 = r * stride + pad;
        v1 = v0 + cell;
      } else if (moving && opts.motion.axis === "col") {
        const vTop =
          ((((r * stride + opts.motion.offset) % 1) + 1) % 1) + copy;
        u0 = c * stride + pad;
        u1 = u0 + cell;
        v0 = vTop + pad;
        v1 = v0 + cell;
      } else {
        u0 = c * stride + pad;
        u1 = u0 + cell;
        v0 = r * stride + pad;
        v1 = v0 + cell;
      }

      // Must overlap the paper face in UV
      if (u1 <= 0 || u0 >= 1 || v1 <= 0 || v0 >= 1) continue;

      const liftAmt = moving ? activeLift : 0;
      const s0 = facePointLifted(geom, u0, v0, liftAmt, layout);
      const s1 = facePointLifted(geom, u1, v0, liftAmt, layout);
      const s2 = facePointLifted(geom, u1, v1, liftAmt, layout);
      const s3 = facePointLifted(geom, u0, v1, liftAmt, layout);

      if (crumple && copy === 0) {
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
        continue;
      }
      if (crumple) continue;

      drawStickerOnQuad(ctx, kind, s0, s1, s2, s3, q, moving);
    }
  };

  // Stationary first, then the sliding strip so lift reads on top.
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) drawCell(r, c, false);
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) drawCell(r, c, true);
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

function drawStickerOnQuad(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  tl: Vec2,
  tr: Vec2,
  br: Vec2,
  bl: Vec2,
  faceQuad: Vec2[],
  hovering: boolean,
): void {
  const img = stickerImage(kind);
  const cx = (tl.x + tr.x + br.x + bl.x) / 4;
  const cy = (tl.y + tr.y + br.y + bl.y) / 4;
  const bw =
    (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) /
    2;
  const bh =
    (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) /
    2;
  const s = Math.min(bw, bh) * (hovering ? 1.02 : 1);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(faceQuad[0]!.x, faceQuad[0]!.y);
  ctx.lineTo(faceQuad[1]!.x, faceQuad[1]!.y);
  ctx.lineTo(faceQuad[2]!.x, faceQuad[2]!.y);
  ctx.lineTo(faceQuad[3]!.x, faceQuad[3]!.y);
  ctx.closePath();
  ctx.clip();

  // Affine-map the sticker onto the cell quad so edge peeks stay glued to the face
  // instead of floating as a screen-aligned square that misses the clip.
  const x0 = tl.x;
  const y0 = tl.y;
  const x1 = tr.x - tl.x;
  const y1 = tr.y - tl.y;
  const x2 = bl.x - tl.x;
  const y2 = bl.y - tl.y;

  if (hovering) {
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
  }

  if (img && Math.abs(x1 * y2 - y1 * x2) > 1e-3) {
    ctx.save();
    ctx.transform(x1, y1, x2, y2, x0, y0);
    ctx.drawImage(img, 0, 0, 1, 1);
    ctx.restore();
  } else {
    drawStickerSprite(ctx, kind, cx - s / 2, cy - s / 2, s, 1, hovering ? 3 : 0);
  }
  ctx.restore();
}

export function drawCubeOrbitButtons(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cubeScale: number,
): {
  left: { x: number; y: number; w: number; h: number };
  right: { x: number; y: number; w: number; h: number };
  up: { x: number; y: number; w: number; h: number };
  down: { x: number; y: number; w: number; h: number };
} {
  const left = { x: cx - cubeScale - 70, y: cy - 44, w: 48, h: 88 };
  const right = { x: cx + cubeScale + 22, y: cy - 44, w: 48, h: 88 };
  const up = { x: cx - 44, y: cy - cubeScale - 70, w: 88, h: 44 };
  const down = { x: cx - 44, y: cy + cubeScale + 22, w: 88, h: 44 };
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
