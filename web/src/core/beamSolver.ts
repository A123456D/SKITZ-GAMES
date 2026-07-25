import { Dir, dirDelta, Kind, reflect, type Vec2 } from "./cellKind";
import { countKind, getCell, inBounds, type GridState } from "./gridState";
import { Module, tableAtHub, type TableDef } from "./tableDef";
import { entryPortFromIncoming, exitsFrom, rotatedPairs } from "./portWiring";

export type BeamSeg = { from: Vec2; to: Vec2 };
export type Beam = { segments: BeamSeg[]; origin: Vec2; channel: number };

export type BeamEvent =
  | { type: "portEnter"; tableId: number; pos: Vec2 }
  | { type: "portExit"; tableId: number; pos: Vec2 }
  | { type: "receiverLit"; pos: Vec2; channel: number; match: boolean }
  | { type: "blocked"; pos: Vec2 };

export type TurnResult = {
  beams: Beam[];
  /** Receivers lit by a matching-channel beam. */
  energizedReceivers: Vec2[];
  /** Receivers hit by the wrong channel (spill — blocks win). */
  spillReceivers: Vec2[];
  won: boolean;
  moveApplied: boolean;
  tableId: number;
  deltaQ: number;
  newlyLitReceivers: Vec2[];
  events: BeamEvent[];
};

const MAX_STEPS = 96;

type Ray = {
  x: number;
  y: number;
  dir: number;
  origin: Vec2;
  segs: BeamSeg[];
  channel: number;
};

function effectiveTable(table: TableDef, preview?: Map<number, number>): TableDef {
  if (!preview?.has(table.id)) return table;
  return { ...table, rotationQ: preview.get(table.id)! };
}

function isGateSide(table: TableDef, entryPort: number): boolean {
  const axis = new Set<number>();
  for (const [a, b] of rotatedPairs(table)) {
    axis.add(a);
    axis.add(b);
  }
  return !axis.has(entryPort);
}

export function solve(state: GridState, previewRot?: Map<number, number>): TurnResult {
  const result: TurnResult = {
    beams: [],
    energizedReceivers: [],
    spillReceivers: [],
    won: false,
    moveApplied: false,
    tableId: -1,
    deltaQ: 0,
    newlyLitReceivers: [],
    events: [],
  };

  const correct = new Map<string, Vec2>();
  const spill = new Map<string, Vec2>();
  const gateOpen = new Set<number>();

  propagate(state, result, correct, spill, gateOpen, previewRot, true);
  if (gateOpen.size > 0) {
    result.beams = [];
    result.events = [];
    correct.clear();
    spill.clear();
    propagate(state, result, correct, spill, gateOpen, previewRot, false);
  }

  result.energizedReceivers = [...correct.values()];
  result.spillReceivers = [...spill.values()];
  const need = countKind(state, Kind.RECEIVER);
  result.won =
    need > 0 && spill.size === 0 && result.energizedReceivers.length >= need;
  return result;
}

function propagate(
  state: GridState,
  result: TurnResult,
  correct: Map<string, Vec2>,
  spill: Map<string, Vec2>,
  gateOpen: Set<number>,
  previewRot: Map<number, number> | undefined,
  discoverGates: boolean,
): void {
  const queue: Ray[] = [];
  const visited = new Set<string>();

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cell = getCell(state, x, y);
      if (cell.kind !== Kind.EMITTER) continue;
      queue.push({
        x,
        y,
        dir: cell.dir,
        origin: { x, y },
        segs: [],
        channel: cell.channel ?? 0,
      });
    }
  }

  while (queue.length) {
    const ray = queue.shift()!;
    let { x, y, dir } = ray;
    const segs = [...ray.segs];
    let steps = 0;

    while (steps++ < MAX_STEPS) {
      const d = dirDelta(dir);
      const nx = x + d.x;
      const ny = y + d.y;
      if (!inBounds(state, nx, ny)) {
        result.events.push({ type: "blocked", pos: { x, y } });
        break;
      }

      const edgeKey = `${nx},${ny},${dir},${ray.channel}`;
      if (visited.has(edgeKey)) break;
      visited.add(edgeKey);

      segs.push({ from: { x, y }, to: { x: nx, y: ny } });
      x = nx;
      y = ny;

      const rawTable = tableAtHub(state.tables, x, y);
      if (rawTable) {
        const table = effectiveTable(rawTable, previewRot);
        result.events.push({ type: "portEnter", tableId: table.id, pos: { x, y } });
        const entry = entryPortFromIncoming(dir);

        if (table.module === Module.GATE && isGateSide(table, entry)) {
          if (discoverGates) gateOpen.add(table.id);
          result.events.push({ type: "blocked", pos: { x, y } });
          break;
        }

        const open = table.module !== Module.GATE || gateOpen.has(table.id);
        const exits = exitsFrom(table, entry, open);
        if (!exits.length) {
          result.events.push({ type: "blocked", pos: { x, y } });
          break;
        }

        for (let i = 0; i < exits.length; i++) {
          result.events.push({ type: "portExit", tableId: table.id, pos: { x, y } });
          if (i === 0) dir = exits[i];
          else {
            queue.push({
              x,
              y,
              dir: exits[i],
              origin: ray.origin,
              segs: segs.map((s) => ({ from: { ...s.from }, to: { ...s.to } })),
              channel: ray.channel,
            });
          }
        }
        continue;
      }

      const hit = getCell(state, x, y);
      if (hit.kind === Kind.EMPTY) continue;
      if (hit.kind === Kind.MIRROR) {
        dir = reflect(dir, hit.ori);
        continue;
      }
      if (hit.kind === Kind.FILTER) {
        if ((hit.channel ?? 0) !== ray.channel) {
          result.events.push({ type: "blocked", pos: { x, y } });
          break;
        }
        continue;
      }
      if (hit.kind === Kind.BARRIER) {
        if (hit.dir !== dir) {
          result.events.push({ type: "blocked", pos: { x, y } });
          break;
        }
        continue;
      }
      if (hit.kind === Kind.WORMHOLE) {
        const twin = findWormTwin(state, x, y, hit.channel ?? 0);
        if (!twin) {
          result.events.push({ type: "blocked", pos: { x, y } });
          break;
        }
        // Exit from twin, same direction; mark visit so we don't loop
        const exitKey = `${twin.x},${twin.y},${dir},${ray.channel}`;
        if (visited.has(exitKey)) break;
        visited.add(exitKey);
        segs.push({ from: { x, y }, to: { x: twin.x, y: twin.y } });
        x = twin.x;
        y = twin.y;
        continue;
      }
      if (hit.kind === Kind.SINK) {
        result.events.push({ type: "blocked", pos: { x, y } });
        break;
      }
      if (hit.kind === Kind.RECEIVER) {
        const k = `${x},${y}`;
        const match = (hit.channel ?? 0) === ray.channel;
        result.events.push({ type: "receiverLit", pos: { x, y }, channel: ray.channel, match });
        if (match) {
          if (!correct.has(k)) correct.set(k, { x, y });
        } else {
          if (!spill.has(k)) spill.set(k, { x, y });
        }
        break;
      }
      result.events.push({ type: "blocked", pos: { x, y } });
      break;
    }

    result.beams.push({ segments: segs, origin: ray.origin, channel: ray.channel });
  }
}

function findWormTwin(state: GridState, x: number, y: number, pairId: number): Vec2 | null {
  for (let yy = 0; yy < state.height; yy++) {
    for (let xx = 0; xx < state.width; xx++) {
      if (xx === x && yy === y) continue;
      const c = getCell(state, xx, yy);
      if (c.kind === Kind.WORMHOLE && (c.channel ?? 0) === pairId) return { x: xx, y: yy };
    }
  }
  return null;
}
