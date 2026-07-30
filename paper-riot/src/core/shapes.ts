import { COLS, ROWS, type BoardMask, type BoardShapeId } from "./types";

function full(v: boolean): BoardMask {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => v),
  );
}

/** Carve a centered rectangle of playable cells. */
function rect(cw: number, rh: number): BoardMask {
  const m = full(false);
  const c0 = Math.floor((COLS - cw) / 2);
  const r0 = Math.floor((ROWS - rh) / 2);
  for (let c = 0; c < cw; c++) {
    for (let r = 0; r < rh; r++) m[c0 + c]![r0 + r] = true;
  }
  return m;
}

export function shapeMask(id: BoardShapeId): BoardMask {
  switch (id) {
    case "rect":
      return rect(6, 8);
    case "square":
      return rect(6, 6);
    case "narrow":
      return rect(5, 8);
    case "donut": {
      const m = rect(7, 7);
      for (let c = 2; c <= 4; c++) {
        for (let r = 3; r <= 5; r++) m[c]![r] = false;
      }
      return m;
    }
    case "plus": {
      const m = full(false);
      for (let c = 0; c < COLS; c++) {
        for (let r = 3; r <= 5; r++) m[c]![r] = true;
      }
      for (let r = 0; r < ROWS; r++) {
        for (let c = 2; c <= 4; c++) m[c]![r] = true;
      }
      return m;
    }
    case "diamond": {
      const m = full(false);
      const cx = (COLS - 1) / 2;
      const cy = (ROWS - 1) / 2;
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          if (Math.abs(c - cx) + Math.abs(r - cy) <= 4) m[c]![r] = true;
        }
      }
      return m;
    }
    case "heart": {
      const m = full(false);
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const x = (c - 3) / 3;
          const y = (4.2 - r) / 3.5;
          const a = x * x + y * y - 1;
          const heart = a * a * a - x * x * y * y * y;
          if (heart <= 0.05) m[c]![r] = true;
        }
      }
      return m;
    }
    case "stairs": {
      const m = full(false);
      for (let r = 0; r < ROWS; r++) {
        const start = Math.min(3, Math.floor(r / 2));
        const end = COLS - 1 - Math.min(2, Math.floor((ROWS - 1 - r) / 3));
        for (let c = start; c <= end; c++) m[c]![r] = true;
      }
      return m;
    }
    case "pillars": {
      const m = full(false);
      for (const c of [0, 1, 3, 5, 6]) {
        for (let r = 1; r < ROWS - 1; r++) m[c]![r] = true;
      }
      for (let c = 0; c < COLS; c++) {
        m[c]![0] = true;
        m[c]![ROWS - 1] = true;
      }
      return m;
    }
    case "bite": {
      const m = rect(7, 8);
      for (let c = 4; c < COLS; c++) {
        for (let r = 0; r < 3; r++) m[c]![r] = false;
      }
      for (let c = 0; c < 2; c++) {
        for (let r = ROWS - 3; r < ROWS; r++) m[c]![r] = false;
      }
      return m;
    }
    case "lanes": {
      // Three vertical lanes — hallway lockers feel
      const m = full(false);
      for (const c of [1, 3, 5]) {
        for (let r = 0; r < ROWS; r++) m[c]![r] = true;
      }
      for (let c = 0; c < COLS; c++) {
        m[c]![2] = true;
        m[c]![6] = true;
      }
      return m;
    }
    case "corners": {
      const m = full(false);
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          m[c]![r] = true;
          m[COLS - 1 - c]![r] = true;
          m[c]![ROWS - 1 - r] = true;
          m[COLS - 1 - c]![ROWS - 1 - r] = true;
        }
      }
      for (let c = 2; c <= 4; c++) {
        for (let r = 3; r <= 5; r++) m[c]![r] = true;
      }
      return m;
    }
    case "hourglass": {
      const m = full(false);
      for (let r = 0; r < ROWS; r++) {
        const t = r / (ROWS - 1);
        const half = t < 0.5 ? 3 - Math.floor(t * 4) : Math.floor((t - 0.5) * 4) + 1;
        const c0 = Math.floor((COLS - (half * 2 + 1)) / 2);
        for (let c = c0; c < c0 + half * 2 + 1; c++) {
          if (c >= 0 && c < COLS) m[c]![r] = true;
        }
      }
      return m;
    }
    case "rift": {
      // Torn middle gap — yard fence gap
      const m = rect(7, 9);
      for (let r = 3; r <= 5; r++) {
        m[3]![r] = false;
      }
      for (let c = 2; c <= 4; c++) {
        m[c]![4] = false;
      }
      return m;
    }
    default:
      return rect(6, 8);
  }
}

export function maskCellCount(mask: BoardMask): number {
  let n = 0;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) if (mask[c]![r]) n++;
  }
  return n;
}
