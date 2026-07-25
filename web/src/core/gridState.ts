import { cloneCell, emptyCell, type CellData } from "./cellData";
import { cloneTable, type TableDef } from "./tableDef";

export type GridState = {
  width: number;
  height: number;
  cells: CellData[];
  tables: TableDef[];
};

export function createGrid(width: number, height: number): GridState {
  const cells: CellData[] = [];
  for (let i = 0; i < width * height; i++) cells.push(emptyCell());
  return { width, height, cells, tables: [] };
}

export function idx(g: GridState, x: number, y: number): number {
  return y * g.width + x;
}

export function inBounds(g: GridState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < g.width && y < g.height;
}

export function getCell(g: GridState, x: number, y: number): CellData {
  return g.cells[idx(g, x, y)];
}

export function setCell(g: GridState, x: number, y: number, cell: CellData): void {
  g.cells[idx(g, x, y)] = cell;
}

export function getTable(g: GridState, id: number): TableDef | null {
  return g.tables.find((t) => t.id === id) ?? null;
}

export function cloneGrid(g: GridState): GridState {
  return {
    width: g.width,
    height: g.height,
    cells: g.cells.map(cloneCell),
    tables: g.tables.map(cloneTable),
  };
}

export function countKind(g: GridState, kind: number): number {
  return g.cells.reduce((n, c) => n + (c.kind === kind ? 1 : 0), 0);
}
