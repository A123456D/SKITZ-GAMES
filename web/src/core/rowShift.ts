import type { GridState } from "./gridState";

/**
 * Cycle every disc in row `y` by `delta` cells (±1 typical).
 * Wrap around the board width. Empty cells array is left alone (dense nets).
 */
export function shiftRow(state: GridState, y: number, delta: number): boolean {
  if (y < 0 || y >= state.height) return false;
  const steps = ((delta % state.width) + state.width) % state.width;
  if (steps === 0) return false;
  const w = state.width;
  for (const t of state.tables) {
    if (t.hub.y !== y) continue;
    t.hub = { x: (t.hub.x + steps) % w, y: t.hub.y };
  }
  return true;
}

/** Cycle every disc in column `x` by `delta` cells (±1 typical). */
export function shiftCol(state: GridState, x: number, delta: number): boolean {
  if (x < 0 || x >= state.width) return false;
  const steps = ((delta % state.height) + state.height) % state.height;
  if (steps === 0) return false;
  const h = state.height;
  for (const t of state.tables) {
    if (t.hub.x !== x) continue;
    t.hub = { x: t.hub.x, y: (t.hub.y + steps) % h };
  }
  return true;
}
