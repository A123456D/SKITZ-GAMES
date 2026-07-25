import { emptyCell, makeCell, type CellData } from "./cellData";
import { Dir, MirrorOri } from "./cellKind";
import { createGrid, type GridState } from "./gridState";
import { makeTable, type TableDef } from "./tableDef";

export type MoveStep = { tableId: number; delta: number };

export type LevelData = {
  id: string;
  title: string;
  width: number;
  height: number;
  par: number;
  undoLimit: number;
  /** Max times the player may fire beams to inspect / clear. */
  pulseLimit: number;
  tables: TableDef[];
  cells: CellData[];
  solution: MoveStep[];
  hint?: string;
  tutorial?: boolean;
};

export function buildState(level: LevelData): GridState {
  const g = createGrid(level.width, level.height);
  g.tables = level.tables.map((t) => ({
    id: t.id,
    hub: { ...t.hub },
    radius: t.radius,
    rotationQ: t.rotationQ,
    module: t.module,
    locked: t.locked,
    tint: t.tint,
    link: t.link ? { ...t.link } : undefined,
  }));
  const expected = level.width * level.height;
  for (let i = 0; i < Math.min(level.cells.length, expected); i++) {
    g.cells[i] = { ...level.cells[i] };
  }
  return g;
}

export const cell = {
  empty: (tableId = -1) => emptyCell(tableId),
  emit: (dir: number, channel = 0, tableId = -1) =>
    makeCell(1, dir, MirrorOri.BACKSLASH, tableId, channel),
  recv: (channel = 0, tableId = -1) => makeCell(3, Dir.E, MirrorOri.BACKSLASH, tableId, channel),
  mir: (ori: number, tableId = -1) => makeCell(2, Dir.E, ori, tableId, 0),
  crate: (tableId = -1) => makeCell(4, Dir.E, MirrorOri.BACKSLASH, tableId, 0),
  wall: (tableId = -1) => makeCell(5, Dir.E, MirrorOri.BACKSLASH, tableId, 0),
  sink: (tableId = -1) => makeCell(6, Dir.E, MirrorOri.BACKSLASH, tableId, 0),
  worm: (pairId: number, tableId = -1) => makeCell(7, Dir.E, MirrorOri.BACKSLASH, tableId, pairId),
  filter: (channel: number, tableId = -1) => makeCell(8, Dir.E, MirrorOri.BACKSLASH, tableId, channel),
  barrier: (passDir: number, tableId = -1) =>
    makeCell(9, passDir, MirrorOri.BACKSLASH, tableId, 0),
};

export function table(
  id: number,
  hx: number,
  hy: number,
  module: number,
  rotationQ = 0,
  radius = 0,
  locked = false,
): TableDef {
  return makeTable(id, { x: hx, y: hy }, module, radius, rotationQ, locked);
}

export function move(tableId: number, delta: number): MoveStep {
  return { tableId, delta };
}
