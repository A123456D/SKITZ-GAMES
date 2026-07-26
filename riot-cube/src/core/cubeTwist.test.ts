import { describe, expect, it } from "vitest";
import { generateBoard } from "./board";
import { lanePreview, sliceBelt, twistCubeFaces } from "./cubeTwist";
import type { CubeFaces } from "./session";
import type { TileKind } from "./types";

function blankFaces(n: number): CubeFaces {
  return Array.from({ length: 6 }, (_, fi) =>
    Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => `${fi}-${r}-${c}` as unknown as TileKind),
    ),
  ) as CubeFaces;
}

describe("cube slice belts", () => {
  it("front row belt is F→R→B→L", () => {
    const belt = sliceBelt(0, "row", 1, 3);
    expect(belt).toHaveLength(12);
    expect(belt[0]).toEqual({ f: 0, r: 1, c: 0 });
    expect(belt[3]).toEqual({ f: 2, r: 1, c: 0 });
    expect(belt[6]).toEqual({ f: 1, r: 1, c: 0 });
    expect(belt[9]).toEqual({ f: 3, r: 1, c: 0 });
  });

  it("twisting front row right pulls from the left face", () => {
    const faces = blankFaces(3);
    const next = twistCubeFaces(faces, 0, { axis: "row", index: 0, dir: 1, amount: 1 });
    // Front[0][0] should become what was Left[0][2] (left face right edge)
    expect(next[0]![0]![0]).toBe("3-0-2");
    // Front[0][2] should become what was Front[0][1]
    expect(next[0]![0]![2]).toBe("0-0-1");
    // Right[0][0] should become what was Front[0][2]
    expect(next[2]![0]![0]).toBe("0-0-2");
  });

  it("lane preview peeks neighbor sticker from the left", () => {
    const faces = blankFaces(3);
    const items = lanePreview(faces, 0, "row", 0, 0.15);
    const leftPeek = items
      .filter((i) => i.pos < 0)
      .sort((a, b) => b.pos - a.pos)[0];
    expect(leftPeek?.kind).toBe("3-0-2");
  });
});

describe("generate still works", () => {
  it("builds a board", () => {
    expect(generateBoard(4, 1)).toHaveLength(4);
  });
});
