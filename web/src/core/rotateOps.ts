import { rotateDir } from "./cellKind";
import { getTable, type GridState } from "./gridState";
import type { TableDef } from "./tableDef";

function spin(state: GridState, tableId: number, deltaQ: number): boolean {
  const table = getTable(state, tableId);
  if (!table || table.locked) return false;
  table.rotationQ = (((table.rotationQ + deltaQ) % 4) + 4) % 4;
  return true;
}

/** Other discs in the same gear train (excludes `tableId`). */
export function gearCohort(state: GridState, tableId: number): TableDef[] {
  const table = getTable(state, tableId);
  if (!table?.link) return [];
  const g = table.link.group;
  return state.tables.filter((t) => t.id !== tableId && t.link?.group === g);
}

/**
 * Quarter-turn a table in place (a single player action). If geared, every other
 * disc in the train turns by `delta * polarity_self * polarity_other`.
 */
export function rotateTable(state: GridState, tableId: number, deltaQ: number): boolean {
  if (deltaQ === 0) return true;
  const table = getTable(state, tableId);
  if (!table || table.locked) return false;
  spin(state, tableId, deltaQ);
  if (table.link) {
    const selfPol = table.link.polarity;
    for (const other of gearCohort(state, tableId)) {
      if (other.locked || !other.link) continue;
      spin(state, other.id, deltaQ * selfPol * other.link.polarity);
    }
  }
  return true;
}

/** Low-level absolute set of ONE table (no gear coupling). */
export function setTableRotation(state: GridState, tableId: number, rotationQ: number): boolean {
  const table = getTable(state, tableId);
  if (!table || table.locked) return false;
  table.rotationQ = ((rotationQ % 4) + 4) % 4;
  return true;
}

/**
 * Absolute set as a player action: turns the table to `rotationQ` and applies the
 * matching delta across the gear train.
 */
export function applyPlayerRotation(state: GridState, tableId: number, rotationQ: number): boolean {
  const table = getTable(state, tableId);
  if (!table || table.locked) return false;
  const next = ((rotationQ % 4) + 4) % 4;
  let dq = ((next - table.rotationQ) % 4 + 4) % 4;
  if (dq === 0) return false;
  if (dq === 3) dq = -1;
  return rotateTable(state, tableId, dq);
}

export { rotateDir };
