import { rotateDir } from "./cellKind";
import { getTable, type GridState } from "./gridState";

/** Quarter-turn a table in place. Does not move cells. */
export function rotateTable(state: GridState, tableId: number, deltaQ: number): boolean {
  if (deltaQ === 0) return true;
  const table = getTable(state, tableId);
  if (!table || table.locked) return false;
  table.rotationQ = (((table.rotationQ + deltaQ) % 4) + 4) % 4;
  return true;
}

export function setTableRotation(state: GridState, tableId: number, rotationQ: number): boolean {
  const table = getTable(state, tableId);
  if (!table || table.locked) return false;
  table.rotationQ = ((rotationQ % 4) + 4) % 4;
  return true;
}

export { rotateDir };
