import {
  generateBoard,
  mulberry32,
  resolveBoard,
  twistBoard,
  type Board,
} from "./board";
import type { Goal, LevelDef, TileKind, Twist } from "./types";

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

export function startSession(level: LevelDef): Session {
  const seed = level.seed ?? hashId(level.id);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const size = level.size;
  const faces = Array.from({ length: FACE_COUNT }, (_, i) => {
    if (i === 0 && level.board) return level.board.map((row) => row.slice());
    if (i === 1 && level.boardBack) return level.boardBack.map((row) => row.slice());
    return generateBoard(size, (seed ^ Math.imul(i + 1, 0x9e3779b9)) >>> 0);
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

export type TwistResult = {
  session: Session;
  didTwist: boolean;
  scoreGain: number;
  combo: number;
};

export function applyTwist(session: Session, twist: Twist): TwistResult {
  if (session.status !== "playing" || session.movesLeft <= 0) {
    return { session, didTwist: false, scoreGain: 0, combo: 0 };
  }

  const twisted = twistBoard(session.board, twist);
  const resolved = resolveBoard(twisted, session.rng);
  const goals = applyClearsToGoals(session.goals, resolved.totalCleared);
  const movesLeft = session.movesLeft - 1;
  const score = session.score + resolved.scoreGain;
  const comboPeak = Math.max(session.comboPeak, resolved.combo);

  const faces = session.faces.map((f) => f) as CubeFaces;
  faces[session.face] = resolved.board;

  let status: GameStatus = "playing";
  if (goalsMet(goals)) status = "won";
  else if (movesLeft <= 0) status = "lost";

  return {
    session: {
      ...session,
      faces,
      board: faces[session.face]!,
      movesLeft,
      score,
      goals,
      status,
      comboPeak,
      lastTwist: twist,
    },
    didTwist: true,
    scoreGain: resolved.scoreGain,
    combo: resolved.combo,
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
