import { Dir, rotateDir } from "./cellKind";
import { Module, type TableDef } from "./tableDef";

/** Undirected port pairs in base orientation (rotationQ = 0). */
export function basePairs(module: number): [number, number][] {
  switch (module) {
    case Module.ELBOW:
      return [[Dir.N, Dir.E]];
    case Module.STRAIGHT:
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
    case Module.GATE:
      return [[Dir.N, Dir.S]];
    default:
      return [];
  }
}

export function rotatedPairs(table: TableDef): [number, number][] {
  return basePairs(table.module).map(([a, b]) => [
    rotateDir(a, table.rotationQ),
    rotateDir(b, table.rotationQ),
  ]);
}

/** Ports reachable from an entry port (may be 0, 1, or 2 for tee/cross). */
export function exitsFrom(table: TableDef, entryPort: number, gateOpen = true): number[] {
  if (table.module === Module.GATE && !gateOpen) return [];
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
