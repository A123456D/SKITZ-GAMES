import {
  clearPositions,
  cloneBoard,
  countKind,
  createBoard,
  crushAndRefill,
  damageAdjacentObstacles,
  findMatches,
  inBounds,
  isPlayable,
  swapCells,
  swapCreatesMatch,
  canSwapCell,
} from "./board";
import { getLevel } from "./levels";
import type {
  Board,
  BoardMask,
  Goal,
  LevelDef,
  MatchGroup,
  Pos,
  PowerInventory,
  PowerUpKind,
} from "./types";
import { COLS, ROWS } from "./types";

export type SessionStatus = "playing" | "won" | "lost";

export type Session = {
  level: LevelDef;
  board: Board;
  mask: BoardMask;
  movesLeft: number;
  goals: Goal[];
  status: SessionStatus;
  score: number;
  powers: PowerInventory;
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

export function startSession(level: LevelDef | number = 1): Session {
  const def = typeof level === "number" ? getLevel(level) : level;
  const { board, mask } = createBoard(def.shape, {
    colors: def.colors,
    obstacles: def.obstacles,
  });
  return {
    level: def,
    board,
    mask,
    movesLeft: def.moves,
    goals: def.goals.map((g) => ({ ...g, have: 0 })),
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
  if (!isPlayable(session.mask, a.c, a.r) || !isPlayable(session.mask, b.c, b.r)) {
    return { ok: false, reason: "blocked" };
  }
  const ca = session.board[a.c]![a.r];
  const cb = session.board[b.c]![b.r];
  if (!canSwapCell(ca) || !canSwapCell(cb)) return { ok: false, reason: "blocked" };
  if (!swapCreatesMatch(session.board, session.mask, a, b)) {
    return { ok: false, reason: "no-match" };
  }
  swapCells(session.board, a, b);
  session.movesLeft -= 1;
  return { ok: true };
}

export function currentMatches(session: Session): MatchGroup[] {
  return findMatches(session.board, session.mask);
}

export function crushWave(session: Session, groups: MatchGroup[]): void {
  if (!groups.length) return;
  applyGoalProgress(session, groups);
  damageAdjacentObstacles(session.board, session.mask, groups);
  const cleared = crushAndRefill(
    session.board,
    session.mask,
    groups,
    session.level.colors,
  );
  session.score += cleared * 10;
  checkEnd(session);
}

export function peekSwap(session: Session, a: Pos, b: Pos): boolean {
  return swapCreatesMatch(cloneBoard(session.board), session.mask, a, b);
}

export function resolveCascades(session: Session): void {
  let guard = 0;
  while (guard++ < 40) {
    const groups = findMatches(session.board, session.mask);
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
  if (!isPlayable(session.mask, target.c, target.r)) {
    return { ok: false, reason: "bad-target" };
  }

  const cleared: Pos[] = [];
  const add = (c: number, r: number) => {
    if (!isPlayable(session.mask, c, r)) return;
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
    const kindTile = session.board[target.c]![target.r]?.kind;
    if (!kindTile) return { ok: false, reason: "empty-cell" };
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (session.board[c]![r]?.kind === kindTile) add(c, r);
      }
    }
  } else if (kind === "disco") {
    add(target.c, target.r);
    let n = 0;
    let guard = 0;
    while (n < 8 && guard++ < 80) {
      const c = Math.floor(Math.random() * COLS);
      const r = Math.floor(Math.random() * ROWS);
      const before = cleared.length;
      add(c, r);
      if (cleared.length > before) n++;
    }
  } else if (kind === "stapler") {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const c = target.c + dc;
        const r = target.r + dr;
        if (!isPlayable(session.mask, c, r)) continue;
        const cell = session.board[c]![r];
        if (cell?.obstacle) {
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
  for (const p of cleared) {
    const cell = session.board[p.c]![p.r];
    if (cell) {
      delete cell.obstacle;
      delete cell.hits;
    }
  }
  const n = clearPositions(
    session.board,
    session.mask,
    cleared,
    session.level.colors,
  );
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
