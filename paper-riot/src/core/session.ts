import {
  clearPositions,
  cloneBoard,
  countKind,
  createBoard,
  crushAndRefill,
  damageAdjacentObstacles,
  findMatches,
  isPlayable,
  maybeSpreadTar,
  swapCells,
  swapCreatesMatch,
  tryWetSlip,
  canSwapCell,
} from "./board";
import { countObstacles, isLineImmune } from "./obstacles";
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

export type WetSlip = { id: number; dc: number; dr: number };

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
  /** Wet stickers that should slide after cascades settle. */
  pendingWetSlips: WetSlip[];
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
    pendingWetSlips: [],
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
  session.pendingWetSlips = [];
  const atB = session.board[b.c]![b.r];
  if (atB?.obstacle === "wet") {
    session.pendingWetSlips.push({
      id: atB.id,
      dc: b.c - a.c,
      dr: b.r - a.r,
    });
  }
  const atA = session.board[a.c]![a.r];
  if (atA?.obstacle === "wet") {
    session.pendingWetSlips.push({
      id: atA.id,
      dc: a.c - b.c,
      dr: a.r - b.r,
    });
  }
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

function findCellPos(
  board: Session["board"],
  mask: Session["mask"],
  id: number,
): Pos | null {
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!mask[c]![r]) continue;
      if (board[c]![r]?.id === id) return { c, r };
    }
  }
  return null;
}

function applyPendingWetSlips(session: Session): boolean {
  const slips = session.pendingWetSlips;
  session.pendingWetSlips = [];
  let moved = false;
  for (const slip of slips) {
    const pos = findCellPos(session.board, session.mask, slip.id);
    if (!pos) continue;
    const from = { c: pos.c - slip.dc, r: pos.r - slip.dr };
    if (tryWetSlip(session.board, session.mask, from, pos)) moved = true;
  }
  return moved;
}

export function resolveCascades(session: Session): void {
  let guard = 0;
  while (guard++ < 40) {
    const groups = findMatches(session.board, session.mask);
    if (!groups.length) break;
    crushWave(session, groups);
  }
  if (applyPendingWetSlips(session)) {
    while (guard++ < 40) {
      const groups = findMatches(session.board, session.mask);
      if (!groups.length) break;
      crushWave(session, groups);
    }
  }
  maybeSpreadTar(session.board, session.mask);
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
  const lineClear = kind === "rocket";
  const add = (c: number, r: number) => {
    if (!isPlayable(session.mask, c, r)) return;
    if (lineClear) {
      const obs = session.board[c]![r]?.obstacle;
      if (isLineImmune(obs)) return;
    }
    if (!cleared.some((p) => p.c === c && p.r === r)) cleared.push({ c, r });
  };

  if (kind === "bomb") {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) add(target.c + dc, target.r + dr);
    }
  } else if (kind === "plane") {
    return { ok: false, reason: "use-plane-ferry" };
  } else if (kind === "rocket") {
    // Rocket launches straight up the column.
    for (let r = 0; r < ROWS; r++) add(target.c, r);
  } else if (kind === "magnet") {
    // Magnet pulls every sticker of the tapped type.
    const kindTile = session.board[target.c]![target.r]?.kind;
    if (!kindTile) return { ok: false, reason: "empty-cell" };
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (session.board[c]![r]?.kind === kindTile) add(c, r);
      }
    }
  } else if (kind === "stapler") {
    // Staple a 2×2 paper packet and rip the stack off the desk.
    let c0 = Math.min(target.c, COLS - 2);
    let r0 = Math.min(target.r, ROWS - 2);
    c0 = Math.max(0, c0);
    r0 = Math.max(0, r0);
    for (let dc = 0; dc <= 1; dc++) {
      for (let dr = 0; dr <= 1; dr++) add(c0 + dc, r0 + dr);
    }
  } else if (kind === "disco") {
    // Disco bomb: party pop on the board + bank +5 moves (matches the +5 badge).
    add(target.c, target.r);
    let n = 0;
    let guard = 0;
    while (n < 5 && guard++ < 80) {
      const c = Math.floor(Math.random() * COLS);
      const r = Math.floor(Math.random() * ROWS);
      const before = cleared.length;
      add(c, r);
      if (cleared.length > before) n++;
    }
    applyGoalTiles(session, cleared);
    for (const p of cleared) {
      const cell = session.board[p.c]![p.r];
      if (cell) {
        delete cell.obstacle;
        delete cell.hits;
      }
    }
    const nCleared = clearPositions(
      session.board,
      session.mask,
      cleared,
      session.palette,
    );
    session.score += nCleared * 15;
    session.powers[kind] -= 1;
    session.movesLeft += 5;
    syncClearGoals(session);
    resolveCascades(session);
    return { ok: true, cleared };
  } else {
    return { ok: false, reason: "unknown" };
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

/**
 * Paper plane ferry: move `from` so it sits orthogonally next to `beside`.
 * On a full board this swaps `from` with the best swappable neighbor of `beside`
 * (prefers a landing that creates a match).
 */
export function usePlaneFerry(
  session: Session,
  from: Pos,
  beside: Pos,
): { ok: true; landed: Pos } | { ok: false; reason: string } {
  if (session.status !== "playing") return { ok: false, reason: "busy" };
  if ((session.powers.plane ?? 0) <= 0) return { ok: false, reason: "empty" };
  if (
    !isPlayable(session.mask, from.c, from.r) ||
    !isPlayable(session.mask, beside.c, beside.r)
  ) {
    return { ok: false, reason: "bad-target" };
  }
  if (from.c === beside.c && from.r === beside.r) {
    return { ok: false, reason: "same-cell" };
  }

  const passenger = session.board[from.c]![from.r];
  const anchor = session.board[beside.c]![beside.r];
  if (!passenger || !canSwapCell(passenger)) {
    return { ok: false, reason: "blocked-from" };
  }
  if (!anchor) return { ok: false, reason: "empty-beside" };

  const neighbors: Pos[] = [];
  for (const [dc, dr] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const p = { c: beside.c + dc, r: beside.r + dr };
    if (!isPlayable(session.mask, p.c, p.r)) continue;
    if (p.c === from.c && p.r === from.r) continue;
    const cell = session.board[p.c]![p.r];
    if (!canSwapCell(cell)) continue;
    neighbors.push(p);
  }
  if (!neighbors.length) return { ok: false, reason: "no-landing" };

  let landed = neighbors[0]!;
  for (const p of neighbors) {
    if (swapCreatesMatch(session.board, session.mask, from, p)) {
      landed = p;
      break;
    }
  }

  swapCells(session.board, from, landed);
  session.powers.plane -= 1;
  session.movesLeft -= 1;
  session.score += 20;
  resolveCascades(session);
  return { ok: true, landed };
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
