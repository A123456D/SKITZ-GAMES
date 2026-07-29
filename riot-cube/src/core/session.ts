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
export type GameStatus = "playing" | "solved" | "lost";

const SIZE_KEY = "riotcube_size";
const MOVE_LIMIT_KEY = "riotcube_move_limit";
/** Legacy single progress blob — migrated into the active theme slot once. */
const PROGRESS_KEY = "riotcube_progress";
/** Per-theme puzzle progress (cube / moves / face). */
const PROGRESS_BY_THEME_KEY = "riotcube_progress_by_theme";

/** Preset move caps; 0 = unlimited. */
export const MOVE_LIMIT_STEPS = [0, 30, 50, 80, 120] as const;
export type MoveLimit = (typeof MOVE_LIMIT_STEPS)[number];

/** When true, mutators skip localStorage writes (e.g. interactive tutorial). */
let progressSaveSuspended = false;

/** Active theme slot for sticker + puzzle persistence (e.g. edgy, anime-dark). */
let progressThemeSlot = "edgy";

export function setProgressSaveSuspended(suspended: boolean): void {
  progressSaveSuspended = suspended;
}

export function setProgressThemeSlot(slot: string): void {
  if (slot) progressThemeSlot = slot;
}

export function getProgressThemeSlot(): string {
  return progressThemeSlot;
}

export type Session = {
  size: CubeSize;
  cube: CubeState;
  face: FaceId;
  moveCount: number;
  status: GameStatus;
  rng: () => number;
  faceStickers: FaceStickers;
  /** null = unlimited */
  moveLimit: number | null;
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
  moveLimit?: number | null;
};

type ProgressByTheme = Record<string, ProgressBlob>;

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

export function loadMoveLimit(): MoveLimit {
  try {
    const v = Number(localStorage.getItem(MOVE_LIMIT_KEY));
    if ((MOVE_LIMIT_STEPS as readonly number[]).includes(v)) {
      return v as MoveLimit;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

export function saveMoveLimit(limit: MoveLimit): void {
  try {
    localStorage.setItem(MOVE_LIMIT_KEY, String(limit));
  } catch {
    /* ignore */
  }
}

export function cycleMoveLimit(
  current: MoveLimit = loadMoveLimit(),
): MoveLimit {
  const i = MOVE_LIMIT_STEPS.indexOf(current);
  const next = MOVE_LIMIT_STEPS[(i + 1) % MOVE_LIMIT_STEPS.length]!;
  saveMoveLimit(next);
  return next;
}

export function moveLimitLabel(limit: MoveLimit): string {
  return limit <= 0 ? "UNLIMITED" : String(limit);
}

function limitFromPrefs(): number | null {
  const n = loadMoveLimit();
  return n <= 0 ? null : n;
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

function parseProgressBlob(parsed: Partial<ProgressBlob>): ProgressBlob | null {
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
  if (
    parsed.status !== "playing" &&
    parsed.status !== "solved" &&
    parsed.status !== "lost"
  ) {
    return null;
  }
  let moveLimit: number | null | undefined = parsed.moveLimit;
  if (moveLimit === undefined) moveLimit = limitFromPrefs();
  else if (moveLimit != null) {
    const n = Number(moveLimit);
    moveLimit = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }
  return {
    v: 1,
    size,
    cube: parsed.cube,
    face: face as FaceId,
    moveCount: Math.floor(moveCount),
    status: parsed.status,
    moveLimit: moveLimit ?? null,
  };
}

function readProgressByTheme(): ProgressByTheme {
  try {
    const raw = localStorage.getItem(PROGRESS_BY_THEME_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ProgressByTheme;
  } catch {
    return {};
  }
}

function writeProgressByTheme(map: ProgressByTheme): void {
  try {
    localStorage.setItem(PROGRESS_BY_THEME_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function blobFromSession(session: Session): ProgressBlob {
  return {
    v: 1,
    size: session.size,
    cube: session.cube,
    face: session.face,
    moveCount: session.moveCount,
    status: session.status,
    moveLimit: session.moveLimit,
  };
}

/** Persist in-progress puzzle for the active theme slot. */
export function saveProgress(session: Session): void {
  if (progressSaveSuspended) return;
  const slot = progressThemeSlot;
  if (!slot) return;
  const byTheme = readProgressByTheme();
  byTheme[slot] = blobFromSession(session);
  writeProgressByTheme(byTheme);
}

export function clearProgress(): void {
  try {
    const byTheme = readProgressByTheme();
    delete byTheme[progressThemeSlot];
    writeProgressByTheme(byTheme);
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

export function loadProgress(themeSlot: string = progressThemeSlot): ProgressBlob | null {
  try {
    const byTheme = readProgressByTheme();
    const slotted = byTheme[themeSlot]
      ? parseProgressBlob(byTheme[themeSlot] as Partial<ProgressBlob>)
      : null;
    if (slotted) return slotted;

    // Migrate legacy global progress into this theme once.
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const legacy = parseProgressBlob(JSON.parse(raw) as Partial<ProgressBlob>);
    if (!legacy) return null;
    byTheme[themeSlot] = legacy;
    writeProgressByTheme(byTheme);
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      /* ignore */
    }
    return legacy;
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
  const faceStickers = resolveFaceStickers(
    stickerPool,
    keepStickers,
    progressThemeSlot,
  );
  const cube = scramble(size, defaultScrambleMoves(size), rng);
  const session: Session = {
    size,
    cube,
    face: 0,
    moveCount: 0,
    status: "playing",
    rng,
    faceStickers,
    moveLimit: limitFromPrefs(),
  };
  saveProgress(session);
  saveFaceStickers(faceStickers, progressThemeSlot);
  return session;
}

/** Resume a saved puzzle for this theme+size; otherwise start fresh. */
export function resumeOrStartSession(
  size: CubeSize = loadCubeSize(),
  stickerPool: readonly TileKind[] = TILE_KINDS,
  keepStickers?: readonly TileKind[] | null,
): Session {
  const faceStickers = resolveFaceStickers(
    stickerPool,
    keepStickers,
    progressThemeSlot,
  );
  const saved = loadProgress(progressThemeSlot);
  if (saved && saved.size === size && saved.status === "playing") {
    const session: Session = {
      size: saved.size,
      cube: saved.cube,
      face: saved.face,
      moveCount: saved.moveCount,
      status: "playing",
      rng: mulberry32(seedFrom()),
      faceStickers,
      moveLimit:
        saved.moveLimit === undefined ? limitFromPrefs() : saved.moveLimit,
    };
    saveFaceStickers(faceStickers, progressThemeSlot);
    return session;
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
    moveLimit: limitFromPrefs(),
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
  saveFaceStickers(faceStickers, progressThemeSlot);
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
  let status: GameStatus = "playing";
  if (isSolved(cube)) status = "solved";
  else if (session.moveLimit != null && moveCount >= session.moveLimit) {
    status = "lost";
  }
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
