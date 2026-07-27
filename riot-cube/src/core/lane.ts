import {
  type ColorId,
  type CubeState,
  type FaceId,
  cloneCube,
  faceTurn,
  F,
  B,
  R,
  L,
  U,
  D,
} from "./rubik";

export type LaneAxis = "row" | "col";
export type LaneTwist = {
  axis: LaneAxis;
  index: number;
  dir: 1 | -1;
  amount?: number;
};

type CellRef = { f: FaceId; r: number; c: number };

/**
 * 4n-cell belt for a slice on the active (viewing) face.
 * Same geometry as the original Riot Cube twist belts.
 */
export function sliceBelt(
  active: FaceId,
  axis: LaneAxis,
  index: number,
  n: number,
): CellRef[] {
  const belt: CellRef[] = [];
  const add = (f: FaceId, r: number, c: number) => belt.push({ f, r, c });

  if (axis === "row") {
    const r = index;
    const ring: FaceId[] =
      active === 0
        ? [0, 2, 1, 3]
        : active === 1
          ? [1, 3, 0, 2]
          : active === 2
            ? [2, 1, 3, 0]
            : active === 3
              ? [3, 0, 2, 1]
              : active === 4
                ? [4, 2, 5, 3]
                : [5, 2, 4, 3];

    if (active <= 3) {
      for (const f of ring) {
        for (let c = 0; c < n; c++) add(f, r, c);
      }
      return belt;
    }

    if (active === 4) {
      for (let c = 0; c < n; c++) add(4, r, c);
      for (let rr = 0; rr < n; rr++) add(2, rr, n - 1 - r);
      for (let c = n - 1; c >= 0; c--) add(5, r, c);
      for (let rr = n - 1; rr >= 0; rr--) add(3, rr, r);
      return belt;
    }
    for (let c = 0; c < n; c++) add(5, r, c);
    for (let rr = 0; rr < n; rr++) add(2, rr, r);
    for (let c = n - 1; c >= 0; c--) add(4, r, c);
    for (let rr = n - 1; rr >= 0; rr--) add(3, rr, n - 1 - r);
    return belt;
  }

  const c = index;
  if (active === 0) {
    for (let r = 0; r < n; r++) add(0, r, c);
    for (let r = 0; r < n; r++) add(5, r, c);
    for (let r = n - 1; r >= 0; r--) add(1, r, n - 1 - c);
    for (let r = 0; r < n; r++) add(4, r, c);
    return belt;
  }
  if (active === 1) {
    for (let r = 0; r < n; r++) add(1, r, c);
    for (let r = n - 1; r >= 0; r--) add(5, r, n - 1 - c);
    for (let r = n - 1; r >= 0; r--) add(0, r, n - 1 - c);
    for (let r = n - 1; r >= 0; r--) add(4, r, n - 1 - c);
    return belt;
  }
  if (active === 2) {
    for (let r = 0; r < n; r++) add(2, r, c);
    for (let cc = n - 1; cc >= 0; cc--) add(5, c, cc);
    for (let r = n - 1; r >= 0; r--) add(3, r, n - 1 - c);
    for (let v = 0; v < n; v++) add(4, v, n - 1);
    return belt;
  }
  if (active === 3) {
    for (let r = 0; r < n; r++) add(3, r, c);
    for (let cc = 0; cc < n; cc++) add(5, n - 1 - c, cc);
    for (let r = n - 1; r >= 0; r--) add(2, r, n - 1 - c);
    for (let v = n - 1; v >= 0; v--) add(4, v, 0);
    return belt;
  }
  if (active === 4) {
    for (let r = 0; r < n; r++) add(4, r, c);
    for (let r = 0; r < n; r++) add(0, r, c);
    for (let r = 0; r < n; r++) add(5, r, c);
    for (let r = n - 1; r >= 0; r--) add(1, r, n - 1 - c);
    return belt;
  }
  for (let r = 0; r < n; r++) add(5, r, c);
  for (let r = n - 1; r >= 0; r--) add(1, r, n - 1 - c);
  for (let r = n - 1; r >= 0; r--) add(4, r, c);
  for (let r = 0; r < n; r++) add(0, r, c);
  return belt;
}

function shiftKinds<T>(kinds: T[], shift: number): T[] {
  const len = kinds.length;
  const s = ((Math.trunc(shift) % len) + len) % len;
  if (s === 0) return kinds.slice();
  return Array.from({ length: len }, (_, i) => kinds[(i - s + len) % len]!);
}

function read(cube: CubeState, ref: CellRef): ColorId {
  return cube.faces[ref.f]![ref.r]![ref.c]!;
}

function write(cube: CubeState, ref: CellRef, kind: ColorId): void {
  cube.faces[ref.f]![ref.r]![ref.c] = kind;
}

/** Belt-only twist (middle slices / preview commits). */
export function twistBelt(
  cube: CubeState,
  active: FaceId,
  twist: LaneTwist,
): CubeState {
  const n = cube.size;
  const belt = sliceBelt(active, twist.axis, twist.index, n);
  const amount = Math.max(1, twist.amount ?? 1);
  const kinds = shiftKinds(
    belt.map((ref) => read(cube, ref)),
    twist.dir * amount,
  );
  const next = cloneCube(cube);
  for (let i = 0; i < belt.length; i++) write(next, belt[i]!, kinds[i]!);
  return next;
}

/**
 * Map a lane on the viewing face to a real Rubik face turn when the lane is
 * an outer layer. Middle layers use a belt slice.
 */
export function applyLaneTwist(
  cube: CubeState,
  view: FaceId,
  twist: LaneTwist,
): CubeState {
  const n = cube.size;
  const amount = Math.max(1, twist.amount ?? 1);
  let c = cube;
  for (let i = 0; i < amount; i++) {
    const move = mapOuterLane(view, twist.axis, twist.index, n, twist.dir);
    if (move) {
      c = faceTurn(c, move.face, move.dir);
    } else {
      c = twistBelt(c, view, { ...twist, amount: 1 });
    }
  }
  return c;
}

function mapOuterLane(
  view: FaceId,
  axis: LaneAxis,
  index: number,
  n: number,
  dir: 1 | -1,
): { face: FaceId; dir: 1 | -1 } | null {
  const last = n - 1;
  const mid = n > 2 && index > 0 && index < last;
  if (mid) return null;

  // For each viewing face: which Rubik face the outer strip belongs to,
  // and whether lane +dir matches that face's CW.
  type M = { face: FaceId; flip: boolean };
  let top: M, bot: M, left: M, right: M;
  switch (view) {
    case F:
      top = { face: U, flip: false };
      bot = { face: D, flip: true };
      left = { face: L, flip: false };
      right = { face: R, flip: true };
      break;
    case B:
      top = { face: U, flip: true };
      bot = { face: D, flip: false };
      left = { face: R, flip: false };
      right = { face: L, flip: true };
      break;
    case R:
      top = { face: U, flip: false };
      bot = { face: D, flip: true };
      left = { face: F, flip: false };
      right = { face: B, flip: true };
      break;
    case L:
      top = { face: U, flip: true };
      bot = { face: D, flip: false };
      left = { face: B, flip: false };
      right = { face: F, flip: true };
      break;
    case U:
      top = { face: B, flip: false };
      bot = { face: F, flip: false };
      left = { face: L, flip: false };
      right = { face: R, flip: false };
      break;
    default: // D
      top = { face: F, flip: false };
      bot = { face: B, flip: false };
      left = { face: L, flip: false };
      right = { face: R, flip: false };
      break;
  }

  let m: M;
  if (axis === "row") m = index === 0 ? top : bot;
  else m = index === 0 ? left : right;
  const d = (m.flip ? -dir : dir) as 1 | -1;
  return { face: m.face, dir: d };
}

/** Active-face lane preview while dragging. */
export function lanePreview(
  cube: CubeState,
  active: FaceId,
  axis: LaneAxis,
  index: number,
  offsetUv: number,
): { pos: number; color: ColorId }[] {
  const n = cube.size;
  const belt = sliceBelt(active, axis, index, n);
  const kinds = belt.map((ref) => read(cube, ref));
  const len = kinds.length;
  const shift = offsetUv * n;
  const out: { pos: number; color: ColorId }[] = [];

  for (let k = 0; k < len; k++) {
    const color = kinds[k]!;
    let center = k + 0.5 + shift;
    const candidates = [
      center,
      center - len,
      center + len,
      center - 2 * len,
      center + 2 * len,
    ];
    let best = center;
    let bestScore = Infinity;
    for (const p of candidates) {
      const score =
        p < 0 ? -p * 2 : p > n ? (p - n) * 2 : Math.abs(p - n / 2) * 0.01;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (best < -1.2 || best > n + 1.2) continue;
    out.push({ pos: best, color });
  }
  return out;
}

/** Neighbor-face integer preview while dragging. */
export function previewCube(
  cube: CubeState,
  active: FaceId,
  axis: LaneAxis,
  index: number,
  offsetUv: number,
): CubeState {
  const n = cube.size;
  const belt = sliceBelt(active, axis, index, n);
  const kinds = belt.map((ref) => read(cube, ref));
  const shift = Math.round(offsetUv * n);
  if (shift === 0) return cube;
  const shifted = shiftKinds(kinds, shift);
  const next = cloneCube(cube);
  for (let i = 0; i < belt.length; i++) write(next, belt[i]!, shifted[i]!);
  return next;
}
