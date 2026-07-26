import { cloneBoard, type Board } from "./board";
import type { Twist, TileKind } from "./types";
import type { CubeFaces, FaceId } from "./session";

type CellRef = { f: FaceId; r: number; c: number };

function cloneFaces(faces: CubeFaces): CubeFaces {
  return faces.map((b) => cloneBoard(b)) as CubeFaces;
}

function read(faces: CubeFaces, ref: CellRef): TileKind | null {
  return faces[ref.f]![ref.r]![ref.c] ?? null;
}

function write(faces: CubeFaces, ref: CellRef, kind: TileKind | null): void {
  faces[ref.f]![ref.r]![ref.c] = kind;
}

/**
 * 4n-cell belt for a slice on the active face.
 * Positive shift moves content toward +U (rows) or +V (cols) on the active face.
 */
export function sliceBelt(
  active: FaceId,
  axis: "row" | "col",
  index: number,
  n: number,
): CellRef[] {
  const belt: CellRef[] = [];
  const add = (f: FaceId, r: number, c: number) => belt.push({ f, r, c });

  if (axis === "row") {
    const r = index;
    // Vertical faces share the same row index around the Y axis.
    const ring: FaceId[] =
      active === 0
        ? [0, 2, 1, 3] // F R B L
        : active === 1
          ? [1, 3, 0, 2] // B L F R
          : active === 2
            ? [2, 1, 3, 0] // R B L F
            : active === 3
              ? [3, 0, 2, 1] // L F R B
              : active === 4
                ? [4, 2, 5, 3] // U R D L — special indexing below
                : [5, 2, 4, 3]; // D R U L

    if (active <= 3) {
      for (const f of ring) {
        for (let c = 0; c < n; c++) add(f, r, c);
      }
      return belt;
    }

    // Top / Bottom: row runs left→right; continue onto side faces' matching strip
    if (active === 4) {
      for (let c = 0; c < n; c++) add(4, r, c);
      for (let rr = 0; rr < n; rr++) add(2, rr, n - 1 - r);
      for (let c = n - 1; c >= 0; c--) add(5, r, c);
      for (let rr = n - 1; rr >= 0; rr--) add(3, rr, r);
      return belt;
    }
    // Bottom
    for (let c = 0; c < n; c++) add(5, r, c);
    for (let rr = 0; rr < n; rr++) add(2, rr, r);
    for (let c = n - 1; c >= 0; c--) add(4, r, c);
    for (let rr = n - 1; rr >= 0; rr--) add(3, rr, n - 1 - r);
    return belt;
  }

  // Columns
  const c = index;
  if (active === 0) {
    // Front ↓ Bottom ↓ Back↑ mirrored ↓ Top→
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
    // Right column c: down R → across Bottom (right→left at depth c) → up L → across Top (left→right)
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
  // Bottom
  for (let r = 0; r < n; r++) add(5, r, c);
  for (let r = n - 1; r >= 0; r--) add(1, r, n - 1 - c);
  for (let r = n - 1; r >= 0; r--) add(4, r, c);
  for (let r = 0; r < n; r++) add(0, r, c);
  return belt;
}

export function shiftKinds<T>(kinds: T[], shift: number): T[] {
  const len = kinds.length;
  const s = ((Math.trunc(shift) % len) + len) % len;
  if (s === 0) return kinds.slice();
  return Array.from({ length: len }, (_, i) => kinds[(i - s + len) % len]!);
}

export function twistCubeFaces(
  faces: CubeFaces,
  active: FaceId,
  twist: Twist,
): CubeFaces {
  const n = faces[0]!.length;
  const belt = sliceBelt(active, twist.axis, twist.index, n);
  const amount = Math.max(1, twist.amount ?? 1);
  const kinds = shiftKinds(
    belt.map((ref) => read(faces, ref)),
    twist.dir * amount,
  );
  const next = cloneFaces(faces);
  for (let i = 0; i < belt.length; i++) write(next, belt[i]!, kinds[i]!);
  return next;
}

/** Active-face lane preview while dragging. `pos` in cell units (0..n = face). */
export function lanePreview(
  faces: CubeFaces,
  active: FaceId,
  axis: "row" | "col",
  index: number,
  offsetUv: number,
): { pos: number; kind: TileKind }[] {
  const n = faces[0]!.length;
  const belt = sliceBelt(active, axis, index, n);
  const kinds = belt.map((ref) => read(faces, ref));
  const len = kinds.length;
  const shift = offsetUv * n;
  const out: { pos: number; kind: TileKind }[] = [];

  for (let k = 0; k < len; k++) {
    const kind = kinds[k];
    if (!kind) continue;
    let center = k + 0.5 + shift;
    const candidates = [center, center - len, center + len, center - 2 * len, center + 2 * len];
    let best = center;
    let bestScore = Infinity;
    for (const p of candidates) {
      // Prefer positions near the visible face window [0, n]
      const score = p < 0 ? -p * 2 : p > n ? (p - n) * 2 : Math.abs(p - n / 2) * 0.01;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (best < -1.2 || best > n + 1.2) continue;
    out.push({ pos: best, kind });
  }
  return out;
}

export function cloneCubeFaces(faces: CubeFaces): CubeFaces {
  return cloneFaces(faces);
}

export type { Board };
