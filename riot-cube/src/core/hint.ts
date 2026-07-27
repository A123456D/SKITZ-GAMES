import {
  type CubeState,
  type FaceId,
  type TurnDir,
  cloneCube,
  faceTurn,
  isSolved,
} from "./rubik";
import { applyLaneTwist, type LaneAxis, type LaneTwist } from "./lane";

export type HintMove =
  | { kind: "face"; face: FaceId; dir: TurnDir }
  | {
      kind: "lane";
      face: FaceId;
      axis: LaneAxis;
      index: number;
      dir: TurnDir;
      /** Sticker cells to slide (always 1 from hints). */
      amount?: number;
    };

function correctCount(cube: CubeState): number {
  let n = 0;
  for (let fi = 0; fi < 6; fi++) {
    const face = cube.faces[fi]!;
    for (let r = 0; r < cube.size; r++) {
      for (let c = 0; c < cube.size; c++) {
        if (face[r]![c] === fi) n++;
      }
    }
  }
  return n;
}

/**
 * Pick a single improving move on the viewing face (face turn or lane twist).
 * Falls back to CW face turn if nothing improves but the cube is unsolved.
 */
export function suggestHintMove(
  cube: CubeState,
  viewFace: FaceId,
): HintMove | null {
  if (isSolved(cube)) return null;

  const base = correctCount(cube);
  let best: HintMove | null = null;
  let bestScore = base;

  const tryMove = (move: HintMove, next: CubeState) => {
    const score = correctCount(next);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  };

  for (const dir of [1, -1] as TurnDir[]) {
    tryMove(
      { kind: "face", face: viewFace, dir },
      faceTurn(cloneCube(cube), viewFace, dir),
    );
  }

  const n = cube.size;
  for (const axis of ["row", "col"] as LaneAxis[]) {
    for (let index = 0; index < n; index++) {
      for (const dir of [1, -1] as TurnDir[]) {
        const twist: LaneTwist = { axis, index, dir, amount: 1 };
        tryMove(
          { kind: "lane", face: viewFace, axis, index, dir, amount: 1 },
          applyLaneTwist(cloneCube(cube), viewFace, twist),
        );
      }
    }
  }

  if (best) return best;
  return { kind: "face", face: viewFace, dir: 1 };
}
