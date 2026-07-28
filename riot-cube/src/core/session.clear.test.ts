import { describe, expect, it } from "vitest";
import {
  applyFaceTurn,
  applyTwist,
  clearedFacesDisturbed,
  doScramble,
  startSession,
  type Session,
} from "./session";
import { createSolved, isFaceUniform } from "./rubik";

function withClearMode(s: Session): Session {
  return {
    ...s,
    mode: "clear",
    cleared: [false, false, false, false, false, false],
    moveLimit: null,
    status: "playing",
    moveCount: 0,
  };
}

describe("clear mode", () => {
  it("replaces cleared face stickers with occupy so slides pull black cells", () => {
    let s = withClearMode(startSession(2));
    s = {
      ...s,
      cube: createSolved(2),
      cleared: [false, false, false, false, false, false],
      status: "playing",
      moveCount: 0,
    };
    s = applyFaceTurn(s, 0, 1);
    expect(s.cleared[0]).toBe(true);
    // Face 0 should now be occupy stickers, not the old solved color.
    expect(s.cube.faces[0]![0]![0]).toBe(6);
    expect(s.cube.faces[0]!.every((row) => row.every((c) => c === 6))).toBe(
      true,
    );
  });

  it("wins when the sixth face clears", () => {
    let s = withClearMode(startSession(2));
    s = {
      ...s,
      cube: createSolved(2),
      cleared: [true, true, true, true, true, false],
      status: "playing",
      moveCount: 0,
      moveLimit: null,
    };
    // Face 5 is already uniform; turning it keeps it solid and marks the last clear.
    s = applyFaceTurn(s, 5, 1);
    expect(s.cleared.every(Boolean)).toBe(true);
    expect(s.status).toBe("solved");
  });

  it("keeps sticky clears even if later moves break the face", () => {
    let s = withClearMode(startSession(2));
    s = {
      ...s,
      cube: createSolved(2),
      cleared: [true, false, false, false, false, false],
      status: "playing",
    };
    s = applyTwist(s, { axis: "row", index: 0, dir: 1 });
    expect(s.cleared[0]).toBe(true);
    expect(s.moveCount).toBe(1);
  });

  it("loses when move limit is reached without clearing all", () => {
    let s = withClearMode(startSession(2));
    s = {
      ...s,
      cube: createSolved(2),
      cleared: [false, false, false, false, false, false],
      moveLimit: 1,
      moveCount: 0,
      status: "playing",
    };
    s = applyFaceTurn(s, 0, 1);
    expect(s.moveCount).toBe(1);
    expect(s.status).toBe("lost");
    expect(s.cleared[0]).toBe(true);
  });

  it("blocks face-turns on already-cleared faces", () => {
    let s = withClearMode(startSession(2));
    s = {
      ...s,
      cube: createSolved(2),
      cleared: [true, false, false, false, false, false],
      status: "playing",
    };
    const next = applyFaceTurn(s, 0, 1);
    expect(next).toBe(s);
    expect(next.moveCount).toBe(0);
  });

  it("clearedFacesDisturbed detects sticker changes on cleared faces", () => {
    const a = createSolved(2);
    const b = {
      ...a,
      faces: a.faces.map((f, i) =>
        i === 0 ? f.map((row) => row.map(() => 1 as const)) : f,
      ) as typeof a.faces,
    };
    expect(
      clearedFacesDisturbed(a, b, [true, false, false, false, false, false]),
    ).toBe(true);
    expect(
      clearedFacesDisturbed(a, b, [false, false, false, false, false, false]),
    ).toBe(false);
  });

  it("isFaceUniform matches solid faces", () => {
    const cube = createSolved(3);
    expect(isFaceUniform(cube.faces[0]!)).toBe(true);
  });

  it("doScramble resets cleared state and reloads mode prefs", () => {
    let s = withClearMode(startSession(2));
    s = {
      ...s,
      cleared: [true, true, false, false, false, false],
      moveCount: 12,
      status: "lost",
    };
    s = doScramble(s);
    expect(s.cleared.every((c) => !c)).toBe(true);
    expect(s.moveCount).toBe(0);
    expect(s.status).toBe("playing");
  });
});
