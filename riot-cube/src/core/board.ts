import {
  PLAY_KINDS,
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

export function randomKind(
  rng: () => number,
  exclude?: TileKind[],
  kinds: readonly TileKind[] = PLAY_KINDS,
): TileKind {
  const pool = exclude?.length ? kinds.filter((k) => !exclude.includes(k)) : [...kinds];
  const use = pool.length ? pool : [...kinds];
  return use[Math.floor(rng() * use.length)]!;
}

/** Fill board with no pre-existing matches (3+ lines or 2×2 squares). */
export function generateBoard(
  size: number,
  seed: number,
  kinds: readonly TileKind[] = PLAY_KINDS,
): Board {
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
      // Avoid completing a 2×2 of the same sticker
      if (
        r >= 1 &&
        c >= 1 &&
        board[r - 1]![c - 1] &&
        board[r - 1]![c - 1] === board[r - 1]![c] &&
        board[r - 1]![c] === board[r]![c - 1]
      ) {
        banned.push(board[r - 1]![c - 1]!);
      }
      board[r]![c] = randomKind(rng, banned, kinds);
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

function parseKey(k: string): Coord {
  const [rs, cs] = k.split(",");
  return { r: Number(rs), c: Number(cs) };
}

/**
 * Find matches: 3+ in a row/col or 2×2 seeds, then flood-fill through
 * orthogonally connected same stickers (L/T extras clear and cascade).
 */
export function findMatches(board: Board): MatchGroup[] {
  const n = boardSize(board);
  const seed = new Set<string>();

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
        for (let i = c; i < end; i++) seed.add(key(r, i));
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
        for (let i = r; i < end; i++) seed.add(key(i, c));
      }
      r = end;
    }
  }

  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const kind = board[r]![c];
      if (
        kind &&
        board[r]![c + 1] === kind &&
        board[r + 1]![c] === kind &&
        board[r + 1]![c + 1] === kind
      ) {
        seed.add(key(r, c));
        seed.add(key(r, c + 1));
        seed.add(key(r + 1, c));
        seed.add(key(r + 1, c + 1));
      }
    }
  }

  if (seed.size === 0) return [];

  // Expand through ortho-connected same-kind neighbors.
  const matched = new Set<string>(seed);
  const queue = [...seed];
  const dirs: Array<[number, number]> = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  while (queue.length) {
    const cur = queue.pop()!;
    const { r, c } = parseKey(cur);
    const kind = board[r]![c];
    if (!kind) continue;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
      if (board[nr]![nc] !== kind) continue;
      const nk = key(nr, nc);
      if (matched.has(nk)) continue;
      matched.add(nk);
      queue.push(nk);
    }
  }

  // One group per connected component inside the expanded set.
  const groups: MatchGroup[] = [];
  const seen = new Set<string>();
  for (const start of matched) {
    if (seen.has(start)) continue;
    const { r: sr, c: sc } = parseKey(start);
    const kind = board[sr]![sc];
    if (!kind) continue;
    const cells: Coord[] = [];
    const q = [start];
    seen.add(start);
    while (q.length) {
      const cur = q.pop()!;
      const { r, c } = parseKey(cur);
      cells.push({ r, c });
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const nk = key(nr, nc);
        if (!matched.has(nk) || seen.has(nk)) continue;
        if (board[nr]![nc] !== kind) continue;
        seen.add(nk);
        q.push(nk);
      }
    }
    groups.push({ kind, cells });
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

export function refillBoard(
  board: Board,
  rng: () => number,
  kinds: readonly TileKind[] = PLAY_KINDS,
): Board {
  const n = boardSize(board);
  const next = cloneBoard(board);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!next[r]![c]) next[r]![c] = randomKind(rng, undefined, kinds);
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
export function resolveBoard(
  board: Board,
  rng: () => number,
  kinds: readonly TileKind[] = PLAY_KINDS,
): ResolveResult {
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
    current = refillBoard(current, rng, kinds);
  }

  return {
    board: current,
    steps,
    totalCleared: [...totals.entries()].map(([kind, count]) => ({ kind, count })),
    scoreGain,
    combo,
  };
}
