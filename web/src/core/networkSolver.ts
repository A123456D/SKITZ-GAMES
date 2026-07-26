import { Dir, dirDelta, type Vec2 } from "./cellKind";
import { inBounds, type GridState } from "./gridState";
import { tableAtHub, type TableDef } from "./tableDef";
import { openPorts } from "./portWiring";
import type { Beam, TurnResult } from "./beamSolver";

export type NetworkStats = {
  looseEnds: number;
  matchedEdges: number;
  components: number;
  discCount: number;
};

function effectiveTable(table: TableDef, preview?: Map<number, number>): TableDef {
  if (!preview?.has(table.id)) return table;
  return { ...table, rotationQ: preview.get(table.id)! };
}

function hasPort(table: TableDef, port: number): boolean {
  return openPorts(table).includes(port);
}

/**
 * Dense Net/Pipes solve:
 * - every open port must meet a matching opposite port on a neighbor
 * - all discs form exactly one connected component
 */
export function analyzeNetwork(
  state: GridState,
  previewRot?: Map<number, number>,
): NetworkStats & { beams: Beam[]; problemCells: Vec2[]; won: boolean } {
  const discs = state.tables;
  const discCount = discs.length;
  const problem = new Map<string, Vec2>();
  const beams: Beam[] = [];
  let looseEnds = 0;
  let matchedEdges = 0;

  // Union-find over disc ids
  const parent = new Map<number, number>();
  const find = (id: number): number => {
    let p = parent.get(id) ?? id;
    while (p !== (parent.get(p) ?? p)) p = parent.get(p)!;
    parent.set(id, p);
    return p;
  };
  const unite = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const t of discs) parent.set(t.id, t.id);

  const seenEdge = new Set<string>();

  for (const raw of discs) {
    const table = effectiveTable(raw, previewRot);
    const ports = openPorts(table);
    for (const port of ports) {
      const d = dirDelta(port);
      const nx = table.hub.x + d.x;
      const ny = table.hub.y + d.y;
      if (!inBounds(state, nx, ny)) {
        looseEnds++;
        problem.set(`${table.hub.x},${table.hub.y}`, { ...table.hub });
        continue;
      }
      const neighbor = tableAtHub(state.tables, nx, ny);
      if (!neighbor) {
        looseEnds++;
        problem.set(`${table.hub.x},${table.hub.y}`, { ...table.hub });
        continue;
      }
      const nt = effectiveTable(neighbor, previewRot);
      const back = (port + 2) % 4;
      if (!hasPort(nt, back)) {
        looseEnds++;
        problem.set(`${table.hub.x},${table.hub.y}`, { ...table.hub });
        continue;
      }
      // Matched — count each undirected edge once
      const a = `${table.hub.x},${table.hub.y}`;
      const b = `${nx},${ny}`;
      const ek = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!seenEdge.has(ek)) {
        seenEdge.add(ek);
        matchedEdges++;
        unite(table.id, neighbor.id);
        beams.push({
          segments: [{ from: { ...table.hub }, to: { x: nx, y: ny } }],
          origin: { ...table.hub },
          channel: 0,
          phase: 0,
        });
      }
    }
  }

  const roots = new Set<number>();
  for (const t of discs) roots.add(find(t.id));
  const components = discCount === 0 ? 0 : roots.size;
  const won = discCount > 0 && looseEnds === 0 && components === 1;

  return {
    looseEnds,
    matchedEdges,
    components,
    discCount,
    beams,
    problemCells: [...problem.values()],
    won,
  };
}

/** Drop-in solve used by the session — same TurnResult shape as the old beam solver. */
export function solve(state: GridState, previewRot?: Map<number, number>): TurnResult {
  const net = analyzeNetwork(state, previewRot);
  return {
    beams: net.won || net.matchedEdges > 0 ? net.beams : net.beams,
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
