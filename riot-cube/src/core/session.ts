import {
  CUBE_SIZES,
  type CubeSize,
  type CubeState,
  type FaceId,
  type TurnDir,
  createSolved,
  defaultScrambleMoves,
  faceTurn,
  isSolved,
  mulberry32,
  scramble,
} from "./rubik";

export type { FaceId, CubeSize };
export { CUBE_SIZES, FACE_COUNT } from "./rubik";
export type GameStatus = "playing" | "solved";

const SIZE_KEY = "riotcube_size";

export type Session = {
  size: CubeSize;
  cube: CubeState;
  /** Camera-facing face (for HUD / turn targeting). */
  face: FaceId;
  moveCount: number;
  status: GameStatus;
  rng: () => number;
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

/** Fresh scrambled session. */
export function startSession(size: CubeSize = loadCubeSize()): Session {
  const seed = seedFrom();
  const rng = mulberry32(seed);
  const moves = defaultScrambleMoves(size);
  const cube = scramble(size, moves, rng);
  return {
    size,
    cube,
    face: 0,
    moveCount: 0,
    status: "playing",
    rng,
  };
}

export function restartSolved(session: Session): Session {
  return {
    ...session,
    cube: createSolved(session.size),
    moveCount: 0,
    status: "solved",
    face: session.face,
  };
}

export function doScramble(session: Session): Session {
  const moves = defaultScrambleMoves(session.size);
  const cube = scramble(session.size, moves, session.rng);
  return {
    ...session,
    cube,
    moveCount: 0,
    status: "playing",
  };
}

export function setActiveFace(session: Session, face: FaceId): Session {
  if (session.face === face) return session;
  return { ...session, face };
}

export function applyFaceTurn(
  session: Session,
  face: FaceId,
  dir: TurnDir = 1,
): Session {
  if (session.status === "solved" && isSolved(session.cube)) {
    // Allow turning after solved to keep playing / mess it up again.
  }
  const cube = faceTurn(session.cube, face, dir);
  const solved = isSolved(cube);
  return {
    ...session,
    cube,
    moveCount: session.moveCount + 1,
    status: solved ? "solved" : "playing",
  };
}
