import {
  cloneBoard,
  countKind,
  createBoard,
  crushAndRefill,
  findMatches,
  swapCells,
  swapCreatesMatch,
} from "./board";
import type { Board, Goal, LevelDef, MatchGroup, Pos } from "./types";

export type SessionStatus = "playing" | "won" | "lost";

export type Session = {
  level: LevelDef;
  board: Board;
  movesLeft: number;
  goals: Goal[];
  status: SessionStatus;
  score: number;
};

export const LEVEL_1: LevelDef = {
  id: 1,
  moves: 24,
  goals: [
    { kind: "skull", need: 10 },
    { kind: "bolt", need: 15 },
    { kind: "heart", need: 10 },
  ],
};

export function startSession(level: LevelDef = LEVEL_1): Session {
  return {
    level,
    board: createBoard(),
    movesLeft: level.moves,
    goals: level.goals.map((g) => ({ ...g, have: 0 })),
    status: "playing",
    score: 0,
  };
}

function applyGoalProgress(session: Session, groups: MatchGroup[]): void {
  for (const goal of session.goals) {
    goal.have = Math.min(goal.need, goal.have + countKind(groups, goal.kind));
  }
}

function checkEnd(session: Session): void {
  if (session.goals.every((g) => g.have >= g.need)) {
    session.status = "won";
    return;
  }
  if (session.movesLeft <= 0) session.status = "lost";
}

/** Validate + spend move + swap. Does not crush yet. */
export function beginSwap(
  session: Session,
  a: Pos,
  b: Pos,
): { ok: true } | { ok: false; reason: "no-match" | "busy" } {
  if (session.status !== "playing") return { ok: false, reason: "busy" };
  if (!swapCreatesMatch(session.board, a, b)) {
    return { ok: false, reason: "no-match" };
  }
  swapCells(session.board, a, b);
  session.movesLeft -= 1;
  return { ok: true };
}

/** Current match groups on the board (no mutation). */
export function currentMatches(session: Session): MatchGroup[] {
  return findMatches(session.board);
}

/** Crush one cascade wave after the match burst anim. */
export function crushWave(session: Session, groups: MatchGroup[]): void {
  if (!groups.length) return;
  applyGoalProgress(session, groups);
  const cleared = crushAndRefill(session.board, groups);
  session.score += cleared * 10;
  checkEnd(session);
}

export function peekSwap(session: Session, a: Pos, b: Pos): boolean {
  return swapCreatesMatch(cloneBoard(session.board), a, b);
}

/** Used by tests — full resolve without animation. */
export function trySwap(
  session: Session,
  a: Pos,
  b: Pos,
): { ok: true } | { ok: false; reason: "no-match" | "busy" } {
  const started = beginSwap(session, a, b);
  if (!started.ok) return started;
  let guard = 0;
  while (guard++ < 40) {
    const groups = currentMatches(session);
    if (!groups.length) break;
    crushWave(session, groups);
  }
  return { ok: true };
}
