import type { Board, BoardMask } from "../core/types";
import { COLS, ROWS } from "../core/types";

export type Layout = {
  x: number;
  y: number;
  cell: number;
  gap: number;
};

export type TileVisual = {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  scale: number;
  tScale: number;
  opacity: number;
  phase: number;
};

const visuals = new Map<number, TileVisual>();
const SETTLE = 1.6;

function centerOf(layout: Layout, c: number, r: number): { x: number; y: number } {
  return {
    x: layout.x + c * (layout.cell + layout.gap) + layout.cell / 2,
    y: layout.y + r * (layout.cell + layout.gap) + layout.cell / 2,
  };
}

export function clearMotion(): void {
  visuals.clear();
}

export function getVisual(id: number): TileVisual | undefined {
  return visuals.get(id);
}

/** Ease visuals toward board targets. New tiles drop in from above. */
export function syncBoardMotion(
  board: Board,
  mask: BoardMask,
  layout: Layout,
  opts: { dropIn?: boolean } = {},
): void {
  const live = new Set<number>();
  const stride = layout.cell + layout.gap;

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!mask[c]![r]) continue;
      const cell = board[c]![r];
      if (!cell) continue;
      live.add(cell.id);
      const target = centerOf(layout, c, r);
      let v = visuals.get(cell.id);
      if (!v) {
        const spawnY = opts.dropIn
          ? layout.y - stride * (2 + Math.random() * 2) - r * stride * 0.15
          : target.y;
        v = {
          id: cell.id,
          x: target.x,
          y: spawnY,
          tx: target.x,
          ty: target.y,
          scale: opts.dropIn ? 0.82 : 1,
          tScale: 1,
          opacity: 1,
          phase: (cell.id % 97) * 0.37,
        };
        visuals.set(cell.id, v);
      } else {
        v.tx = target.x;
        v.ty = target.y;
        v.tScale = 1;
        v.opacity = 1;
      }
    }
  }

  for (const id of [...visuals.keys()]) {
    if (!live.has(id)) visuals.delete(id);
  }
}

/** Pop / shrink matched tiles before they leave the board. */
export function punchClearing(ids: number[]): void {
  for (const id of ids) {
    const v = visuals.get(id);
    if (!v) continue;
    v.tScale = 0.05;
    v.opacity = 0;
  }
}

export function updateMotion(dt: number): boolean {
  let moving = false;
  const follow = 1 - Math.exp(-12 * dt);
  const scaleFollow = 1 - Math.exp(-14 * dt);

  for (const v of visuals.values()) {
    const dx = v.tx - v.x;
    const dy = v.ty - v.y;
    v.x += dx * follow;
    v.y += dy * follow;
    v.scale += (v.tScale - v.scale) * scaleFollow;

    if (Math.abs(dx) > SETTLE || Math.abs(dy) > SETTLE) moving = true;
  }
  return moving;
}

export function motionBusy(): boolean {
  for (const v of visuals.values()) {
    if (Math.abs(v.tx - v.x) > SETTLE || Math.abs(v.ty - v.y) > SETTLE) {
      return true;
    }
    if (Math.abs(v.tScale - v.scale) > 0.04) return true;
  }
  return false;
}

/** Idle float / wobble on top of settled motion. */
export function floatPose(
  v: TileVisual,
  time: number,
  selected: boolean,
): { x: number; y: number; rot: number; scale: number } {
  const amp = selected ? 5.5 : 3.2;
  const bob = Math.sin(time * 2.35 + v.phase) * amp;
  const sway = Math.sin(time * 1.15 + v.phase * 1.3) * (selected ? 2.2 : 1.1);
  const rot = Math.sin(time * 1.7 + v.phase * 0.8) * (selected ? 0.08 : 0.045);
  const pulse = selected ? 1 + Math.sin(time * 6) * 0.04 : 1;
  return {
    x: v.x + sway,
    y: v.y + bob,
    rot,
    scale: v.scale * pulse,
  };
}

export function waitForMotion(
  tick: (resolve: () => void) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (!motionBusy()) {
        resolve();
        return;
      }
      tick(check);
    };
    // give one frame for sync to apply
    tick(check);
  });
}
