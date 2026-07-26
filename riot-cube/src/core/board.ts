import {
  TILE_KINDS,
  type Cell,
  type Coord,
  type MatchGroup,
  type TileKind,
  type Twist,
} from "./types";

export type Board = Cell[][];

export function createEmpty(size: number): Board {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(null));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function boardSize(board: Board): number {
  return board.length;
}

/** Mulberry32 — small deterministic RNG. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomKind(rng: () => number, exclude?: TileKind[]): TileKind {
  const pool = exclude?.length
    ? TILE_KINDS.filter((k) => !exclude.includes(k))
    : [...TILE_KINDS];
  return pool[Math.floor(rng() * pool.length)]!;
}

/** Fill board with no pre-existing matches of 3+. */
export function generateBoard(size: number, seed: number): Board {
  const rng = mulberry32(seed);
  const board = createEmpty(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const banned: TileKind[] = [];
      if (c >= 2 && board[r]![c - 1] === board[r]![c - 2]) {
        banned.push(board[r]![c - 1]!);
      }
      if (r >= 2 && board[r - 1]![c] === board[r - 2]![c]) {
        banned.push(board[r - 1]![c]!);
      }
      board[r]![c] = randomKind(rng, banned);
    }
  }
  return board;
}

export function twistBoard(board: Board, twist: Twist): Board {
  const next = cloneBoard(board);
  const n = boardSize(next);
  const amount = Math.max(1, twist.amount ?? 1);
  const shift = (((twist.dir * amount) % n) + n) % n;
  if (twist.axis === "row") {
    const row = next[twist.index]!;
    const copy = row.slice();
    for (let c = 0; c < n; c++) {
      row[c] = copy[(c - shift + n) % n]!;
    }
  } else {
    const copy = Array.from({ length: n }, (_, r) => next[r]![twist.index]!);
    for (let r = 0; r < n; r++) {
      next[r]![twist.index] = copy[(r - shift + n) % n]!;
    }
  }
  return next;
}

function key(r: number, c: number): string {
  return `${r},${c}`;
}

/** Find all match groups of length >= 3 (rows and columns). Overlaps share cells. */
export function findMatches(board: Board): MatchGroup[] {
  const n = boardSize(board);
  const groups: MatchGroup[] = [];

  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      const kind = board[r]![c];
      if (!kind) {
        c++;
        continue;
      }
      let end = c + 1;
      while (end < n && board[r]![end] === kind) end++;
      if (end - c >= 3) {
        const cells: Coord[] = [];
        for (let i = c; i < end; i++) cells.push({ r, c: i });
        groups.push({ kind, cells });
      }
      c = end;
    }
  }

  for (let c = 0; c < n; c++) {
    let r = 0;
    while (r < n) {
      const kind = board[r]![c];
      if (!kind) {
        r++;
        continue;
      }
      let end = r + 1;
      while (end < n && board[end]![c] === kind) end++;
      if (end - r >= 3) {
        const cells: Coord[] = [];
        for (let i = r; i < end; i++) cells.push({ r: i, c });
        groups.push({ kind, cells });
      }
      r = end;
    }
  }

  return groups;
}

export function matchedCells(groups: MatchGroup[]): Set<string> {
  const set = new Set<string>();
  for (const g of groups) {
    for (const { r, c } of g.cells) set.add(key(r, c));
  }
  return set;
}

export type ClearResult = {
  board: Board;
  cleared: { kind: TileKind; count: number }[];
  cellCount: number;
};

export function clearMatches(board: Board, groups: MatchGroup[]): ClearResult {
  const next = cloneBoard(board);
  const cells = matchedCells(groups);
  const counts = new Map<TileKind, number>();
  for (const k of cells) {
    const [rs, cs] = k.split(",");
    const r = Number(rs);
    const c = Number(cs);
    const kind = next[r]![c];
    if (kind) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
      next[r]![c] = null;
    }
  }
  return {
    board: next,
    cleared: [...counts.entries()].map(([kind, count]) => ({ kind, count })),
    cellCount: cells.size,
  };
}

/** Gravity down; empty cells rise. Does not refill. */
export function applyGravity(board: Board): Board {
  const n = boardSize(board);
  const next = createEmpty(n);
  for (let c = 0; c < n; c++) {
    const stack: TileKind[] = [];
    for (let r = n - 1; r >= 0; r--) {
      const cell = board[r]![c];
      if (cell) stack.push(cell);
    }
    for (let i = 0; i < stack.length; i++) {
      next[n - 1 - i]![c] = stack[i]!;
    }
  }
  return next;
}

export function refillBoard(board: Board, rng: () => number): Board {
  const n = boardSize(board);
  const next = cloneBoard(board);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!next[r]![c]) next[r]![c] = randomKind(rng);
    }
  }
  return next;
}

export type ResolveStep =
  | { type: "match"; groups: MatchGroup[]; cleared: ClearResult["cleared"]; cellCount: number; scoreGain: number }
  | { type: "gravity" }
  | { type: "refill" };

export type ResolveResult = {
  board: Board;
  steps: ResolveStep[];
  totalCleared: { kind: TileKind; count: number }[];
  scoreGain: number;
  combo: number;
};

function mergeCleared(
  into: Map<TileKind, number>,
  cleared: { kind: TileKind; count: number }[],
): void {
  for (const { kind, count } of cleared) {
    into.set(kind, (into.get(kind) ?? 0) + count);
  }
}

/** After a twist: match → clear → gravity → refill, repeat until stable. */
export function resolveBoard(board: Board, rng: () => number): ResolveResult {
  let current = cloneBoard(board);
  const steps: ResolveStep[] = [];
  const totals = new Map<TileKind, number>();
  let scoreGain = 0;
  let combo = 0;

  for (;;) {
    const groups = findMatches(current);
    if (groups.length === 0) break;
    combo += 1;
    const cleared = clearMatches(current, groups);
    const gain = cleared.cellCount * 10 * combo;
    scoreGain += gain;
    mergeCleared(totals, cleared.cleared);
    steps.push({
      type: "match",
      groups,
      cleared: cleared.cleared,
      cellCount: cleared.cellCount,
      scoreGain: gain,
    });
    current = cleared.board;
    steps.push({ type: "gravity" });
    current = applyGravity(current);
    steps.push({ type: "refill" });
    current = refillBoard(current, rng);
  }

  return {
    board: current,
    steps,
    totalCleared: [...totals.entries()].map(([kind, count]) => ({ kind, count })),
    scoreGain,
    combo,
  };
}
