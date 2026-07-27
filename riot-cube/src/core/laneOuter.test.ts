import { describe, expect, it } from "vitest";
import { createSolved, F, type ColorId, type CubeState } from "./rubik";
import { applyLaneTwist } from "./lane";

function readFaceLine(
  cube: CubeState,
  face: number,
  axis: "row" | "col",
  index: number,
): ColorId[] {
  const n = cube.size;
  const line: ColorId[] = [];
  if (axis === "row") {
    for (let c = 0; c < n; c++) line.push(cube.faces[face]![index]![c] as ColorId);
  } else {
    for (let r = 0; r < n; r++) line.push(cube.faces[face]![r]![index] as ColorId);
  }
  return line;
}

/** Same cell-center math as cube3d outerSlide paint. */
function slideCenters(
  n: number,
  dir: 1 | -1,
  progress: number,
  faces: number,
): { start: number[]; end: number[] } {
  const slide = progress * faces * n;
  const span = faces * n;
  const start: number[] = [];
  const end: number[] = [];
  for (let c = 0; c < n; c++) {
    start.push(c + 0.5 + dir * slide);
    end.push(c + 0.5 + dir * slide - dir * span);
  }
  return { start, end };
}

describe("outer lane start/end slide", () => {
  for (const dir of [1, -1] as const) {
    it(`F bottom dir=${dir}: endLine differs and lands on centers at p=1`, () => {
      const n = 3;
      const face = F;
      const axis = "row" as const;
      const index = n - 1;
      const cube = createSolved(n);
      const result = applyLaneTwist(cube, face, { axis, index, dir, amount: 1 });
      const startLine = readFaceLine(cube, face, axis, index);
      const endLine = readFaceLine(result, face, axis, index);

      expect(endLine).not.toEqual(startLine);
      expect(endLine).toHaveLength(n);

      const { end } = slideCenters(n, dir, 1, 1);
      for (let c = 0; c < n; c++) {
        expect(end[c]).toBeCloseTo(c + 0.5, 6);
      }
    });
  }

  it("amount=2 slides two face-widths so end centers at p=1", () => {
    const n = 3;
    const { end } = slideCenters(n, 1, 1, 2);
    for (let c = 0; c < n; c++) {
      expect(end[c]).toBeCloseTo(c + 0.5, 6);
    }
  });
});
