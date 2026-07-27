import {
  CUBE_SIZES,
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
  pickFaceStickers,
  type FaceStickers,
  type TileKind,
  TILE_KINDS,
} from "./stickers";

export type { FaceId, CubeSize, LaneTwist };
export { CUBE_SIZES, FACE_COUNT } from "./rubik";
export type GameStatus = "playing" | "solved";

const SIZE_KEY = "riotcube_size";

export type Session = {
  size: CubeSize;
  cube: CubeState;
  face: FaceId;
  moveCount: number;
  status: GameStatus;
  rng: () => number;
  faceStickers: FaceStickers;
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

export function startSession(
  size: CubeSize = loadCubeSize(),
  stickerPool: readonly TileKind[] = TILE_KINDS,
): Session {
  const seed = seedFrom();
  const rng = mulberry32(seed);
  const faceStickers = pickFaceStickers(rng, stickerPool);
  const cube = scramble(size, defaultScrambleMoves(size), rng);
  return {
    size,
    cube,
    face: 0,
    moveCount: 0,
    status: "playing",
    rng,
    faceStickers,
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
  return {
    ...session,
    cube,
    rng,
    moveCount: 0,
    status: "playing",
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

export function applyFaceTurn(
  session: Session,
  face: FaceId,
  dir: TurnDir = 1,
): Session {
  const cube = faceTurn(session.cube, face, dir);
  return {
    ...session,
    cube,
    moveCount: session.moveCount + 1,
    status: isSolved(cube) ? "solved" : "playing",
  };
}

export function applyTwist(session: Session, twist: LaneTwist): Session {
  const cube = applyLaneTwist(session.cube, session.face, twist);
  return {
    ...session,
    cube,
    moveCount: session.moveCount + 1,
    status: isSolved(cube) ? "solved" : "playing",
  };
}
