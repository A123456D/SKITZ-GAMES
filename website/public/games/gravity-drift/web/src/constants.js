// Gravity Drift — geometry, piece table, timing. Ported 1:1 from the shipped build,
// palette extended for the juice pass.
export const SPOKES = 10;          // sectors around the well
export const RINGS = 12;           // ring depth; ring 0 hugs the core, ring RINGS-1 is the rim
export const CELL = 0.11;          // radial thickness of one ring (world units)
export const HOLE = 0.11;          // core hole radius
export const WELL_R = HOLE + RINGS * CELL;

// gravity: seconds per inward step, eases down per level, floored at 70ms (legacy values)
export const GRAVITY_BASE = 0.38;
export const GRAVITY_PER_LEVEL = 0.055;
export const GRAVITY_MIN = 0.07;

// aim: discrete spoke steps; key hold repeats after a short delay, then fast (DAS-ish)
export const AIM_REPEAT_DELAY = 0.22;
export const AIM_REPEAT_RATE = 0.07;

// scoring: clears are the payoff (legacy), placement gives pocket change so short
// runs are not a flat 000000 (QA fix #4).
export const SCORE_PER_RING = 100;
export const SCORE_PER_CELL = 2;

// legacy piece table: cells are [ringOffset, spokeOffset], colors RGBA
export const PIECES = [
  { name: "I", cells: [[0,0],[0,1],[0,2],[0,3]], color: [0.15, 1.00, 0.95, 1] },
  { name: "O", cells: [[0,0],[0,1],[1,0],[1,1]], color: [1.00, 0.88, 0.20, 1] },
  { name: "T", cells: [[0,0],[0,1],[0,2],[1,1]], color: [0.90, 0.28, 1.00, 1] },
  { name: "S", cells: [[0,1],[0,2],[1,0],[1,1]], color: [0.35, 1.00, 0.40, 1] },
  { name: "Z", cells: [[0,0],[0,1],[1,1],[1,2]], color: [1.00, 0.28, 0.35, 1] },
  { name: "J", cells: [[0,0],[1,0],[1,1],[1,2]], color: [0.28, 0.50, 1.00, 1] },
  { name: "L", cells: [[0,2],[1,0],[1,1],[1,2]], color: [1.00, 0.62, 0.15, 1] },
];

// rotate cells 90°: (ring, spoke) -> (spoke, -ring), then re-normalize to min 0
export function rotateCells(cells) {
  const rot = cells.map(([r, s]) => [s, -r]);
  const minR = Math.min(...rot.map(c => c[0]));
  const minS = Math.min(...rot.map(c => c[1]));
  return rot.map(([r, s]) => [r - minR, s - minS]);
}

export const wrapSpoke = (s) => ((s % SPOKES) + SPOKES) % SPOKES;

export function gravityInterval(level) {
  return Math.min(GRAVITY_BASE, Math.max(GRAVITY_MIN, GRAVITY_BASE - (level - 1) * GRAVITY_PER_LEVEL));
}

export function levelFor(lines) {
  return 1 + Math.floor(lines / 4);
}
