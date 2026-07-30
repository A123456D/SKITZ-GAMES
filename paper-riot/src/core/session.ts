import {
  clearPositions,
  cloneBoard,
  countKind,
  createBoard,
  crushAndRefill,
  damageAdjacentObstacles,
  findMatches,
  inBounds,
  swapCells,
  swapCreatesMatch,
  canSwapCell,
} from "./board";
import type {
  Board,
  Goal,
  LevelDef,
  MatchGroup,
  Pos,
  PowerInventory,
  PowerUpKind,
  TileKind,
} from "./types";
import { COLS, ROWS } from "./types";

export type SessionStatus = "playing" | "won" | "lost";

export type Session = {
  level: LevelDef;
  board: Board;
  movesLeft: number;
  goals: Goal[];
  status: SessionStatus;
  score: number;
  powers: PowerInventory;
};

export const LEVEL_1: LevelDef = {
  id: 1,
  moves: 28,
  goals: [
    { kind: "skull", need: 12 },
    { kind: "bolt", need: 12 },
    { kind: "heart", need: 12 },
  ],
  obstacles: 6,
};

export function emptyPowers(): PowerInventory {
  return {
    bomb: 2,
    plane: 2,
    magnet: 1,
    rocket: 2,
    stapler: 1,
    disco: 1,
  };
}

export function startSession(level: LevelDef = LEVEL_1): Session {
  return {
    level,
    board: createBoard(level.obstacles ?? 0),
    movesLeft: level.moves,
    goals: level.goals.map((g) => ({ ...g, have: 0 })),
    status: "playing",
    score: 0,
    powers: emptyPowers(),
  };
}

function applyGoalProgress(session: Session, groups: MatchGroup[]): void {
  for (const goal of session.goals) {
    goal.have = Math.min(goal.need, goal.have + countKind(groups, goal.kind));
  }
}

function applyGoalTiles(session: Session, positions: Pos[]): void {
  for (const p of positions) {
    const cell = session.board[p.c]?.[p.r];
    if (!cell) continue;
    for (const goal of session.goals) {
      if (goal.kind === cell.kind) {
        goal.have = Math.min(goal.need, goal.have + 1);
      }
    }
  }
}

function checkEnd(session: Session): void {
  if (session.goals.every((g) => g.have >= g.need)) {
    session.status = "won";
    return;
  }
  if (session.movesLeft <= 0) session.status = "lost";
}

export function beginSwap(
  session: Session,
  a: Pos,
  b: Pos,
): { ok: true } | { ok: false; reason: "no-match" | "busy" | "blocked" } {
  if (session.status !== "playing") return { ok: false, reason: "busy" };
  const ca = session.board[a.c]![a.r]!;
  const cb = session.board[b.c]![b.r]!;
  if (!canSwapCell(ca) || !canSwapCell(cb)) return { ok: false, reason: "blocked" };
  if (!swapCreatesMatch(session.board, a, b)) {
    return { ok: false, reason: "no-match" };
  }
  swapCells(session.board, a, b);
  session.movesLeft -= 1;
  return { ok: true };
}

export function currentMatches(session: Session): MatchGroup[] {
  return findMatches(session.board);
}

export function crushWave(session: Session, groups: MatchGroup[]): void {
  if (!groups.length) return;
  applyGoalProgress(session, groups);
  damageAdjacentObstacles(session.board, groups);
  const cleared = crushAndRefill(session.board, groups);
  session.score += cleared * 10;
  checkEnd(session);
}

export function peekSwap(session: Session, a: Pos, b: Pos): boolean {
  return swapCreatesMatch(cloneBoard(session.board), a, b);
}

/** Resolve cascades after a power clear. */
export function resolveCascades(session: Session): void {
  let guard = 0;
  while (guard++ < 40) {
    const groups = findMatches(session.board);
    if (!groups.length) break;
    crushWave(session, groups);
  }
  checkEnd(session);
}

export function usePower(
  session: Session,
  kind: PowerUpKind,
  target: Pos,
): { ok: true; cleared: Pos[] } | { ok: false; reason: string } {
  if (session.status !== "playing") return { ok: false, reason: "busy" };
  if ((session.powers[kind] ?? 0) <= 0) return { ok: false, reason: "empty" };
  if (!inBounds(target.c, target.r)) return { ok: false, reason: "bad-target" };

  const cleared: Pos[] = [];
  const add = (c: number, r: number) => {
    if (!inBounds(c, r)) return;
    if (!cleared.some((p) => p.c === c && p.r === r)) cleared.push({ c, r });
  };

  if (kind === "bomb") {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) add(target.c + dc, target.r + dr);
    }
  } else if (kind === "plane") {
    for (let c = 0; c < COLS; c++) add(c, target.r);
  } else if (kind === "rocket") {
    for (let r = 0; r < ROWS; r++) add(target.c, r);
  } else if (kind === "magnet") {
    const kindTile = session.board[target.c]![target.r]!.kind;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (session.board[c]![r]!.kind === kindTile) add(c, r);
      }
    }
  } else if (kind === "disco") {
    // Clear 8 random cells + target
    add(target.c, target.r);
    let n = 0;
    while (n < 8) {
      const c = Math.floor(Math.random() * COLS);
      const r = Math.floor(Math.random() * ROWS);
      const before = cleared.length;
      add(c, r);
      if (cleared.length > before) n++;
    }
  } else if (kind === "stapler") {
    // Shuffle a 3x3 neighborhood (no clear) — treat as soft clear of obstacles only
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const c = target.c + dc;
        const r = target.r + dr;
        if (!inBounds(c, r)) continue;
        const cell = session.board[c]![r]!;
        if (cell.obstacle) {
          delete cell.obstacle;
          delete cell.hits;
          cleared.push({ c, r });
        }
      }
    }
    session.powers[kind] -= 1;
    session.movesLeft -= 1;
    resolveCascades(session);
    return { ok: true, cleared };
  }

  applyGoalTiles(session, cleared);
  // Strip obstacles in blast
  for (const p of cleared) {
    const cell = session.board[p.c]![p.r]!;
    delete cell.obstacle;
    delete cell.hits;
  }
  const n = clearPositions(session.board, cleared);
  session.score += n * 15;
  session.powers[kind] -= 1;
  session.movesLeft -= 1;
  resolveCascades(session);
  return { ok: true, cleared };
}

export function trySwap(
  session: Session,
  a: Pos,
  b: Pos,
): { ok: true } | { ok: false; reason: string } {
  const started = beginSwap(session, a, b);
  if (!started.ok) return started;
  resolveCascades(session);
  return { ok: true };
}
