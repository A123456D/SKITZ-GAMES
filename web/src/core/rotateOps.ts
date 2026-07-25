import { rotateDir } from "./cellKind";
import { getTable, type GridState } from "./gridState";

function spin(state: GridState, tableId: number, deltaQ: number): boolean {
  const table = getTable(state, tableId);
  if (!table || table.locked) return false;
  table.rotationQ = (((table.rotationQ + deltaQ) % 4) + 4) % 4;
  return true;
}

/**
 * Quarter-turn a table in place (a single player action). If the table is geared
 * to a partner, the partner turns too by `delta * sign` — the coupling that makes
 * discs impossible to solve independently. Does not move cells.
 */
export function rotateTable(state: GridState, tableId: number, deltaQ: number): boolean {
  if (deltaQ === 0) return true;
  const table = getTable(state, tableId);
  if (!table || table.locked) return false;
  spin(state, tableId, deltaQ);
  if (table.link) {
    const partner = getTable(state, table.link.partner);
    if (partner && !partner.locked) spin(state, partner.id, deltaQ * table.link.sign);
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
 * same delta to a geared partner. Used by drag-commit so gears stay in sync.
 */
export function applyPlayerRotation(state: GridState, tableId: number, rotationQ: number): boolean {
  const table = getTable(state, tableId);
  if (!table || table.locked) return false;
  const next = ((rotationQ % 4) + 4) % 4;
  let dq = (next - table.rotationQ) % 4;
  if (dq === 0) return false;
  return rotateTable(state, tableId, dq);
}

export { rotateDir };
