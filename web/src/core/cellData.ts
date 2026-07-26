import { Dir, Kind, MirrorOri, Phase } from "./cellKind";

/** Paper channels: solid / dashed / dotted (B&W, not neon). */
export const Channel = {
  SOLID: 0,
  DASH: 1,
  DOT: 2,
} as const;

export type CellData = {
  kind: number;
  dir: number;
  ori: number;
  tableId: number;
  /** Emitter / receiver / filter / worm pair id. */
  channel: number;
  /**
   * Overloaded flag:
   * - MIRROR: 1 = player-rotatable triangle, 0 = fixed
   * - legacy phase/token kinds (unused in new levels): prior semantics
   */
  phase: number;
};

export function emptyCell(tableId = -1): CellData {
  return {
    kind: Kind.EMPTY,
    dir: Dir.E,
    ori: MirrorOri.BACKSLASH,
    tableId,
    channel: 0,
    phase: Phase.A,
  };
}

export function makeCell(
  kind: number,
  dir: number = Dir.E,
  ori: number = MirrorOri.BACKSLASH,
  tableId = -1,
  channel = 0,
  phase: number = 0,
): CellData {
  return { kind, dir, ori, tableId, channel, phase };
}

export function cloneCell(c: CellData): CellData {
  return { ...c };
}
