import {
  generateBoard,
  mulberry32,
  resolveBoard,
  twistBoard,
  type Board,
} from "./board";
import type { Goal, LevelDef, TileKind, Twist } from "./types";

export type GameStatus = "playing" | "won" | "lost";
export type FaceId = 0 | 1;

export type Session = {
  level: LevelDef;
  /** Active face board (alias into faces[face]). */
  board: Board;
  faces: [Board, Board];
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

export function startSession(level: LevelDef): Session {
  const seed = level.seed ?? hashId(level.id);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const front = level.board
    ? level.board.map((row) => row.slice())
    : generateBoard(level.size, seed);
  const back = level.boardBack
    ? level.boardBack.map((row) => row.slice())
    : generateBoard(level.size, seed ^ 0x85ebca6b);

  const faces: [Board, Board] = [front, back];
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

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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

/** Spend one move, twist active face, resolve cascades. */
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

  const faces: [Board, Board] = [...session.faces] as [Board, Board];
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

/** Flip cube to the other face (free — does not spend a move). */
export function flipFace(session: Session, dir: 1 | -1 = 1): Session {
  if (session.status !== "playing") return session;
  const face = ((session.face + dir + 2) % 2) as FaceId;
  return {
    ...session,
    face,
    board: session.faces[face]!,
  };
}

export function restartSession(session: Session): Session {
  return startSession(session.level);
}
