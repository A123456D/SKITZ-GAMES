import { bufferCost } from "./buffer";
import type {
  Axis,
  Cell,
  CellKind,
  DatamineDef,
  LevelDef,
  Matrix,
  Pos,
  Token,
} from "./types";
import { TOKENS } from "./types";

/** Mulberry32 — tiny seeded RNG. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickToken(rng: () => number, alphabet: readonly Token[] = TOKENS): Token {
  return alphabet[Math.floor(rng() * alphabet.length)]!;
}

export function emptyMatrix(size: number, fill: Token = "1C"): Matrix {
  const m: Matrix = [];
  for (let r = 0; r < size; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < size; c++) {
      row.push({ token: fill, kind: "code", used: false });
    }
    m.push(row);
  }
  return m;
}

export function matrixFromFixed(
  tokens: Token[][],
  kinds?: CellKind[][],
): Matrix {
  const size = tokens.length;
  const m: Matrix = [];
  for (let r = 0; r < size; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < size; c++) {
      row.push({
        token: tokens[r]![c]!,
        kind: kinds?.[r]?.[c] ?? "code",
        used: false,
      });
    }
    m.push(row);
  }
  return m;
}

export function cloneMatrix(m: Matrix): Matrix {
  return m.map((row) => row.map((cell) => ({ ...cell })));
}

/**
 * After picking `last`, the next axis is the opposite of the one just used.
 * First pick: axis stays null until we know which direction they commit to
 * — CP2077 style: first pick free, then you choose a cell in the same row OR
 * same column... wait, classic Breach Protocol:
 * - First selection: any cell (often any in first row in some UIs, but game allows any)
 * - After first: you must pick in the SAME ROW, then SAME COLUMN alternating.
 *
 * Actually CP2077: Start by selecting a code in the Code Matrix. After that,
 * you alternate between selecting codes from the same ROW then same COLUMN.
 * So after first pick at (c,r), next must be same ROW (any other col), then
 * same COLUMN as the second pick, etc.
 *
 * So: first pick free. After pick N, if N is odd (1-based), next is row-locked
 * to last.r; if N is even, next is col-locked to last.c.
 * Pick 1 -> next axis = row (same row as pick 1)
 * Pick 2 -> next axis = col (same col as pick 2)
 * Pick 3 -> next axis = row
 */
export function nextAxis(pickCount: number): Axis {
  if (pickCount === 0) return null;
  return pickCount % 2 === 1 ? "row" : "col";
}

export function isLegalPick(
  matrix: Matrix,
  pos: Pos,
  last: Pos | null,
  axis: Axis,
  opts: { firstRowOnly?: boolean } = {},
): boolean {
  const size = matrix.length;
  if (pos.c < 0 || pos.r < 0 || pos.c >= size || pos.r >= size) return false;
  const cell = matrix[pos.r]![pos.c]!;
  if (cell.used) return false;
  if (cell.kind === "jam") return false;

  if (axis === null) {
    if (opts.firstRowOnly && pos.r !== 0) return false;
    return true;
  }
  if (!last) return false;
  if (axis === "row") return pos.r === last.r && pos.c !== last.c;
  return pos.c === last.c && pos.r !== last.r;
}

export function legalPicks(
  matrix: Matrix,
  last: Pos | null,
  axis: Axis,
  opts: { firstRowOnly?: boolean } = {},
): Pos[] {
  const size = matrix.length;
  const out: Pos[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const p = { c, r };
      if (isLegalPick(matrix, p, last, axis, opts)) out.push(p);
    }
  }
  return out;
}

/** Can we afford this cell given remaining buffer slots? */
export function canAfford(remaining: number, kind: CellKind): boolean {
  return remaining >= bufferCost(kind);
}

/**
 * Walk a random legal path of exact length `len`.
 * Returns null if stuck.
 */
export function randomPath(
  matrix: Matrix,
  len: number,
  rng: () => number,
  opts: { firstRowOnly?: boolean } = {},
): Pos[] | null {
  const path: Pos[] = [];
  const sim = cloneMatrix(matrix);
  let last: Pos | null = null;
  let axis: Axis = null;

  for (let i = 0; i < len; i++) {
    const candidates: Pos[] = legalPicks(sim, last, axis, opts).filter(
      (p) => canAfford(len - i, sim[p.r]![p.c]!.kind),
    );
    if (candidates.length === 0) return null;
    const pick: Pos = candidates[Math.floor(rng() * candidates.length)]!;
    path.push(pick);
    sim[pick.r]![pick.c]!.used = true;
    last = pick;
    axis = nextAxis(path.length);
  }
  return path;
}

/**
 * Build a solvable matrix: plant a path covering Datamine sequences
 * (chained / overlapping), fill noise, optionally place jam/sticky ICE.
 */
export function generatePuzzle(level: LevelDef): {
  matrix: Matrix;
  path: Pos[];
} {
  if (level.fixed) {
    return {
      matrix: matrixFromFixed(level.fixed.tokens, level.fixed.kinds),
      path: [],
    };
  }

  const rng = mulberry32(level.seed);
  const size = level.size;
  const matrix = emptyMatrix(size);
  const mines = [...level.datamines].sort((a, b) => a.tier - b.tier);
  const firstRowOnly = true;

  // Plant V1+V2 always; include V3 in footprint only if it fits buffer (greedy expert).
  let footprint: Token[] = [];
  for (const d of mines) {
    if (d.tier === 3) {
      const merged = mergeSequence(footprint, d.sequence);
      if (merged.length <= level.buffer) footprint = merged;
      continue;
    }
    footprint = mergeSequence(footprint, d.sequence);
  }

  const pathLen = Math.min(level.buffer, Math.max(footprint.length, 1));
  while (footprint.length > level.buffer) footprint.pop();

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      matrix[r]![c]!.token = pickToken(rng);
      matrix[r]![c]!.kind = "code";
      matrix[r]![c]!.used = false;
    }
  }

  if (level.twists.jam) {
    const scale = level.twists.hazardScale ?? 1;
    const jamCount = Math.max(2, Math.floor(size * size * 0.18 * scale));
    let placed = 0;
    let guard = 0;
    while (placed < jamCount && guard++ < 400) {
      const c = Math.floor(rng() * size);
      const r = Math.floor(rng() * size);
      if (r === 0) continue;
      if (matrix[r]![c]!.kind === "jam") continue;
      matrix[r]![c]!.kind = "jam";
      placed++;
    }
  }

  let path: Pos[] | null = null;
  for (let attempt = 0; attempt < 80; attempt++) {
    path = randomPath(matrix, pathLen, rng, { firstRowOnly });
    if (path) break;
  }
  if (!path) {
    for (const row of matrix) for (const cell of row) cell.kind = "code";
    path = randomPath(matrix, pathLen, rng, { firstRowOnly });
  }
  if (!path) {
    path = forcedSnakePath(size, pathLen, firstRowOnly);
  }

  for (let i = 0; i < path.length; i++) {
    const p = path[i]!;
    const token = i < footprint.length ? footprint[i]! : pickToken(rng);
    matrix[p.r]![p.c]!.token = token;
    matrix[p.r]![p.c]!.kind = "code";
  }

  plantDecoys(matrix, path, mines, rng);

  if (level.twists.sticky) {
    const scale = level.twists.hazardScale ?? 1;
    const stickyCount = Math.max(2, Math.floor(size * size * 0.12 * scale));
    let placed = 0;
    let guard = 0;
    const pathSet = new Set(path.map((p) => `${p.c},${p.r}`));
    while (placed < stickyCount && guard++ < 400) {
      const c = Math.floor(rng() * size);
      const r = Math.floor(rng() * size);
      const key = `${c},${r}`;
      if (pathSet.has(key)) continue;
      if (matrix[r]![c]!.kind !== "code") continue;
      matrix[r]![c]!.kind = "sticky";
      placed++;
    }
  }

  return { matrix, path };
}

function plantDecoys(
  matrix: Matrix,
  path: Pos[],
  mines: { sequence: Token[] }[],
  rng: () => number,
): void {
  if (mines.length === 0) return;
  const pathSet = new Set(path.map((p) => `${p.c},${p.r}`));
  const prefixes = mines.map((d) => d.sequence[0]!).filter(Boolean);
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      if (pathSet.has(`${c},${r}`)) continue;
      const cell = matrix[r]![c]!;
      if (cell.kind === "jam") continue;
      if (rng() < 0.28) {
        cell.token = prefixes[Math.floor(rng() * prefixes.length)]!;
      }
    }
  }
}

/** Merge seq into existing footprint: if seq is already a subsequence, keep; else append. */
function mergeSequence(footprint: Token[], seq: Token[]): Token[] {
  if (sequenceIsSubsequence(footprint, seq)) return footprint;
  // Try to extend using shared prefix overlap.
  for (let overlap = Math.min(footprint.length, seq.length); overlap > 0; overlap--) {
    let ok = true;
    for (let i = 0; i < overlap; i++) {
      if (footprint[footprint.length - overlap + i] !== seq[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return [...footprint, ...seq.slice(overlap)];
  }
  return [...footprint, ...seq];
}

function sequenceIsSubsequence(hay: Token[], needle: Token[]): boolean {
  if (needle.length === 0) return true;
  if (hay.length < needle.length) return false;
  outer: for (let s = 0; s <= hay.length - needle.length; s++) {
    for (let i = 0; i < needle.length; i++) {
      if (hay[s + i] !== needle[i]) continue outer;
    }
    return true;
  }
  return false;
}

function forcedSnakePath(
  size: number,
  len: number,
  firstRowOnly?: boolean,
): Pos[] {
  const path: Pos[] = [];
  let c = 0;
  let r = firstRowOnly ? 0 : 0;
  path.push({ c, r });
  let axis: Axis = "row";
  while (path.length < len) {
    if (axis === "row") {
      const nextC = (c + 1) % size;
      if (path.some((p) => p.c === nextC && p.r === r)) {
        // step down in column
        axis = "col";
        continue;
      }
      c = nextC;
      path.push({ c, r });
      axis = "col";
    } else {
      const nextR = (r + 1) % size;
      if (path.some((p) => p.c === c && p.r === nextR)) {
        axis = "row";
        continue;
      }
      r = nextR;
      path.push({ c, r });
      axis = "row";
    }
    if (path.length > len + size * size) break;
  }
  return path.slice(0, len);
}

export function scrambleUnused(
  matrix: Matrix,
  rng: () => number,
  alphabet: readonly Token[] = TOKENS,
  rate = 0.18,
): Pos[] {
  const changed: Pos[] = [];
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      const cell = matrix[r]![c]!;
      if (cell.used || cell.kind === "jam") continue;
      if (rng() < rate) {
        cell.token = pickToken(rng, alphabet);
        changed.push({ c, r });
      }
    }
  }
  return changed;
}

export function makeDatamine(
  id: string,
  tier: 1 | 2 | 3,
  sequence: Token[],
): DatamineDef {
  return {
    id,
    name: `DATAMINE V${tier}`,
    tier,
    sequence,
  };
}
