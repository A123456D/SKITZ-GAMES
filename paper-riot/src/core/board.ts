import { shapeMask } from "./shapes";
import { canSwapCell, placeObstaclePlan } from "./obstacles";
import {
  COLS,
  ROWS,
  TILE_KINDS,
  type Board,
  type BoardMask,
  type BoardShapeId,
  type Cell,
  type MatchGroup,
  type ObstacleSpec,
  type Pos,
  type TileKind,
} from "./types";

export { COLS, ROWS, TILE_KINDS, canSwapCell };

let nextId = 1;

export function freshId(): number {
  return nextId++;
}

export function randomKind(
  colors: number,
  exclude?: TileKind[],
): TileKind {
  const bag = TILE_KINDS.slice(0, Math.max(3, Math.min(6, colors)));
  const pool = exclude?.length ? bag.filter((k) => !exclude.includes(k)) : bag;
  const use = pool.length ? pool : bag;
  return use[Math.floor(Math.random() * use.length)]!;
}

export function makeCell(kind?: TileKind, colors = 6): Cell {
  return { kind: kind ?? randomKind(colors), id: freshId() };
}

export function inBounds(c: number, r: number): boolean {
  return c >= 0 && c < COLS && r >= 0 && r < ROWS;
}

export function isPlayable(mask: BoardMask, c: number, r: number): boolean {
  return inBounds(c, r) && !!mask[c]![r];
}

export function cloneBoard(board: Board): Board {
  return board.map((col) =>
    col.map((cell) => (cell ? { ...cell } : null)),
  );
}

export function createBoard(
  shape: BoardShapeId,
  opts: { colors?: number; obstaclePlan?: ObstacleSpec[] } = {},
): { board: Board; mask: BoardMask } {
  const colors = opts.colors ?? 5;
  const mask = shapeMask(shape);
  const board: Board = Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => null),
  );

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!mask[c]![r]) continue;
      const banned: TileKind[] = [];
      if (r >= 2 && mask[c]![r - 1] && mask[c]![r - 2]) {
        const a = board[c]![r - 1]?.kind;
        const b = board[c]![r - 2]?.kind;
        if (a && a === b) banned.push(a);
      }
      if (c >= 2 && mask[c - 1]![r] && mask[c - 2]![r]) {
        const a = board[c - 1]![r]?.kind;
        const b = board[c - 2]![r]?.kind;
        if (a && a === b) banned.push(a);
      }
      board[c]![r] = makeCell(randomKind(colors, banned), colors);
    }
  }

  if (opts.obstaclePlan?.length) {
    placeObstaclePlan(board, mask, opts.obstaclePlan);
  }
  return { board, mask };
}

export function areAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1;
}

export function swapCells(board: Board, a: Pos, b: Pos): void {
  const tmp = board[a.c]![a.r]!;
  board[a.c]![a.r] = board[b.c]![b.r]!;
  board[b.c]![b.r] = tmp;
}

export function findMatches(board: Board, mask: BoardMask): MatchGroup[] {
  const groups: MatchGroup[] = [];

  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const leftOk = c > 0 && mask[c - 1]?.[r] && board[c - 1]![r];
      const curOk = c < COLS && mask[c]?.[r] && board[c]![r];
      const same =
        curOk &&
        leftOk &&
        board[c]![r]!.kind === board[c - 1]![r]!.kind &&
        !board[c]![r]!.obstacle &&
        !board[c - 1]![r]!.obstacle;
      if (same) {
        run++;
        continue;
      }
      if (run >= 3) {
        const kind = board[c - 1]![r]!.kind;
        const cells: Pos[] = [];
        for (let i = c - run; i < c; i++) cells.push({ c: i, r });
        groups.push({ kind, cells });
      }
      run = 1;
    }
  }

  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const upOk = r > 0 && mask[c]?.[r - 1] && board[c]![r - 1];
      const curOk = r < ROWS && mask[c]?.[r] && board[c]![r];
      const same =
        curOk &&
        upOk &&
        board[c]![r]!.kind === board[c]![r - 1]!.kind &&
        !board[c]![r]!.obstacle &&
        !board[c]![r - 1]!.obstacle;
      if (same) {
        run++;
        continue;
      }
      if (run >= 3) {
        const kind = board[c]![r - 1]!.kind;
        const cells: Pos[] = [];
        for (let i = r - run; i < r; i++) cells.push({ c, r: i });
        const existing = groups.find(
          (g) =>
            g.kind === kind &&
            g.cells.some((p) => cells.some((q) => q.c === p.c && q.r === p.r)),
        );
        if (existing) {
          for (const p of cells) {
            if (!existing.cells.some((q) => q.c === p.c && q.r === p.r)) {
              existing.cells.push(p);
            }
          }
        } else {
          groups.push({ kind, cells });
        }
      }
      run = 1;
    }
  }

  return groups;
}

export function damageAdjacentObstacles(
  board: Board,
  mask: BoardMask,
  groups: MatchGroup[],
): Pos[] {
  const matched = new Set(groups.flatMap((g) => g.cells.map((p) => `${p.c},${p.r}`)));
  const cleared: Pos[] = [];
  const seen = new Set<string>();
  for (const key of matched) {
    const [cs, rs] = key.split(",").map(Number);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const c = cs! + dc;
      const r = rs! + dr;
      if (!isPlayable(mask, c, r)) continue;
      const k = `${c},${r}`;
      if (seen.has(k) || matched.has(k)) continue;
      seen.add(k);
      const cell = board[c]![r];
      if (!cell?.obstacle) continue;
      cell.hits = (cell.hits ?? 1) - 1;
      if ((cell.hits ?? 0) <= 0) {
        delete cell.obstacle;
        delete cell.hits;
        cleared.push({ c, r });
      }
    }
  }
  return cleared;
}

/** Crush matches then gravity within mask; refill from top. */
export function crushAndRefill(
  board: Board,
  mask: BoardMask,
  groups: MatchGroup[],
  colors: number,
): number {
  const dead = new Set<string>();
  for (const g of groups) {
    for (const p of g.cells) dead.add(`${p.c},${p.r}`);
  }
  for (const key of dead) {
    const [c, r] = key.split(",").map(Number);
    board[c!]![r!] = null;
  }

  for (let c = 0; c < COLS; c++) {
    const kept: Cell[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!mask[c]![r]) continue;
      const cell = board[c]![r];
      if (cell) kept.push(cell);
      board[c]![r] = null;
    }
    let ki = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!mask[c]![r]) continue;
      if (ki < kept.length) {
        board[c]![r] = kept[ki++]!;
      } else {
        board[c]![r] = makeCell(undefined, colors);
      }
    }
  }
  return dead.size;
}

export function clearPositions(
  board: Board,
  mask: BoardMask,
  positions: Pos[],
  colors: number,
): number {
  const dead = new Set(
    positions.filter((p) => isPlayable(mask, p.c, p.r)).map((p) => `${p.c},${p.r}`),
  );
  for (const key of dead) {
    const [c, r] = key.split(",").map(Number);
    board[c!]![r!] = null;
  }
  for (let c = 0; c < COLS; c++) {
    const kept: Cell[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!mask[c]![r]) continue;
      const cell = board[c]![r];
      if (cell) kept.push(cell);
      board[c]![r] = null;
    }
    let ki = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!mask[c]![r]) continue;
      if (ki < kept.length) board[c]![r] = kept[ki++]!;
      else board[c]![r] = makeCell(undefined, colors);
    }
  }
  return dead.size;
}

export function countKind(groups: MatchGroup[], kind: TileKind): number {
  let n = 0;
  const seen = new Set<string>();
  for (const g of groups) {
    if (g.kind !== kind) continue;
    for (const p of g.cells) {
      const k = `${p.c},${p.r}`;
      if (seen.has(k)) continue;
      seen.add(k);
      n++;
    }
  }
  return n;
}

export function hasAnyMatch(board: Board, mask: BoardMask): boolean {
  return findMatches(board, mask).length > 0;
}

export function swapCreatesMatch(
  board: Board,
  mask: BoardMask,
  a: Pos,
  b: Pos,
): boolean {
  if (!isPlayable(mask, a.c, a.r) || !isPlayable(mask, b.c, b.r)) return false;
  const ca = board[a.c]![a.r];
  const cb = board[b.c]![b.r];
  if (!canSwapCell(ca) || !canSwapCell(cb)) return false;
  const copy = cloneBoard(board);
  swapCells(copy, a, b);
  return hasAnyMatch(copy, mask);
}
