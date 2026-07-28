import {
  CUBE_SIZES,
  FACE_COUNT,
  OCCUPY,
  type CubeSize,
  type CubeState,
  type FaceId,
  type TurnDir,
  cloneCube,
  defaultScrambleMoves,
  faceTurn,
  fillFaceColor,
  isFaceClearable,
  isSolved,
  mulberry32,
  scramble,
} from "./rubik";
import { applyLaneTwist, type LaneTwist } from "./lane";
import {
  pickFaceStickers,
  type FaceStickers,
  type TileKind,
  TILE_KINDS,
} from "./stickers";

export type { FaceId, CubeSize, LaneTwist };
export { CUBE_SIZES, FACE_COUNT } from "./rubik";
export type GameStatus = "playing" | "solved" | "lost";
export type GameMode = "classic" | "clear";

const SIZE_KEY = "riotcube_size";
const MODE_KEY = "riotcube_mode";
const MOVE_LIMIT_KEY = "riotcube_move_limit";

/** Preset move caps for clear mode; 0 = unlimited. */
export const MOVE_LIMIT_STEPS = [0, 30, 50, 80, 120] as const;
export type MoveLimit = (typeof MOVE_LIMIT_STEPS)[number];

export type ClearedFaces = readonly [
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
];

export type Session = {
  size: CubeSize;
  cube: CubeState;
  face: FaceId;
  moveCount: number;
  status: GameStatus;
  rng: () => number;
  faceStickers: FaceStickers;
  mode: GameMode;
  /** Faces already cleared in CLEAR mode. */
  cleared: ClearedFaces;
  /** null = unlimited. */
  moveLimit: number | null;
};

function emptyCleared(): ClearedFaces {
  return [false, false, false, false, false, false];
}

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

export function loadGameMode(): GameMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === "clear" || v === "classic") return v;
  } catch {
    /* ignore */
  }
  return "classic";
}

export function saveGameMode(mode: GameMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function cycleGameMode(current: GameMode = loadGameMode()): GameMode {
  const next: GameMode = current === "classic" ? "clear" : "classic";
  saveGameMode(next);
  return next;
}

export function modeLabel(mode: GameMode): string {
  return mode === "clear" ? "CLEAR" : "CLASSIC";
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

function seedFrom(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

function limitFromPrefs(mode: GameMode): number | null {
  if (mode !== "clear") return null;
  const n = loadMoveLimit();
  return n <= 0 ? null : n;
}

export function startSession(
  size: CubeSize = loadCubeSize(),
  stickerPool: readonly TileKind[] = TILE_KINDS,
): Session {
  const seed = seedFrom();
  const rng = mulberry32(seed);
  const faceStickers = pickFaceStickers(rng, stickerPool);
  const cube = scramble(size, defaultScrambleMoves(size), rng);
  const mode = loadGameMode();
  return {
    size,
    cube,
    face: 0,
    moveCount: 0,
    status: "playing",
    rng,
    faceStickers,
    mode,
    cleared: emptyCleared(),
    moveLimit: limitFromPrefs(mode),
  };
}

export function doScramble(session: Session): Session {
  const seed = seedFrom();
  const rng = mulberry32(seed);
  const cube = scramble(
    session.size,
    defaultScrambleMoves(session.size),
    rng,
  );
  const mode = loadGameMode();
  return {
    ...session,
    cube,
    rng,
    moveCount: 0,
    status: "playing",
    mode,
    cleared: emptyCleared(),
    moveLimit: limitFromPrefs(mode),
  };
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
  return {
    ...session,
    faceStickers: map as FaceStickers,
  };
}

export function setActiveFace(session: Session, face: FaceId): Session {
  if (session.face === face) return session;
  return { ...session, face };
}

/** True if any cleared face's sticker layout changed. */
export function clearedFacesDisturbed(
  before: CubeState,
  after: CubeState,
  cleared: ClearedFaces,
): boolean {
  for (let fi = 0; fi < FACE_COUNT; fi++) {
    if (!cleared[fi]) continue;
    const a = before.faces[fi]!;
    const b = after.faces[fi]!;
    for (let r = 0; r < before.size; r++) {
      for (let c = 0; c < before.size; c++) {
        if (a[r]![c] !== b[r]![c]) return true;
      }
    }
  }
  return false;
}

function markNewClears(
  session: Session,
  cube: CubeState,
): { cleared: ClearedFaces; cube: CubeState } {
  const next = [...session.cleared] as [
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
  ];
  let nextCube = cube;
  for (let fi = 0; fi < FACE_COUNT; fi++) {
    if (next[fi]) continue;
    if (!isFaceClearable(cube.faces[fi]!)) continue;
    next[fi] = true;
    if (nextCube === cube) nextCube = cloneCube(cube);
    fillFaceColor(nextCube, fi as FaceId, OCCUPY);
  }
  return { cleared: next, cube: nextCube };
}

function afterMove(session: Session, cube: CubeState): Session {
  const moveCount = session.moveCount + 1;
  let cleared = session.cleared;
  let nextCube = cube;
  let status: GameStatus = "playing";

  if (session.mode === "clear") {
    const marked = markNewClears({ ...session, cube }, cube);
    cleared = marked.cleared;
    nextCube = marked.cube;
    if (cleared.every(Boolean)) status = "solved";
    else if (session.moveLimit != null && moveCount >= session.moveLimit) {
      status = "lost";
    }
  } else if (isSolved(cube)) {
    status = "solved";
  }

  return {
    ...session,
    cube: nextCube,
    moveCount,
    cleared,
    status,
  };
}

export function applyFaceTurn(
  session: Session,
  face: FaceId,
  dir: TurnDir = 1,
): Session {
  if (session.status !== "playing") return session;
  // Cleared faces are done — spinning them does nothing useful.
  if (session.mode === "clear" && session.cleared[face]) return session;
  const cube = faceTurn(session.cube, face, dir);
  return afterMove(session, cube);
}

export function applyTwist(session: Session, twist: LaneTwist): Session {
  if (session.status !== "playing") return session;
  const cube = applyLaneTwist(session.cube, session.face, twist);
  return afterMove(session, cube);
}

export function clearedCount(session: Session): number {
  return session.cleared.reduce((n, c) => n + (c ? 1 : 0), 0);
}
