import { describe, expect, it } from "vitest";
import {
  B,
  D,
  F,
  L,
  R,
  U,
  cloneCube,
  createSolved,
  cubesEqual,
  faceTurn,
  isSolved,
  mulberry32,
  scramble,
} from "./rubik";

describe("rubik", () => {
  for (const n of [2, 3] as const) {
    describe(`${n}x${n}`, () => {
      it("starts solved", () => {
        expect(isSolved(createSolved(n))).toBe(true);
      });

      it("four CW turns of each face restore solved", () => {
        for (const face of [F, B, R, L, U, D] as const) {
          let cube = createSolved(n);
          for (let i = 0; i < 4; i++) cube = faceTurn(cube, face, 1);
          expect(isSolved(cube)).toBe(true);
        }
      });

      it("turn then inverse restores solved", () => {
        for (const face of [F, B, R, L, U, D] as const) {
          for (const dir of [1, -1] as const) {
            let cube = createSolved(n);
            cube = faceTurn(cube, face, dir);
            expect(isSolved(cube)).toBe(false);
            cube = faceTurn(cube, face, (-dir) as 1 | -1);
            expect(isSolved(cube)).toBe(true);
          }
        }
      });

      it("preserves sticker counts per color", () => {
        let cube = scramble(n, 40, mulberry32(0xabc + n));
        const counts = [0, 0, 0, 0, 0, 0];
        for (const face of cube.faces) {
          for (const row of face) {
            for (const c of row) counts[c]!++;
          }
        }
        expect(counts.every((c) => c === n * n)).toBe(true);
      });
    });
  }

  it("F CW moves UFR cubie to DFR (3x3)", () => {
    const n = 3;
    const last = n - 1;
    let cube = createSolved(n);
    // Mark uniquely via colors already: U=4, F=0, R=2 at UFR
    expect(cube.faces[U]![last]![last]).toBe(U);
    expect(cube.faces[F]![0]![last]).toBe(F);
    expect(cube.faces[R]![0]![0]).toBe(R);

    cube = faceTurn(cube, F, 1);

    // Cubie at DFR: D top-right, F bottom-right, R bottom-left
    expect(cube.faces[F]![last]![last]).toBe(F);
    expect(cube.faces[R]![last]![0]).toBe(U);
    expect(cube.faces[D]![0]![last]).toBe(R);
  });

  it("U CW cycles F top toward R top (3x3)", () => {
    let cube = createSolved(3);
    const fTop = cube.faces[F]![0]!.slice();
    cube = faceTurn(cube, U, 1);
    expect(cube.faces[R]![0]).toEqual(fTop);
  });

  it("U CW moves UFR cubie toward UBR (3x3)", () => {
    const n = 3;
    const last = n - 1;
    let cube = createSolved(n);
    cube = faceTurn(cube, U, 1);
    // Cubie at UBR: U top-right, B top-left (UV mirrored), R top-right
    expect(cube.faces[U]![0]![last]).toBe(U);
    expect(cube.faces[R]![0]![last]).toBe(F);
    expect(cube.faces[B]![0]![0]).toBe(R);
  });

  it("scramble is deterministic with seed and usually unsolved", () => {
    const a = scramble(3, 25, mulberry32(42));
    const b = scramble(3, 25, mulberry32(42));
    expect(cubesEqual(a, b)).toBe(true);
    expect(isSolved(a)).toBe(false);
  });

  it("clone is deep", () => {
    const a = createSolved(3);
    const b = cloneCube(a);
    b.faces[F]![0]![0] = R;
    expect(a.faces[F]![0]![0]).toBe(F);
  });
});
