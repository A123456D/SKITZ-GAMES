import {
  COLS,
  ROWS,
  TILE_KINDS,
  type Board,
  type Cell,
  type MatchGroup,
  type Pos,
  type TileKind,
} from "./types";

export { COLS, ROWS, TILE_KINDS };

let nextId = 1;

export function freshId(): number {
  return nextId++;
}

export function randomKind(exclude?: TileKind[]): TileKind {
  const pool = exclude?.length
    ? TILE_KINDS.filter((k) => !exclude.includes(k))
    : [...TILE_KINDS];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function makeCell(kind?: TileKind): Cell {
  return { kind: kind ?? randomKind(), id: freshId() };
}

export function inBounds(c: number, r: number): boolean {
  return c >= 0 && c < COLS && r >= 0 && r < ROWS;
}

export function cloneBoard(board: Board): Board {
  return board.map((col) => col.map((cell) => ({ ...cell })));
}

/** Board stored as columns[c][r] with r=0 at top. */
export function createBoard(): Board {
  const board: Board = [];
  for (let c = 0; c < COLS; c++) {
    const col: Cell[] = [];
    for (let r = 0; r < ROWS; r++) {
      const banned: TileKind[] = [];
      if (r >= 2) {
        const a = col[r - 1]!.kind;
        const b = col[r - 2]!.kind;
        if (a === b) banned.push(a);
      }
      if (c >= 2) {
        const a = board[c - 1]![r]!.kind;
        const b = board[c - 2]![r]!.kind;
        if (a === b) banned.push(a);
      }
      col.push(makeCell(randomKind(banned)));
    }
    board.push(col);
  }
  return board;
}

export function areAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1;
}

export function swapCells(board: Board, a: Pos, b: Pos): void {
  const tmp = board[a.c]![a.r]!;
  board[a.c]![a.r] = board[b.c]![b.r]!;
  board[b.c]![b.r] = tmp;
}

export function findMatches(board: Board): MatchGroup[] {
  const groups: MatchGroup[] = [];

  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const same =
        c < COLS && board[c]![r]!.kind === board[c - 1]![r]!.kind;
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
      const same =
        r < ROWS && board[c]![r]!.kind === board[c]![r - 1]!.kind;
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

/** Remove matched cells and collapse columns; returns cleared count. */
export function crushAndRefill(board: Board, groups: MatchGroup[]): number {
  const dead = new Set<string>();
  for (const g of groups) {
    for (const p of g.cells) dead.add(`${p.c},${p.r}`);
  }

  for (let c = 0; c < COLS; c++) {
    const kept: Cell[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!dead.has(`${c},${r}`)) kept.push(board[c]![r]!);
    }
    const missing = ROWS - kept.length;
    const col: Cell[] = [];
    for (let i = 0; i < missing; i++) col.push(makeCell());
    for (let i = kept.length - 1; i >= 0; i--) col.push(kept[i]!);
    board[c] = col;
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

export function hasAnyMatch(board: Board): boolean {
  return findMatches(board).length > 0;
}

export function swapCreatesMatch(board: Board, a: Pos, b: Pos): boolean {
  const copy = cloneBoard(board);
  swapCells(copy, a, b);
  return hasAnyMatch(copy);
}
