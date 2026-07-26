/**
 * Dense Net/Pipes-style circuit generator.
 * Every cell is a disc; win = no loose ends + one connected component.
 */
import { Dir, type Vec2 } from "./cellKind";
import { buildState, cell, move, type LevelData, type MoveStep } from "./levelData";
import { Module as M, makeTable, type TableDef } from "./tableDef";
import { moduleForPorts } from "./portWiring";
import { setTableRotation } from "./rotateOps";
import { applySolutionStep, loadLevel, pulse } from "./puzzleSession";
import { analyzeNetwork, buildFastNet, fastWon, solve } from "./networkSolver";

export const DIFFICULTY_COUNT = 20;

type Rng = () => number;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function levelTitle(diff: number): string {
  return `No. ${String(diff).padStart(3, "0")}`;
}

function profile(diff: number) {
  const d = Math.max(1, Math.min(DIFFICULTY_COUNT, diff));
  // Size is the difficulty lever: denser + larger = more ambiguous.
  const size = d <= 2 ? 4 : d <= 5 ? 5 : d <= 10 ? 6 : d <= 15 ? 7 : 8;
  const extraEdges =
    d <= 2 ? 0 : d <= 6 ? 1 : d <= 12 ? 2 + Math.floor((d - 7) / 3) : 4;
  // Difficulty comes from board size and ambiguity, not from starving checks:
  // one check earns 3 stars, so the pressure is in the scoring, not the cap.
  const pulseLimit = d >= 13 ? 2 : 3;
  const undoLimit = 0; // unused — undo is free

  const minMoves = Math.min(size * size - 1, 3 + Math.floor(d * 1.2));
  return { diff: d, size, extraEdges, pulseLimit, undoLimit, minMoves };
}

type Edge = { a: number; b: number }; // cell indices

function cellIndex(x: number, y: number, w: number): number {
  return y * w + x;
}

function cellPos(i: number, w: number): Vec2 {
  return { x: i % w, y: Math.floor(i / w) };
}

/** Random spanning tree + optional chords on a w×h grid. */
function buildTopology(w: number, h: number, extraEdges: number, rng: Rng): Edge[] {
  const n = w * h;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const unite = (a: number, b: number): boolean => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  };

  const candidates: Edge[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = cellIndex(x, y, w);
      if (x + 1 < w) candidates.push({ a: i, b: cellIndex(x + 1, y, w) });
      if (y + 1 < h) candidates.push({ a: i, b: cellIndex(x, y + 1, w) });
    }
  }

  const tree: Edge[] = [];
  for (const e of shuffle(rng, candidates)) {
    if (unite(e.a, e.b)) tree.push(e);
    if (tree.length >= n - 1) break;
  }

  const used = new Set(tree.map((e) => (e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`)));
  const leftover = candidates.filter((e) => {
    const k = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
    return !used.has(k);
  });
  const chords = shuffle(rng, leftover).slice(0, Math.max(0, extraEdges));
  return [...tree, ...chords];
}

/** Port dirs open on each cell from undirected edges. */
function portsFromEdges(w: number, h: number, edges: Edge[]): number[][] {
  const ports: number[][] = Array.from({ length: w * h }, () => []);
  for (const e of edges) {
    const pa = cellPos(e.a, w);
    const pb = cellPos(e.b, w);
    if (pb.x === pa.x + 1 && pb.y === pa.y) {
      ports[e.a].push(Dir.E);
      ports[e.b].push(Dir.W);
    } else if (pb.x === pa.x - 1 && pb.y === pa.y) {
      ports[e.a].push(Dir.W);
      ports[e.b].push(Dir.E);
    } else if (pb.y === pa.y + 1 && pb.x === pa.x) {
      ports[e.a].push(Dir.S);
      ports[e.b].push(Dir.N);
    } else if (pb.y === pa.y - 1 && pb.x === pa.x) {
      ports[e.a].push(Dir.N);
      ports[e.b].push(Dir.S);
    }
  }
  return ports;
}

function tablesFromPorts(w: number, h: number, ports: number[][]): TableDef[] {
  const tables: TableDef[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = cellIndex(x, y, w);
      const shaped = moduleForPorts(ports[i]!);
      if (!shaped) {
        // Isolated cell — force a random endcap (shouldn't happen with a tree).
        tables.push(makeTable(i, { x, y }, M.ENDCAP, 0, Math.floor(Math.random() * 4), false));
        continue;
      }
      tables.push(makeTable(i, { x, y }, shaped.module, 0, shaped.rotationQ, false));
    }
  }
  return tables;
}

function emptyGrid(w: number, h: number) {
  return Array.from({ length: w * h }, () => cell.empty());
}

/**
 * Rejects boards a player could stumble into within a couple of turns.
 * Runs on flat rotation arrays (no grid cloning) because it is the hot loop of
 * generation — a slow version here is what used to stall the game for seconds.
 */
function hasCheapSolve(
  level: LevelData,
  exactDepth: number,
  probeLen: number,
  probes: number,
): boolean {
  const start = buildState(level);
  const net = buildFastNet(start);
  if (!net) return solve(start).won;
  const base = net.rotations;
  if (fastWon(net, base)) return true;
  const acts = net.movable;
  if (!acts.length) return false;

  const keyOf = (rots: Int8Array): string => String.fromCharCode(...rots);
  const seen = new Set<string>([keyOf(base)]);
  let frontier: Int8Array[] = [base];
  let nodes = 0;
  const cap = 8000;
  outer: for (let depth = 0; depth < exactDepth; depth++) {
    const next: Int8Array[] = [];
    for (const cur of frontier) {
      for (const slot of acts) {
        for (let q = 0; q < 4; q++) {
          if (q === cur[slot]) continue;
          if (nodes >= cap) break outer;
          const cand = Int8Array.from(cur);
          cand[slot] = q;
          const k = keyOf(cand);
          if (seen.has(k)) continue;
          seen.add(k);
          nodes++;
          if (fastWon(net, cand)) return true;
          next.push(cand);
        }
      }
    }
    if (!next.length) break;
    frontier = next;
  }

  let rngState = 0xabc ^ (level.par * 2654435761);
  const rand = () => {
    rngState = (Math.imul(rngState ^ (rngState >>> 15), 1 | rngState) + 0x6d2b79f5) | 0;
    return ((rngState >>> 0) % 100000) / 100000;
  };
  const walk = new Int8Array(net.discCount);
  for (let p = 0; p < probes; p++) {
    walk.set(base);
    const len = 2 + Math.floor(rand() * (probeLen - 1));
    for (let s = 0; s < len; s++) {
      const slot = acts[Math.floor(rand() * acts.length)]!;
      let q = Math.floor(rand() * 4);
      if (q === walk[slot]) q = (q + 1) % 4;
      walk[slot] = q;
      if (fastWon(net, walk)) return true;
    }
  }
  return false;
}

function scrambleAndVerify(
  solvedTables: TableDef[],
  w: number,
  h: number,
  rng: Rng,
  opts: ReturnType<typeof profile>,
  difficulty: number,
  skipAntiCheap = false,
): LevelData | null {
  const cells = emptyGrid(w, h);
  const solved: LevelData = {
    id: `diff_${difficulty}`,
    title: levelTitle(difficulty),
    width: w,
    height: h,
    par: 1,
    undoLimit: opts.undoLimit,
    pulseLimit: opts.pulseLimit,
    tokenBudget: 0,
    tables: solvedTables.map((t) => ({ ...t, hub: { ...t.hub } })),
    cells,
    solution: [],
  };

  const solvedNet = analyzeNetwork(buildState(solved));
  if (!solvedNet.won) return null;

  const g = buildState(solved);
  const solution: MoveStep[] = [];

  for (const t of g.tables) {
    const amount = 1 + Math.floor(rng() * 3); // 1..3
    const sign = rng() < 0.5 ? 1 : -1;
    setTableRotation(g, t.id, t.rotationQ + sign * amount);
    for (let k = 0; k < amount; k++) solution.push(move(t.id, (-sign) as -1 | 1));
  }
  // Ensure nothing accidentally still solved
  for (const t of g.tables) {
    const sol = solvedTables.find((x) => x.id === t.id)!;
    if (((t.rotationQ % 4) + 4) % 4 === ((sol.rotationQ % 4) + 4) % 4) {
      setTableRotation(g, t.id, t.rotationQ + 1);
      solution.push(move(t.id, -1));
    }
  }

  for (let i = solution.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [solution[i], solution[j]] = [solution[j], solution[i]];
  }

  if (solution.length < opts.minMoves) return null;

  const level: LevelData = {
    id: `diff_${difficulty}`,
    title: levelTitle(difficulty),
    width: w,
    height: h,
    par: solution.length,
    undoLimit: opts.undoLimit,
    pulseLimit: opts.pulseLimit,
    tokenBudget: 0,
    tables: g.tables.map((t) => ({
      ...t,
      hub: { ...t.hub },
      link: t.link ? { ...t.link } : undefined,
    })),
    cells: emptyGrid(w, h),
    solution,
    tutorial: false,
    hint:
      difficulty === 1
        ? "Turn every disc so all marks meet. No open ends. Then PULSE."
        : difficulty === 5
          ? "One continuous circuit — every stub must meet another."
          : undefined,
  };

  if (solve(buildState(level)).won) return null;

  if (!skipAntiCheap) {
    const exactDepth = difficulty >= 8 ? 2 : 3;
    const probeLen = difficulty >= 10 ? 5 : 4;
    const probes = difficulty >= 10 ? 1200 : 800;
    if (hasCheapSolve(level, exactDepth, probeLen, probes)) return null;
  }

  const session = loadLevel(level);
  for (const step of solution) {
    if (!applySolutionStep(session, step)) return null;
  }
  if (!pulse(session)) return null;
  if (!session.result.won || session.moves !== level.par) return null;
  return level;
}

/**
 * Generation must never block a frame long enough to feel like a freeze, so it
 * runs against a wall-clock budget: once spent, quality filters relax rather
 * than letting a slow device keep searching.
 */
const BUDGET_MS = 120;

export function generateLevel(difficulty: number, seed: number): LevelData {
  const d = Math.max(1, Math.min(DIFFICULTY_COUNT, difficulty));
  const rng = mulberry32((seed >>> 0) ^ Math.imul(d, 0x9e3779b9));
  const opts = profile(d);
  const attempts = d >= 15 ? 400 : d >= 8 ? 250 : 150;
  const started = now();

  for (let attempt = 0; attempt < attempts; attempt++) {
    const w = opts.size;
    const h = opts.size;
    // Slight jitter on chords so retries differ
    const extras = Math.max(0, opts.extraEdges + (rng() < 0.35 ? -1 : 0) + (rng() < 0.25 ? 1 : 0));
    const edges = buildTopology(w, h, extras, rng);
    const ports = portsFromEdges(w, h, edges);
    const tables = tablesFromPorts(w, h, ports);
    const overBudget = now() - started > BUDGET_MS;
    const level = scrambleAndVerify(tables, w, h, rng, opts, d, overBudget);
    if (level) return level;
  }

  // Last-resort: smaller board, no anti-shortcut
  const w = Math.max(4, opts.size - 1);
  const edges = buildTopology(w, w, 0, rng);
  const ports = portsFromEdges(w, w, edges);
  const tables = tablesFromPorts(w, w, ports);
  const soft = { ...opts, size: w, minMoves: 3, extraEdges: 0 };
  const level = scrambleAndVerify(tables, w, w, rng, soft, d, true);
  if (level) return level;

  throw new Error(`levelGen failed for difficulty ${d} seed ${seed}`);
}

export function allLevels(): LevelData[] {
  return Array.from({ length: Math.min(8, DIFFICULTY_COUNT) }, (_, i) =>
    generateLevel(i + 1, 1000 + i * 97),
  );
}
