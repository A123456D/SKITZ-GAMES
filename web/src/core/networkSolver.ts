import { rotateDir, type Vec2 } from "./cellKind";
import { type GridState } from "./gridState";
import { Module } from "./tableDef";
import { basePorts } from "./portWiring";
import type { Beam, TurnResult } from "./beamSolver";

export type NetworkStats = {
  looseEnds: number;
  matchedEdges: number;
  components: number;
  discCount: number;
};

const MODULE_COUNT = Object.keys(Module).length;

/** Open ports as a 4-bit mask (bit d = Dir d), indexed [module * 4 + rotationQ]. */
const PORT_MASKS = (() => {
  const masks = new Int32Array(MODULE_COUNT * 4);
  for (let module = 0; module < MODULE_COUNT; module++) {
    const ports = basePorts(module);
    for (let q = 0; q < 4; q++) {
      let m = 0;
      for (const p of ports) m |= 1 << rotateDir(p, q);
      masks[module * 4 + q] = m;
    }
  }
  return masks;
})();

export function portMask(module: number, rotationQ: number): number {
  const q = ((rotationQ % 4) + 4) % 4;
  const m = PORT_MASKS[module * 4 + q];
  return m === undefined ? 0 : m;
}

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// Scratch buffers: analysis runs every frame and thousands of times per
// generated level, so it must not allocate.
let lookup = new Int32Array(0);
let masks = new Int32Array(0);
let parent = new Int32Array(0);
let flagged = new Uint8Array(0);

function ensure(cellCount: number, discCount: number): void {
  if (lookup.length < cellCount) lookup = new Int32Array(cellCount);
  if (masks.length < discCount) {
    masks = new Int32Array(discCount);
    parent = new Int32Array(discCount);
    flagged = new Uint8Array(discCount);
  }
}

function findRoot(i: number): number {
  let r = i;
  while (parent[r]! !== r) r = parent[r]!;
  // Path compression keeps repeated analysis flat.
  let cur = i;
  while (parent[cur]! !== r) {
    const next = parent[cur]!;
    parent[cur] = r;
    cur = next;
  }
  return r;
}

/**
 * Dense Net/Pipes solve:
 * - every open port must meet a matching opposite port on a neighbor
 * - all discs form exactly one connected component
 *
 * `statsOnly` skips the beam/problem-cell objects the view needs.
 */
export function analyzeNetwork(
  state: GridState,
  previewRot?: Map<number, number>,
  statsOnly = false,
): NetworkStats & { beams: Beam[]; problemCells: Vec2[]; won: boolean } {
  const discs = state.tables;
  const discCount = discs.length;
  const w = state.width;
  const h = state.height;
  const cellCount = w * h;
  ensure(cellCount, discCount);
  lookup.fill(-1, 0, cellCount);

  for (let i = 0; i < discCount; i++) {
    const t = discs[i]!;
    const hx = t.hub.x;
    const hy = t.hub.y;
    if (hx >= 0 && hy >= 0 && hx < w && hy < h) lookup[hy * w + hx] = i;
    const rot = previewRot?.get(t.id) ?? t.rotationQ;
    masks[i] = portMask(t.module, rot);
    parent[i] = i;
    flagged[i] = 0;
  }

  const beams: Beam[] = [];
  const problemCells: Vec2[] = [];
  let looseEnds = 0;
  let matchedEdges = 0;

  for (let i = 0; i < discCount; i++) {
    const t = discs[i]!;
    const mask = masks[i]!;
    if (!mask) continue;
    for (let d = 0; d < 4; d++) {
      if (!(mask & (1 << d))) continue;
      const nx = t.hub.x + DX[d]!;
      const ny = t.hub.y + DY[d]!;
      const inside = nx >= 0 && ny >= 0 && nx < w && ny < h;
      const nb = inside ? lookup[ny * w + nx]! : -1;
      const matched = nb >= 0 && (masks[nb]! & (1 << ((d + 2) % 4))) !== 0;
      if (!matched) {
        looseEnds++;
        if (!statsOnly && !flagged[i]) {
          flagged[i] = 1;
          problemCells.push({ x: t.hub.x, y: t.hub.y });
        }
        continue;
      }
      // Count each undirected edge once, from the lower disc index.
      if (nb < i) continue;
      matchedEdges++;
      const ra = findRoot(i);
      const rb = findRoot(nb);
      if (ra !== rb) parent[ra] = rb;
      if (!statsOnly) {
        beams.push({
          segments: [{ from: { x: t.hub.x, y: t.hub.y }, to: { x: nx, y: ny } }],
          origin: { x: t.hub.x, y: t.hub.y },
          channel: 0,
          phase: 0,
        });
      }
    }
  }

  let components = 0;
  for (let i = 0; i < discCount; i++) if (findRoot(i) === i) components++;
  const won = discCount > 0 && looseEnds === 0 && components === 1;

  return {
    looseEnds,
    matchedEdges,
    components,
    discCount,
    beams,
    problemCells,
    won,
  };
}

/** Cheap closed-circuit test — no allocations, no beam objects. */
export function isNetworkClosed(state: GridState, previewRot?: Map<number, number>): boolean {
  return analyzeNetwork(state, previewRot, true).won;
}

/** Drop-in solve used by the session — same TurnResult shape as the old beam solver. */
export function solve(state: GridState, previewRot?: Map<number, number>): TurnResult {
  const net = analyzeNetwork(state, previewRot);
  return {
    beams: net.beams,
    energizedReceivers: net.won ? state.tables.map((t) => ({ ...t.hub })) : [],
    spillReceivers: net.problemCells,
    won: net.won,
    moveApplied: false,
    tableId: -1,
    deltaQ: 0,
    newlyLitReceivers: [],
    events: [],
  };
}

/**
 * Flat board view for search: rotations live in one Int8Array so the generator
 * can explore thousands of candidate states without cloning grids.
 */
export type FastNet = {
  discCount: number;
  modules: Int8Array;
  /** neighbor disc index per (disc, dir), -1 when off-board or empty. */
  neighbors: Int32Array;
  /** disc ids in slot order, so callers can map back to TableDef ids. */
  ids: Int32Array;
  /** slot index per disc id. */
  slotOfId: Map<number, number>;
  movable: number[];
  rotations: Int8Array;
};

/** Returns null for boards the fast path can't model (geared discs). */
export function buildFastNet(state: GridState): FastNet | null {
  const discs = state.tables;
  const n = discs.length;
  if (!n) return null;
  const w = state.width;
  const h = state.height;
  const grid = new Int32Array(w * h).fill(-1);
  const slotOfId = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const t = discs[i]!;
    if (t.link) return null;
    const hx = t.hub.x;
    const hy = t.hub.y;
    if (hx < 0 || hy < 0 || hx >= w || hy >= h) return null;
    grid[hy * w + hx] = i;
    slotOfId.set(t.id, i);
  }

  const modules = new Int8Array(n);
  const rotations = new Int8Array(n);
  const ids = new Int32Array(n);
  const neighbors = new Int32Array(n * 4);
  const movable: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = discs[i]!;
    modules[i] = t.module;
    rotations[i] = ((t.rotationQ % 4) + 4) % 4;
    ids[i] = t.id;
    if (!t.locked) movable.push(i);
    for (let d = 0; d < 4; d++) {
      const nx = t.hub.x + DX[d]!;
      const ny = t.hub.y + DY[d]!;
      neighbors[i * 4 + d] =
        nx >= 0 && ny >= 0 && nx < w && ny < h ? grid[ny * w + nx]! : -1;
    }
  }
  return { discCount: n, modules, neighbors, ids, slotOfId, movable, rotations };
}

let visitScratch = new Uint8Array(0);
let stackScratch = new Int32Array(0);

/** True when `rotations` closes the circuit: no loose ends, one component. */
export function fastWon(net: FastNet, rotations: Int8Array): boolean {
  const n = net.discCount;
  const { modules, neighbors } = net;
  for (let i = 0; i < n; i++) {
    const mask = portMask(modules[i]!, rotations[i]!);
    for (let d = 0; d < 4; d++) {
      if (!(mask & (1 << d))) continue;
      const nb = neighbors[i * 4 + d]!;
      if (nb < 0) return false;
      if (!(portMask(modules[nb]!, rotations[nb]!) & (1 << ((d + 2) % 4)))) return false;
    }
  }
  // Every open port matches, so connectivity decides it.
  if (visitScratch.length < n) {
    visitScratch = new Uint8Array(n);
    stackScratch = new Int32Array(n);
  }
  visitScratch.fill(0, 0, n);
  let top = 0;
  stackScratch[top++] = 0;
  visitScratch[0] = 1;
  let seen = 1;
  while (top > 0) {
    const cur = stackScratch[--top]!;
    const mask = portMask(modules[cur]!, rotations[cur]!);
    for (let d = 0; d < 4; d++) {
      if (!(mask & (1 << d))) continue;
      const nb = neighbors[cur * 4 + d]!;
      if (nb < 0 || visitScratch[nb]) continue;
      visitScratch[nb] = 1;
      seen++;
      stackScratch[top++] = nb;
    }
  }
  return seen === n;
}