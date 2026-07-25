export const Kind = {
  EMPTY: 0,
  EMITTER: 1,
  MIRROR: 2,
  RECEIVER: 3,
  CRATE: 4,
  WALL: 5,
  /** Absorbs any beam — dead end. */
  SINK: 6,
  /** Paired by `channel` id; beam exits the twin with same direction. */
  WORMHOLE: 7,
  /** Only the matching channel may pass; others block. */
  FILTER: 8,
  /** One-way shutter. A beam only passes while travelling in `dir`. */
  BARRIER: 9,
  /**
   * Player toggle. When armed (`cell.phase === 1`), beams that pass through
   * flip polarity (0↔1). When off, beams pass unchanged.
   */
  PHASE_SWITCH: 10,
  /** Pass only if the beam's phase matches `cell.phase`. */
  PHASE_GATE: 11,
  /**
   * Token socket. Beams pass through. `cell.phase === 1` means a token sits
   * here; opens any TOKEN_DOOR sharing `cell.channel`.
   */
  PAD: 12,
  /** Blocks beams unless a PAD with the same channel holds a token. */
  TOKEN_DOOR: 13,
} as const;

/** Beam polarity — orthogonal to Channel. */
export const Phase = { A: 0, B: 1 } as const;

export const Dir = { N: 0, E: 1, S: 2, W: 3 } as const;
export const MirrorOri = { BACKSLASH: 0, SLASH: 1 } as const;

export type Vec2 = { x: number; y: number };

export function dirDelta(d: number): Vec2 {
  switch (d) {
    case Dir.N:
      return { x: 0, y: -1 };
    case Dir.E:
      return { x: 1, y: 0 };
    case Dir.S:
      return { x: 0, y: 1 };
    case Dir.W:
      return { x: -1, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

export function rotateDir(d: number, deltaQ: number): number {
  const steps = ((deltaQ % 4) + 4) % 4;
  return (d + steps) % 4;
}

export function rotateOri(ori: number, deltaQ: number): number {
  const steps = ((deltaQ % 4) + 4) % 4;
  if (steps % 2 === 1) {
    return ori === MirrorOri.BACKSLASH ? MirrorOri.SLASH : MirrorOri.BACKSLASH;
  }
  return ori;
}

export function reflect(incoming: number, ori: number): number {
  if (ori === MirrorOri.BACKSLASH) {
    switch (incoming) {
      case Dir.N:
        return Dir.W;
      case Dir.W:
        return Dir.N;
      case Dir.S:
        return Dir.E;
      case Dir.E:
        return Dir.S;
    }
  } else {
    switch (incoming) {
      case Dir.N:
        return Dir.E;
      case Dir.E:
        return Dir.N;
      case Dir.S:
        return Dir.W;
      case Dir.W:
        return Dir.S;
    }
  }
  return incoming;
}

/** CW (+1): (dx,dy) -> (-dy, dx) in Y-down coords. */
export function rotateOffset(dx: number, dy: number, deltaQ: number): Vec2 {
  const steps = ((deltaQ % 4) + 4) % 4;
  let x = dx;
  let y = dy;
  for (let i = 0; i < steps; i++) {
    const nx = -y;
    const ny = x;
    x = nx;
    y = ny;
  }
  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y };
}
