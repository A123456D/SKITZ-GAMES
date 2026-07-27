/**
 * Dense Net/Pipes-style circuit generator.
 * Every cell is a disc; win = no loose ends + one connected component.
 *
 * Three phases × six board sizes (3×3 → 8×8):
 *   Phase 1 — turn discs
 *   Phase 2 — geared discs turn together
 *   Phase 3 — gears + row shifts + board turns
 */
import { Dir, type Vec2 } from "./cellKind";
import { buildState, cell, move, rowShift, type LevelData, type MoveStep } from "./levelData";
import { Module as M, makeTable, type TableDef } from "./tableDef";
import { moduleForPorts } from "./portWiring";
import { rotateTable, setTableRotation } from "./rotateOps";
import { applySolutionStep, loadLevel, pulse } from "./puzzleSession";
import { analyzeNetwork, buildFastNet, fastWon, solve } from "./networkSolver";
import { shiftRow } from "./rowShift";

export const PHASE_COUNT = 3;
export const PHASE_LEN = 6;
export const DIFFICULTY_COUNT = PHASE_COUNT * PHASE_LEN;

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

/** 1-based phase for a 1-based difficulty. */
export function phaseOf(diff: number): 1 | 2 | 3 {
  const d = Math.max(1, Math.min(DIFFICULTY_COUNT, diff));
  return (Math.floor((d - 1) / PHASE_LEN) + 1) as 1 | 2 | 3;
}

/** 1-based slot within the phase (1..6). */
export function phaseSlot(diff: number): number {
  const d = Math.max(1, Math.min(DIFFICULTY_COUNT, diff));
  return ((d - 1) % PHASE_LEN) + 1;
}

export function levelTitle(diff: number): string {
  const p = phaseOf(diff);
  const s = phaseSlot(diff);
  return `P${p} · ${String(s).padStart(2, "0")}`;
}

function profile(diff: number) {
  const d = Math.max(1, Math.min(DIFFICULTY_COUNT, diff));
  const phase = phaseOf(d);
  const slot = phaseSlot(d);
  // Same size curve every phase: slot 1 → 3×3 … slot 6 → 8×8.
  const size = Math.min(8, 2 + slot);
  const extraEdges = slot <= 2 ? 0 : slot <= 4 ? 1 : 2;
  const pulseLimit = phase === 1 ? 3 : phase === 2 ? (slot >= 5 ? 2 : 3) : slot >= 4 ? 2 : 3;
  const undoLimit = 0;
  const gearPairs =
    phase === 1 ? 0 : phase === 2 ? Math.min(1 + Math.floor(slot / 2), 4) : Math.min(2 + Math.floor(slot / 2), 5);
  const rowShifts = phase === 3 ? Math.min(1 + Math.floor((slot - 1) / 2), 3) : 0;
  const minMoves = Math.min(size * size - 1, 3 + slot + (phase - 1) * 2);
  return {
    diff: d,
    phase,
    slot,
    size,
    extraEdges,
    pulseLimit,
    undoLimit,
    gearPairs,
    rowShifts,
    minMoves,
    hasGears: phase >= 2,
    allowRowShift: phase >= 3,
    allowBoardTurn: phase >= 3,
  };
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

/** Pair adjacent discs into bidirectional gear links. */
function linkGears(tables: TableDef[], w: number, pairs: number, rng: Rng): void {
  if (pairs <= 0) return;
  const byHub = new Map<string, TableDef>();
  for (const t of tables) byHub.set(`${t.hub.x},${t.hub.y}`, t);
  const candidates: [TableDef, TableDef][] = [];
  for (const t of tables) {
    if (t.link) continue;
    const right = byHub.get(`${t.hub.x + 1},${t.hub.y}`);
    const down = byHub.get(`${t.hub.x},${t.hub.y + 1}`);
    if (right && !right.link) candidates.push([t, right]);
    if (down && !down.link) candidates.push([t, down]);
  }
  let linked = 0;
  for (const [a, b] of shuffle(rng, candidates)) {
    if (linked >= pairs) break;
    if (a.link || b.link) continue;
    const sign: 1 | -1 = rng() < 0.5 ? 1 : -1;
    a.link = { partner: b.id, sign };
    b.link = { partner: a.id, sign };
    linked++;
  }
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
    tables: solvedTables.map((t) => ({
      ...t,
      hub: { ...t.hub },
      link: t.link ? { ...t.link } : undefined,
    })),
    cells,
    solution: [],
    hasGears: opts.hasGears,
    allowRowShift: opts.allowRowShift,
    allowBoardTurn: opts.allowBoardTurn,
  };

  const solvedNet = analyzeNetwork(buildState(solved));
  if (!solvedNet.won) return null;

  const g = buildState(solved);
  const rotateSteps: MoveStep[] = [];
  const visited = new Set<number>();

  // Scramble with rotateTable so geared partners stay in sync. Only emit
  // solution steps for the disc the player actually turns (not the partner).
  for (const t of shuffle(rng, [...g.tables])) {
    if (visited.has(t.id) || t.locked) continue;
    const amount = 1 + Math.floor(rng() * 3);
    const sign = rng() < 0.5 ? 1 : -1;
    if (!rotateTable(g, t.id, sign * amount)) continue;
    for (let k = 0; k < amount; k++) rotateSteps.push(move(t.id, (-sign) as -1 | 1));
    visited.add(t.id);
    if (t.link) visited.add(t.link.partner);
  }

  // Ensure nothing accidentally still solved (ungeared leftovers).
  for (const t of g.tables) {
    if (t.locked || (t.link && visited.has(t.link.partner) && !visited.has(t.id))) continue;
    const sol = solvedTables.find((x) => x.id === t.id)!;
    if (((t.rotationQ % 4) + 4) % 4 === ((sol.rotationQ % 4) + 4) % 4) {
      if (t.link && visited.has(t.id)) continue;
      rotateTable(g, t.id, 1);
      rotateSteps.push(move(t.id, -1));
      visited.add(t.id);
      if (t.link) visited.add(t.link.partner);
    }
  }

  for (let i = rotateSteps.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rotateSteps[i], rotateSteps[j]] = [rotateSteps[j], rotateSteps[i]];
  }

  // Phase 3: break the board with row wraps. Player undoes shifts first.
  const shiftSteps: MoveStep[] = [];
  for (let i = 0; i < opts.rowShifts; i++) {
    const y = Math.floor(rng() * h);
    const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
    if (!shiftRow(g, y, dir)) continue;
    shiftSteps.push(rowShift(y, -dir));
  }

  const solution = [...shiftSteps, ...rotateSteps];
  if (rotateSteps.length < opts.minMoves) return null;

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
    hasGears: opts.hasGears,
    allowRowShift: opts.allowRowShift,
    allowBoardTurn: opts.allowBoardTurn,
    hint:
      difficulty === 1
        ? "Turn every disc so all marks meet. No open ends. Then PULSE."
        : difficulty === 7
          ? "Linked discs turn together — watch the gear partners."
          : difficulty === 13
            ? "Shift rows with the side arrows. Corner buttons turn the board."
            : undefined,
  };

  if (solve(buildState(level)).won) return null;

  // Fast anti-cheap only works without gears; geared boards skip it.
  if (!skipAntiCheap && !opts.hasGears) {
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
  const attempts = opts.phase >= 3 ? 400 : opts.phase >= 2 ? 300 : 150;
  const started = now();

  for (let attempt = 0; attempt < attempts; attempt++) {
    const w = opts.size;
    const h = opts.size;
    const extras = Math.max(0, opts.extraEdges + (rng() < 0.35 ? -1 : 0) + (rng() < 0.25 ? 1 : 0));
    const edges = buildTopology(w, h, extras, rng);
    const ports = portsFromEdges(w, h, edges);
    const tables = tablesFromPorts(w, h, ports);
    linkGears(tables, w, opts.gearPairs, rng);
    const overBudget = now() - started > BUDGET_MS;
    const level = scrambleAndVerify(tables, w, h, rng, opts, d, overBudget);
    if (level) return level;
  }

  // Last-resort: smaller board, no gears/shifts, no anti-shortcut
  const w = Math.max(4, opts.size - 1);
  const edges = buildTopology(w, w, 0, rng);
  const ports = portsFromEdges(w, w, edges);
  const tables = tablesFromPorts(w, w, ports);
  const soft = {
    ...opts,
    size: w,
    minMoves: 3,
    extraEdges: 0,
    gearPairs: 0,
    rowShifts: 0,
    hasGears: false,
    allowRowShift: false,
    allowBoardTurn: false,
  };
  const level = scrambleAndVerify(tables, w, w, rng, soft, d, true);
  if (level) return level;

  throw new Error(`levelGen failed for difficulty ${d} seed ${seed}`);
}

export function allLevels(): LevelData[] {
  return Array.from({ length: Math.min(8, DIFFICULTY_COUNT) }, (_, i) =>
    generateLevel(i + 1, 1000 + i * 97),
  );
}
