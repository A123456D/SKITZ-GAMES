/** Face indices: Front Back Right Left Up Down — match cube3d. */
export type FaceId = 0 | 1 | 2 | 3 | 4 | 5;
export const FACE_COUNT = 6;
export const F = 0;
export const B = 1;
export const R = 2;
export const L = 3;
export const U = 4;
export const D = 5;

/** Stickers are color ids 0..5 (solved face color). 6 = CLEAR-mode occupy. */
export type ColorId = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** Black occupy sticker used when a face is cleared in CLEAR mode. */
export const OCCUPY = 6 as ColorId;
export type FaceGrid = ColorId[][];
export type CubeState = {
  size: number;
  faces: [FaceGrid, FaceGrid, FaceGrid, FaceGrid, FaceGrid, FaceGrid];
};

export type TurnDir = 1 | -1;

export const CUBE_SIZES = [2, 3] as const;
export type CubeSize = (typeof CUBE_SIZES)[number];

export function createSolved(n: number): CubeState {
  if (n < 2) throw new Error("cube size must be >= 2");
  const faces = [0, 1, 2, 3, 4, 5].map((c) =>
    Array.from({ length: n }, () =>
      Array.from({ length: n }, () => c as ColorId),
    ),
  ) as CubeState["faces"];
  return { size: n, faces };
}

export function cloneCube(cube: CubeState): CubeState {
  return {
    size: cube.size,
    faces: cube.faces.map((f) => f.map((row) => row.slice())) as CubeState["faces"],
  };
}

export function isSolved(cube: CubeState): boolean {
  for (let fi = 0; fi < FACE_COUNT; fi++) {
    const face = cube.faces[fi]!;
    const want = fi as ColorId;
    for (let r = 0; r < cube.size; r++) {
      for (let c = 0; c < cube.size; c++) {
        if (face[r]![c] !== want) return false;
      }
    }
  }
  return true;
}

/** True when every sticker on the face shares the same color. */
export function isFaceUniform(face: FaceGrid): boolean {
  if (!face.length || !face[0]?.length) return false;
  const want = face[0]![0]!;
  for (let r = 0; r < face.length; r++) {
    for (let c = 0; c < face[r]!.length; c++) {
      if (face[r]![c] !== want) return false;
    }
  }
  return true;
}

/** Uniform real stickers (not occupy) — eligible to clear in CLEAR mode. */
export function isFaceClearable(face: FaceGrid): boolean {
  if (!isFaceUniform(face)) return false;
  const c = face[0]![0]!;
  return c !== OCCUPY;
}

/** Paint every cell on a face with one color (mutates). */
export function fillFaceColor(
  cube: CubeState,
  face: FaceId,
  color: ColorId,
): void {
  const g = cube.faces[face]!;
  for (let r = 0; r < cube.size; r++) {
    for (let c = 0; c < cube.size; c++) {
      g[r]![c] = color;
    }
  }
}

/** First face that is not uniform in its solved color, or null if solved. */
export function findUnsolvedFace(cube: CubeState): FaceId | null {
  for (let fi = 0; fi < FACE_COUNT; fi++) {
    const face = cube.faces[fi]!;
    const want = fi as ColorId;
    for (let r = 0; r < cube.size; r++) {
      for (let c = 0; c < cube.size; c++) {
        if (face[r]![c] !== want) return fi as FaceId;
      }
    }
  }
  return null;
}

function rotateFaceCW(face: FaceGrid): FaceGrid {
  const n = face.length;
  const out: ColorId[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 0 as ColorId),
  );
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c]![n - 1 - r] = face[r]![c]!;
    }
  }
  return out;
}

function rotateFace(face: FaceGrid, dir: TurnDir): FaceGrid {
  if (dir === 1) return rotateFaceCW(face);
  // CCW = 3× CW
  return rotateFaceCW(rotateFaceCW(rotateFaceCW(face)));
}

function getRow(face: FaceGrid, r: number): ColorId[] {
  return face[r]!.slice();
}

function setRow(face: FaceGrid, r: number, vals: ColorId[]): void {
  for (let c = 0; c < vals.length; c++) face[r]![c] = vals[c]!;
}

function getCol(face: FaceGrid, c: number): ColorId[] {
  return face.map((row) => row[c]!);
}

function setCol(face: FaceGrid, c: number, vals: ColorId[]): void {
  for (let r = 0; r < vals.length; r++) face[r]![c] = vals[r]!;
}

function rev(a: ColorId[]): ColorId[] {
  return a.slice().reverse();
}

/**
 * Rotate one face clockwise (dir=1) or counter-clockwise (dir=-1) as seen
 * looking at that face from outside the cube. Cycles adjacent edge strips.
 */
export function faceTurn(
  cube: CubeState,
  face: FaceId,
  dir: TurnDir = 1,
): CubeState {
  const next = cloneCube(cube);
  const n = next.size;
  const faces = next.faces;
  faces[face] = rotateFace(faces[face]!, dir);

  // Apply one CW side-cycle, twice for 180 via two calls, or inverse for CCW.
  const cw = (times: number) => {
    for (let t = 0; t < times; t++) cycleSidesCW(faces, face, n);
  };
  if (dir === 1) cw(1);
  else cw(3);

  return next;
}

/** Cycle the four adjacent strips one step CW as viewed from `face`. */
function cycleSidesCW(
  faces: CubeState["faces"],
  face: FaceId,
  n: number,
): void {
  const last = n - 1;
  switch (face) {
    case F: {
      // U bottom → R left → D top → L right → U bottom
      const u = getRow(faces[U]!, last);
      const r = getCol(faces[R]!, 0);
      const d = getRow(faces[D]!, 0);
      const l = getCol(faces[L]!, last);
      setCol(faces[R]!, 0, u);
      setRow(faces[D]!, 0, rev(r));
      setCol(faces[L]!, last, d);
      setRow(faces[U]!, last, rev(l));
      break;
    }
    case B: {
      // U top → L left → D bottom → R right → U top
      const u = getRow(faces[U]!, 0);
      const l = getCol(faces[L]!, 0);
      const d = getRow(faces[D]!, last);
      const r = getCol(faces[R]!, last);
      setCol(faces[L]!, 0, u);
      setRow(faces[D]!, last, rev(l));
      setCol(faces[R]!, last, d);
      setRow(faces[U]!, 0, rev(r));
      break;
    }
    case R: {
      // U right → B left → D right → F right → U right
      const u = getCol(faces[U]!, last);
      const b = getCol(faces[B]!, 0);
      const d = getCol(faces[D]!, last);
      const f = getCol(faces[F]!, last);
      setCol(faces[B]!, 0, rev(u));
      setCol(faces[D]!, last, rev(b));
      setCol(faces[F]!, last, d);
      setCol(faces[U]!, last, f);
      break;
    }
    case L: {
      // U left → F left → D left → B right → U left
      const u = getCol(faces[U]!, 0);
      const f = getCol(faces[F]!, 0);
      const d = getCol(faces[D]!, 0);
      const b = getCol(faces[B]!, last);
      setCol(faces[F]!, 0, u);
      setCol(faces[D]!, 0, f);
      setCol(faces[B]!, last, rev(d));
      setCol(faces[U]!, 0, rev(b));
      break;
    }
    case U: {
      // Looking down at U: F → R → B → L → F (top rows).
      // B is mirrored vs F in UV, so reverse when swapping with sides.
      const f = getRow(faces[F]!, 0);
      const r = getRow(faces[R]!, 0);
      const b = getRow(faces[B]!, 0);
      const l = getRow(faces[L]!, 0);
      setRow(faces[R]!, 0, f);
      setRow(faces[B]!, 0, rev(r));
      setRow(faces[L]!, 0, rev(b));
      setRow(faces[F]!, 0, l);
      break;
    }
    case D: {
      // Looking up at D: F → L → B → R → F (bottom rows).
      const f = getRow(faces[F]!, last);
      const l = getRow(faces[L]!, last);
      const b = getRow(faces[B]!, last);
      const r = getRow(faces[R]!, last);
      setRow(faces[L]!, last, f);
      setRow(faces[B]!, last, rev(l));
      setRow(faces[R]!, last, rev(b));
      setRow(faces[F]!, last, r);
      break;
    }
  }
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Default scramble length by size (enough to mix, not absurd). */
export function defaultScrambleMoves(size: number): number {
  return size <= 2 ? 12 : 25;
}

/**
 * Apply random face turns. Avoids immediate inverse of previous move
 * and consecutive turns of the same face.
 */
export function scramble(
  size: number,
  moves = defaultScrambleMoves(size),
  rng: () => number = Math.random,
): CubeState {
  let cube = createSolved(size);
  let prevFace: FaceId | null = null;
  let prevDir: TurnDir | null = null;
  for (let i = 0; i < moves; i++) {
    let face: FaceId;
    let dir: TurnDir;
    do {
      face = Math.floor(rng() * 6) as FaceId;
      dir = rng() < 0.5 ? 1 : -1;
    } while (
      prevFace !== null &&
      face === prevFace &&
      (dir === prevDir || dir === ((-prevDir!) as TurnDir))
    );
    cube = faceTurn(cube, face, dir);
    prevFace = face;
    prevDir = dir;
  }
  return cube;
}

export function cubesEqual(a: CubeState, b: CubeState): boolean {
  if (a.size !== b.size) return false;
  for (let f = 0; f < 6; f++) {
    for (let r = 0; r < a.size; r++) {
      for (let c = 0; c < a.size; c++) {
        if (a.faces[f]![r]![c] !== b.faces[f]![r]![c]) return false;
      }
    }
  }
  return true;
}
