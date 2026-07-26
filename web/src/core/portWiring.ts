import { Dir, rotateDir } from "./cellKind";
import { Module, type TableDef } from "./tableDef";

/** Undirected port pairs in base orientation (rotationQ = 0). */
export function basePairs(module: number): [number, number][] {
  switch (module) {
    case Module.ELBOW:
      return [[Dir.N, Dir.E]];
    case Module.STRAIGHT:
    case Module.GATE:
      return [[Dir.N, Dir.S]];
    case Module.TEE:
      return [
        [Dir.N, Dir.E],
        [Dir.N, Dir.W],
      ];
    case Module.CROSS:
      return [
        [Dir.N, Dir.S],
        [Dir.E, Dir.W],
      ];
    case Module.ENDCAP:
      return [];
    default:
      return [];
  }
}

/** Open port faces in base orientation (before rotation). */
export function basePorts(module: number): number[] {
  if (module === Module.ENDCAP) return [Dir.N];
  const s = new Set<number>();
  for (const [a, b] of basePairs(module)) {
    s.add(a);
    s.add(b);
  }
  return [...s];
}

export function rotatedPairs(table: TableDef): [number, number][] {
  return basePairs(table.module).map(([a, b]) => [
    rotateDir(a, table.rotationQ),
    rotateDir(b, table.rotationQ),
  ]);
}

/** Open ports after applying the table's quarter-turn. */
export function openPorts(table: TableDef): number[] {
  return basePorts(table.module).map((p) => rotateDir(p, table.rotationQ));
}

/** Ports reachable from an entry port (may be 0, 1, or 2 for tee/cross). */
export function exitsFrom(table: TableDef, entryPort: number, gateOpen = true): number[] {
  if (table.module === Module.GATE && !gateOpen) return [];
  if (table.module === Module.ENDCAP) return [];
  const outs: number[] = [];
  for (const [a, b] of rotatedPairs(table)) {
    if (a === entryPort) outs.push(b);
    else if (b === entryPort) outs.push(a);
  }
  return outs;
}

/** Beam traveling `incomingDir` onto the hub entered through this port face. */
export function entryPortFromIncoming(incomingDir: number): number {
  return (incomingDir + 2) % 4;
}

/**
 * Find module + rotation whose open ports equal `ports` (order irrelevant).
 * Returns null if the port set is not one of our shapes.
 */
export function moduleForPorts(ports: number[]): { module: number; rotationQ: number } | null {
  const want = new Set(ports);
  const n = want.size;
  if (n === 0) return null;
  if (n === 1) {
    const face = ports[0]!;
    return { module: Module.ENDCAP, rotationQ: face };
  }
  if (n === 4) return { module: Module.CROSS, rotationQ: 0 };

  const candidates =
    n === 2
      ? [Module.ELBOW, Module.STRAIGHT]
      : n === 3
        ? [Module.TEE]
        : [];

  for (const module of candidates) {
    for (let r = 0; r < 4; r++) {
      const have = new Set(basePorts(module).map((p) => rotateDir(p, r)));
      if (have.size !== want.size) continue;
      let ok = true;
      for (const p of want) {
        if (!have.has(p)) {
          ok = false;
          break;
        }
      }
      if (ok) return { module, rotationQ: r };
    }
  }
  return null;
}
