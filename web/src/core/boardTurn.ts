import { emptyCell, cloneCell, type CellData } from "./cellData";
import { rotateDir, rotateOri } from "./cellKind";
import type { GridState } from "./gridState";

/**
 * Rotate the board 90° CW in place.
 * Cell positions, dirs, and mirror oris rotate with the board.
 * Disc rotationQ is intentionally left alone so the turn changes which
 * orientations are correct relative to the new emitter/receiver layout.
 */
export function rotateBoardCW(state: GridState): void {
  const w = state.width;
  const h = state.height;
  const newW = h;
  const newH = w;
  const next: CellData[] = [];
  for (let i = 0; i < newW * newH; i++) next.push(emptyCell());

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = h - 1 - y;
      const ny = x;
      const c = cloneCell(state.cells[y * w + x]);
      c.dir = rotateDir(c.dir, 1);
      c.ori = rotateOri(c.ori, 1);
      next[ny * newW + nx] = c;
    }
  }

  for (const t of state.tables) {
    const { x, y } = t.hub;
    t.hub = { x: h - 1 - y, y: x };
  }

  state.width = newW;
  state.height = newH;
  state.cells = next;
}

/** Apply ±quarter board turns (negative = CCW via 3× CW). */
export function rotateBoard(state: GridState, deltaQ: number): void {
  const steps = ((deltaQ % 4) + 4) % 4;
  for (let i = 0; i < steps; i++) rotateBoardCW(state);
}
