import { Dir, Kind, MirrorOri } from "./cellKind";

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
  /** Emitter / receiver channel. Ignored for other kinds. */
  channel: number;
};

export function emptyCell(tableId = -1): CellData {
  return { kind: Kind.EMPTY, dir: Dir.E, ori: MirrorOri.BACKSLASH, tableId, channel: 0 };
}

export function makeCell(
  kind: number,
  dir: number = Dir.E,
  ori: number = MirrorOri.BACKSLASH,
  tableId = -1,
  channel = 0,
): CellData {
  return { kind, dir, ori, tableId, channel };
}

export function cloneCell(c: CellData): CellData {
  return { ...c };
}
