import {
  clearPositions,
  cloneBoard,
  countKind,
  createBoard,
  crushAndRefill,
  damageAdjacentObstacles,
  findMatches,
  isPlayable,
  swapCells,
  swapCreatesMatch,
  canSwapCell,
} from "./board";
import { countObstacles } from "./obstacles";
import { getLevel } from "./levels";
import type {
  Goal,
  GoalDef,
  LevelDef,
  MatchGroup,
  Pos,
  PowerInventory,
  PowerUpKind,
  TileKind,
} from "./types";
import { COLS, ROWS, POWERUP_KINDS, paletteForLevel } from "./types";

export type SessionStatus = "playing" | "won" | "lost";

export type Session = {
  level: LevelDef;
  board: ReturnType<typeof createBoard>["board"];
  mask: ReturnType<typeof createBoard>["mask"];
  movesLeft: number;
  goals: Goal[];
  status: SessionStatus;
  score: number;
  powers: PowerInventory;
  palette: TileKind[];
  /** Snapshot of obstacle counts at level start for clear goals. */
  obstacleBaseline: Record<string, number>;
};

export function emptyPowers(): PowerInventory {
  return {
    bomb: 0,
    plane: 0,
    magnet: 0,
    rocket: 0,
    stapler: 0,
    disco: 0,
  };
}

function hydrateGoals(defs: GoalDef[]): Goal[] {
  return defs.map((g) =>
    g.type === "collect"
      ? { type: "collect", kind: g.kind, need: g.need, have: 0 }
      : { type: "clear", obstacle: g.obstacle, need: g.need, have: 0 },
  );
}

function powersFromLevel(def: LevelDef): PowerInventory {
  const p = emptyPowers();
  for (const k of POWERUP_KINDS) {
    p[k] = def.powers[k] ?? 0;
  }
  return p;
}

export function startSession(level: LevelDef | number = 1): Session {
  const def = typeof level === "number" ? getLevel(level) : level;
  const palette = paletteForLevel(def);
  const { board, mask } = createBoard(def.shape, {
    palette,
    obstaclePlan: def.obstaclePlan,
  });
  const baseline: Record<string, number> = {
    any: countObstacles(board, mask, "any"),
  };
  for (const g of def.goals) {
    if (g.type === "clear" && g.obstacle !== "any") {
      baseline[g.obstacle] = countObstacles(board, mask, g.obstacle);
    }
  }
  return {
    level: def,
    board,
    mask,
    movesLeft: def.moves,
    goals: hydrateGoals(def.goals),
    status: "playing",
    score: 0,
    powers: powersFromLevel(def),
    palette,
    obstacleBaseline: baseline,
  };
}

function syncClearGoals(session: Session): void {
  for (const goal of session.goals) {
    if (goal.type !== "clear") continue;
    const start = session.obstacleBaseline[goal.obstacle] ?? goal.need;
    const left = countObstacles(session.board, session.mask, goal.obstacle);
    goal.have = Math.min(goal.need, Math.max(0, start - left));
  }
}

function applyGoalProgress(session: Session, groups: MatchGroup[]): void {
  for (const goal of session.goals) {
    if (goal.type !== "collect") continue;
    goal.have = Math.min(goal.need, goal.have + countKind(groups, goal.kind));
  }
}

function applyGoalTiles(session: Session, positions: Pos[]): void {
  for (const p of positions) {
    const cell = session.board[p.c]?.[p.r];
    if (!cell) continue;
    for (const goal of session.goals) {
      if (goal.type === "collect" && goal.kind === cell.kind) {
        goal.have = Math.min(goal.need, goal.have + 1);
      }
    }
  }
}

function checkEnd(session: Session): void {
  syncClearGoals(session);
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
    session.palette,
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
    while (n < 10 && guard++ < 100) {
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
    syncClearGoals(session);
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
    session.palette,
  );
  session.score += n * 15;
  session.powers[kind] -= 1;
  session.movesLeft -= 1;
  syncClearGoals(session);
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
