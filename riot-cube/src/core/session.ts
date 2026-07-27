import {
  generateBoard,
  mulberry32,
  resolveBoard,
  type Board,
} from "./board";
import { twistCubeFaces } from "./cubeTwist";
import { PLAY_KINDS, type Goal, type LevelDef, type TileKind, type Twist } from "./types";

export type GameStatus = "playing" | "won" | "lost";
/** F B R L U D */
export type FaceId = 0 | 1 | 2 | 3 | 4 | 5;
export const FACE_COUNT = 6;

export type CubeFaces = [Board, Board, Board, Board, Board, Board];

export type Session = {
  level: LevelDef;
  board: Board;
  faces: CubeFaces;
  face: FaceId;
  movesLeft: number;
  score: number;
  goals: Goal[];
  status: GameStatus;
  comboPeak: number;
  rng: () => number;
  lastTwist: Twist | null;
  kinds: readonly TileKind[];
};

export function starsForScore(score: number, thresholds: [number, number, number]): 0 | 1 | 2 | 3 {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function levelKinds(level: LevelDef): readonly TileKind[] {
  return level.kinds?.length ? level.kinds : PLAY_KINDS;
}

function fixedFace(level: LevelDef, face: FaceId): TileKind[][] | undefined {
  if (face === 0) return level.board;
  if (face === 1) return level.boardBack;
  if (face === 2) return level.boardRight;
  if (face === 3) return level.boardLeft;
  if (face === 4) return level.boardTop;
  return level.boardBottom;
}

export function startSession(level: LevelDef): Session {
  const seed = level.seed ?? hashId(level.id);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const size = level.size;
  const kinds = levelKinds(level);
  const faces = Array.from({ length: FACE_COUNT }, (_, i) => {
    const fixed = fixedFace(level, i as FaceId);
    if (fixed) return fixed.map((row) => row.slice());
    return generateBoard(size, (seed ^ Math.imul(i + 1, 0x9e3779b9)) >>> 0, kinds);
  }) as CubeFaces;

  return {
    level,
    faces,
    face: 0,
    board: faces[0],
    movesLeft: level.moves,
    score: 0,
    goals: level.goals.map((g) => ({ ...g, have: 0 })),
    status: "playing",
    comboPeak: 0,
    rng,
    lastTwist: null,
    kinds,
  };
}

function applyClearsToGoals(goals: Goal[], cleared: { kind: TileKind; count: number }[]): Goal[] {
  return goals.map((g) => {
    const hit = cleared.find((c) => c.kind === g.kind);
    if (!hit) return g;
    return { ...g, have: Math.min(g.need, g.have + hit.count) };
  });
}

function goalsMet(goals: Goal[]): boolean {
  return goals.every((g) => g.have >= g.need);
}

function finishStatus(goals: Goal[], movesLeft: number): GameStatus {
  if (goalsMet(goals)) return "won";
  if (movesLeft <= 0) return "lost";
  return "playing";
}

export type TwistResult = {
  session: Session;
  didTwist: boolean;
  scoreGain: number;
  combo: number;
  /** True when this twist spent a move (only matching clears). */
  spentMove: boolean;
};

/**
 * Twist a slice. Dry twists (no clear) are free.
 * Matching twists spend one move.
 */
export function applyTwist(session: Session, twist: Twist): TwistResult {
  if (session.status !== "playing") {
    return { session, didTwist: false, scoreGain: 0, combo: 0, spentMove: false };
  }
  // Out of match-moves: still allow dry setup twists so the board isn't frozen dead.
  // Scoring requires movesLeft > 0.
  const facesTwisted = twistCubeFaces(session.faces, session.face, twist);
  const resolved = resolveBoard(facesTwisted[session.face]!, session.rng, session.kinds);
  const scored = resolved.scoreGain > 0;

  if (scored && session.movesLeft <= 0) {
    return { session, didTwist: false, scoreGain: 0, combo: 0, spentMove: false };
  }

  const goals = applyClearsToGoals(session.goals, resolved.totalCleared);
  const movesLeft = scored ? session.movesLeft - 1 : session.movesLeft;
  const score = session.score + resolved.scoreGain;
  const comboPeak = Math.max(session.comboPeak, resolved.combo);

  const faces = facesTwisted.map((f, i) =>
    i === session.face ? resolved.board : f,
  ) as CubeFaces;

  return {
    session: {
      ...session,
      faces,
      board: faces[session.face]!,
      movesLeft,
      score,
      goals,
      status: finishStatus(goals, movesLeft),
      comboPeak,
      lastTwist: twist,
    },
    didTwist: true,
    scoreGain: resolved.scoreGain,
    combo: resolved.combo,
    spentMove: scored,
  };
}

/** Spend one move to flip to another face. */
export function spendOrbit(session: Session): { session: Session; didSpend: boolean } {
  if (session.status !== "playing" || session.movesLeft <= 0) {
    return { session, didSpend: false };
  }
  const movesLeft = session.movesLeft - 1;
  return {
    session: {
      ...session,
      movesLeft,
      status: finishStatus(session.goals, movesLeft),
    },
    didSpend: true,
  };
}

/** Point session at whichever face is currently facing the camera. */
export function setActiveFace(session: Session, face: FaceId): Session {
  return {
    ...session,
    face,
    board: session.faces[face]!,
  };
}

export function restartSession(session: Session): Session {
  return startSession(session.level);
}

export function nextLevelIndex(levels: LevelDef[], currentId: string): number {
  const i = levels.findIndex((l) => l.id === currentId);
  if (i < 0 || i + 1 >= levels.length) return -1;
  return i + 1;
}
