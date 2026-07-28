import {
  CUBE_SIZES,
  FACE_COUNT,
  type CubeSize,
  type CubeState,
  type FaceId,
  type TurnDir,
  defaultScrambleMoves,
  faceTurn,
  isSolved,
  mulberry32,
  scramble,
} from "./rubik";
import { applyLaneTwist, type LaneTwist } from "./lane";
import {
  resolveFaceStickers,
  saveFaceStickers,
  type FaceStickers,
  type TileKind,
  TILE_KINDS,
} from "./stickers";

export type { FaceId, CubeSize, LaneTwist };
export { CUBE_SIZES, FACE_COUNT } from "./rubik";
export type GameStatus = "playing" | "solved";

const SIZE_KEY = "riotcube_size";
const PROGRESS_KEY = "riotcube_progress";

/** When true, mutators skip localStorage writes (e.g. interactive tutorial). */
let progressSaveSuspended = false;

export function setProgressSaveSuspended(suspended: boolean): void {
  progressSaveSuspended = suspended;
}

export type Session = {
  size: CubeSize;
  cube: CubeState;
  face: FaceId;
  moveCount: number;
  status: GameStatus;
  rng: () => number;
  faceStickers: FaceStickers;
};

/** Deep-clone cube faces so a stashed session is not mutated in place. */
export function cloneSession(session: Session): Session {
  return {
    ...session,
    cube: {
      size: session.cube.size,
      faces: session.cube.faces.map((face) =>
        face.map((row) => row.slice()),
      ) as CubeState["faces"],
    },
    faceStickers: [...session.faceStickers] as FaceStickers,
  };
}

type ProgressBlob = {
  v: 1;
  size: CubeSize;
  cube: CubeState;
  face: FaceId;
  moveCount: number;
  status: GameStatus;
};

export function loadCubeSize(): CubeSize {
  try {
    const v = Number(localStorage.getItem(SIZE_KEY));
    if ((CUBE_SIZES as readonly number[]).includes(v)) return v as CubeSize;
  } catch {
    /* ignore */
  }
  return 3;
}

export function saveCubeSize(size: CubeSize): void {
  try {
    localStorage.setItem(SIZE_KEY, String(size));
  } catch {
    /* ignore */
  }
}

export function cycleCubeSize(current: CubeSize): CubeSize {
  const i = CUBE_SIZES.indexOf(current);
  const next = CUBE_SIZES[(i + 1) % CUBE_SIZES.length]!;
  saveCubeSize(next);
  return next;
}

export function sizeLabel(size: number): string {
  return `${size}\u00D7${size}`;
}

function seedFrom(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

function isValidCube(cube: unknown, size: number): cube is CubeState {
  if (!cube || typeof cube !== "object") return false;
  const c = cube as CubeState;
  if (c.size !== size || !Array.isArray(c.faces) || c.faces.length !== 6) {
    return false;
  }
  for (const face of c.faces) {
    if (!Array.isArray(face) || face.length !== size) return false;
    for (const row of face) {
      if (!Array.isArray(row) || row.length !== size) return false;
      for (const cell of row) {
        if (typeof cell !== "number" || cell < 0 || cell > 5) return false;
      }
    }
  }
  return true;
}

/** Persist in-progress (or last) puzzle so refresh / Home → Play resumes. */
export function saveProgress(session: Session): void {
  if (progressSaveSuspended) return;
  const blob: ProgressBlob = {
    v: 1,
    size: session.size,
    cube: session.cube,
    face: session.face,
    moveCount: session.moveCount,
    status: session.status,
  };
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(blob));
  } catch {
    /* ignore */
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

export function loadProgress(): ProgressBlob | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProgressBlob>;
    if (parsed.v !== 1) return null;
    if (!(CUBE_SIZES as readonly number[]).includes(Number(parsed.size))) {
      return null;
    }
    const size = parsed.size as CubeSize;
    if (!isValidCube(parsed.cube, size)) return null;
    const face = Number(parsed.face);
    if (face < 0 || face > 5) return null;
    const moveCount = Number(parsed.moveCount);
    if (!Number.isFinite(moveCount) || moveCount < 0) return null;
    if (parsed.status !== "playing" && parsed.status !== "solved") return null;
    return {
      v: 1,
      size,
      cube: parsed.cube,
      face: face as FaceId,
      moveCount: Math.floor(moveCount),
      status: parsed.status,
    };
  } catch {
    return null;
  }
}

export function startSession(
  size: CubeSize = loadCubeSize(),
  stickerPool: readonly TileKind[] = TILE_KINDS,
  keepStickers?: readonly TileKind[] | null,
): Session {
  const seed = seedFrom();
  const rng = mulberry32(seed);
  const faceStickers = resolveFaceStickers(stickerPool, keepStickers);
  const cube = scramble(size, defaultScrambleMoves(size), rng);
  const session: Session = {
    size,
    cube,
    face: 0,
    moveCount: 0,
    status: "playing",
    rng,
    faceStickers,
  };
  saveProgress(session);
  return session;
}

/** Resume a saved puzzle if one exists for this size; otherwise start fresh. */
export function resumeOrStartSession(
  size: CubeSize = loadCubeSize(),
  stickerPool: readonly TileKind[] = TILE_KINDS,
  keepStickers?: readonly TileKind[] | null,
): Session {
  const faceStickers = resolveFaceStickers(stickerPool, keepStickers);
  const saved = loadProgress();
  if (saved && saved.size === size && saved.status === "playing") {
    return {
      size: saved.size,
      cube: saved.cube,
      face: saved.face,
      moveCount: saved.moveCount,
      status: "playing",
      rng: mulberry32(seedFrom()),
      faceStickers,
    };
  }
  return startSession(size, stickerPool, faceStickers);
}

export function doScramble(session: Session): Session {
  const seed = seedFrom();
  const rng = mulberry32(seed);
  const cube = scramble(
    session.size,
    defaultScrambleMoves(session.size),
    rng,
  );
  // Keep the player's sticker icons — scramble only mixes the cube.
  const next: Session = {
    ...session,
    cube,
    rng,
    moveCount: 0,
    status: "playing",
    face: 0,
    faceStickers: session.faceStickers,
  };
  saveProgress(next);
  return next;
}

export function setFaceStickers(
  session: Session,
  map: readonly TileKind[],
): Session {
  if (map.length !== 6) return session;
  const set = new Set(map);
  if (set.size !== 6) return session;
  for (const k of map) {
    if (!(TILE_KINDS as readonly string[]).includes(k)) return session;
  }
  const faceStickers = map as FaceStickers;
  saveFaceStickers(faceStickers);
  const next = { ...session, faceStickers };
  saveProgress(next);
  return next;
}

export function setActiveFace(session: Session, face: FaceId): Session {
  if (session.face === face) return session;
  const next = { ...session, face };
  saveProgress(next);
  return next;
}

function afterMove(session: Session, cube: CubeState): Session {
  const moveCount = session.moveCount + 1;
  const status: GameStatus = isSolved(cube) ? "solved" : "playing";
  const next: Session = {
    ...session,
    cube,
    moveCount,
    status,
  };
  saveProgress(next);
  return next;
}

export function applyFaceTurn(
  session: Session,
  face: FaceId,
  dir: TurnDir = 1,
): Session {
  if (session.status !== "playing") return session;
  const cube = faceTurn(session.cube, face, dir);
  return afterMove(session, cube);
}

export function applyTwist(session: Session, twist: LaneTwist): Session {
  if (session.status !== "playing") return session;
  const cube = applyLaneTwist(session.cube, session.face, twist);
  return afterMove(session, cube);
}
