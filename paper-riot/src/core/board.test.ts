import { describe, expect, it } from "vitest";
import {
  COLS,
  ROWS,
  createBoard,
  findMatches,
  makeCell,
  swapCreatesMatch,
} from "./board";
import { shapeMask } from "./shapes";
import { getLevel } from "./levels";
import { startSession, trySwap, usePower } from "./session";
import type { Board, BoardMask } from "./types";

function fullMask(): BoardMask {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => true),
  );
}

function fillChecker(): Board {
  const board: Board = [];
  for (let c = 0; c < COLS; c++) {
    board.push([]);
    for (let r = 0; r < ROWS; r++) {
      board[c]!.push(makeCell((c + r) % 2 === 0 ? "gem" : "star"));
    }
  }
  return board;
}

describe("board", () => {
  it("creates a shaped board without immediate matches", () => {
    const { board, mask } = createBoard("rect", { colors: 5 });
    expect(board.length).toBe(COLS);
    expect(board[0]!.length).toBe(ROWS);
    expect(findMatches(board, mask).length).toBe(0);
    const playable = mask.flat().filter(Boolean).length;
    expect(playable).toBe(6 * 8);
  });

  it("donut shape has a hole", () => {
    const mask = shapeMask("donut");
    expect(mask[3]![4]).toBe(false);
    expect(mask[0]![1]).toBe(true);
  });

  it("finds a horizontal match of 3", () => {
    const b = fillChecker();
    const mask = fullMask();
    b[1]![3] = makeCell("skull");
    b[2]![3] = makeCell("skull");
    b[3]![3] = makeCell("skull");
    const groups = findMatches(b, mask);
    expect(groups.some((g) => g.kind === "skull" && g.cells.length >= 3)).toBe(
      true,
    );
  });

  it("detects swap that creates a match", () => {
    const b = fillChecker();
    const mask = fullMask();
    b[0]![0] = makeCell("heart");
    b[1]![0] = makeCell("heart");
    b[2]![1] = makeCell("heart");
    expect(
      swapCreatesMatch(b, mask, { c: 2, r: 1 }, { c: 2, r: 0 }),
    ).toBe(true);
  });
});

describe("levels", () => {
  it("has 40 levels across 4 zones with escalating shapes", () => {
    expect(getLevel(1).zone).toBe("desk");
    expect(getLevel(1).shape).toBe("rect");
    expect(getLevel(11).zone).toBe("hall");
    expect(getLevel(40).zone).toBe("roof");
    expect(getLevel(40).obstacles).toBeGreaterThan(getLevel(1).obstacles);
  });
});

describe("session", () => {
  it("starts with goals, moves, and powers", () => {
    const s = startSession(1);
    expect(s.movesLeft).toBe(getLevel(1).moves);
    expect(s.goals.length).toBeGreaterThanOrEqual(2);
    expect(s.powers.bomb).toBeGreaterThan(0);
    expect(s.status).toBe("playing");
    expect(s.mask.flat().some(Boolean)).toBe(true);
  });

  it("trySwap returns a result", () => {
    const s = startSession(1);
    const result = trySwap(s, { c: 0, r: 0 }, { c: 1, r: 0 });
    expect(result.ok || typeof result.reason === "string").toBe(true);
  });

  it("bomb power clears a neighborhood", () => {
    const s = startSession(1);
    s.powers.bomb = 1;
    const before = s.powers.bomb;
    // Find a playable cell near center
    let target = { c: 3, r: 4 };
    outer: for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (s.mask[c]![r]) {
          target = { c, r };
          break outer;
        }
      }
    }
    const result = usePower(s, "bomb", target);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cleared.length).toBeGreaterThan(0);
    expect(s.powers.bomb).toBe(before - 1);
  });
});
