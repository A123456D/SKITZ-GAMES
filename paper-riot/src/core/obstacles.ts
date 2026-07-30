import {
  COLS,
  ROWS,
  OBSTACLE_HITS,
  OBSTACLE_LINE_IMMUNE,
  OBSTACLE_MATCH_IMMUNE,
  OBSTACLE_SOFT,
  type Board,
  type BoardMask,
  type Cell,
  type ObstacleKind,
  type ObstaclePattern,
  type ObstacleSpec,
  type Pos,
} from "./types";

export {
  OBSTACLE_LINE_IMMUNE,
  OBSTACLE_MATCH_IMMUNE,
  LOCK_MIN_MATCH,
} from "./types";

function playableSlots(mask: BoardMask): Pos[] {
  const slots: Pos[] = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (mask[c]![r]) slots.push({ c, r });
    }
  }
  return slots;
}

function pickPatternSlots(
  mask: BoardMask,
  pattern: ObstaclePattern,
  count: number,
): Pos[] {
  const all = playableSlots(mask).filter((p) => p.r >= 1);
  if (!all.length) return [];

  let pool: Pos[] = [];
  if (pattern === "scatter") {
    pool = [...all];
  } else if (pattern === "row") {
    const rows = [...new Set(all.map((p) => p.r))].sort((a, b) => a - b);
    const mid = rows[Math.floor(rows.length / 2)] ?? rows[0]!;
    pool = all.filter((p) => p.r === mid);
    if (pool.length < count) {
      const next = rows[Math.min(rows.length - 1, Math.floor(rows.length / 2) + 1)];
      pool = all.filter((p) => p.r === mid || p.r === next);
    }
  } else if (pattern === "col") {
    const cols = [...new Set(all.map((p) => p.c))].sort((a, b) => a - b);
    const mid = cols[Math.floor(cols.length / 2)] ?? cols[0]!;
    pool = all.filter((p) => p.c === mid);
  } else if (pattern === "border") {
    const cs = all.map((p) => p.c);
    const rs = all.map((p) => p.r);
    const minC = Math.min(...cs);
    const maxC = Math.max(...cs);
    const minR = Math.min(...rs);
    const maxR = Math.max(...rs);
    pool = all.filter(
      (p) => p.c === minC || p.c === maxC || p.r === minR || p.r === maxR,
    );
  } else if (pattern === "cluster") {
    const seed = all[(Math.random() * all.length) | 0]!;
    pool = all
      .filter((p) => Math.abs(p.c - seed.c) + Math.abs(p.r - seed.r) <= 2)
      .sort(
        (a, b) =>
          Math.abs(a.c - seed.c) +
          Math.abs(a.r - seed.r) -
          (Math.abs(b.c - seed.c) + Math.abs(b.r - seed.r)),
      );
  } else if (pattern === "checker") {
    pool = all.filter((p) => (p.c + p.r) % 2 === 0);
  } else if (pattern === "center") {
    const cx = (COLS - 1) / 2;
    const cy = (ROWS - 1) / 2;
    pool = [...all].sort(
      (a, b) =>
        Math.abs(a.c - cx) +
        Math.abs(a.r - cy) -
        (Math.abs(b.c - cx) + Math.abs(b.r - cy)),
    );
  } else if (pattern === "diagonals") {
    pool = all.filter((p) => p.c === p.r || p.c + p.r === COLS - 1);
  }

  // Shuffle lightly then take count
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function placeObstaclePlan(
  board: Board,
  mask: BoardMask,
  plan: ObstacleSpec[],
): void {
  for (const spec of plan) {
    const slots = pickPatternSlots(mask, spec.pattern, spec.count);
    for (const p of slots) {
      const cell = board[p.c]![p.r];
      if (!cell || cell.obstacle) continue;
      cell.obstacle = spec.kind;
      cell.hits = OBSTACLE_HITS[spec.kind];
    }
  }
}

export function isSoftObstacle(kind: ObstacleKind | undefined): boolean {
  return !!kind && OBSTACLE_SOFT.has(kind);
}

export function isPinnedObstacle(kind: ObstacleKind | undefined): boolean {
  return kind === "glue";
}

export function isLineImmune(kind: ObstacleKind | undefined): boolean {
  return !!kind && OBSTACLE_LINE_IMMUNE.has(kind);
}

export function isMatchImmune(kind: ObstacleKind | undefined): boolean {
  return !!kind && OBSTACLE_MATCH_IMMUNE.has(kind);
}

export function canSwapCell(cell: Cell | null): boolean {
  if (!cell) return false;
  if (!cell.obstacle) return true;
  return isSoftObstacle(cell.obstacle);
}

/** Count how many obstacles of a kind remain. */
export function countObstacles(
  board: Board,
  mask: BoardMask,
  kind: ObstacleKind | "any",
): number {
  let n = 0;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!mask[c]![r]) continue;
      const o = board[c]![r]?.obstacle;
      if (!o) continue;
      if (kind === "any" || o === kind) n++;
    }
  }
  return n;
}
