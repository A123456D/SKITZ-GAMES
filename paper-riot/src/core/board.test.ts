import { describe, expect, it } from "vitest";
import {
  COLS,
  ROWS,
  createBoard,
  findMatches,
  makeCell,
  swapCreatesMatch,
} from "./board";
import { startSession, trySwap, usePower } from "./session";
import type { Board } from "./types";

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
  it("creates a full board without immediate matches", () => {
    const b = createBoard();
    expect(b.length).toBe(COLS);
    expect(b[0]!.length).toBe(ROWS);
    expect(findMatches(b).length).toBe(0);
  });

  it("finds a horizontal match of 3", () => {
    const b = fillChecker();
    b[1]![3] = makeCell("skull");
    b[2]![3] = makeCell("skull");
    b[3]![3] = makeCell("skull");
    const groups = findMatches(b);
    expect(groups.some((g) => g.kind === "skull" && g.cells.length >= 3)).toBe(
      true,
    );
  });

  it("detects swap that creates a match", () => {
    const b = fillChecker();
    b[0]![0] = makeCell("heart");
    b[1]![0] = makeCell("heart");
    b[2]![1] = makeCell("heart");
    expect(swapCreatesMatch(b, { c: 2, r: 1 }, { c: 2, r: 0 })).toBe(true);
  });
});

describe("session", () => {
  it("starts with goals, moves, and powers", () => {
    const s = startSession();
    expect(s.movesLeft).toBe(28);
    expect(s.goals.length).toBe(3);
    expect(s.powers.bomb).toBeGreaterThan(0);
    expect(s.status).toBe("playing");
  });

  it("trySwap returns a result", () => {
    const s = startSession();
    const result = trySwap(s, { c: 0, r: 0 }, { c: 1, r: 0 });
    expect(result.ok || typeof result.reason === "string").toBe(true);
  });

  it("bomb power clears a neighborhood", () => {
    const s = startSession();
    s.powers.bomb = 1;
    const before = s.powers.bomb;
    const result = usePower(s, "bomb", { c: 2, r: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cleared.length).toBeGreaterThan(0);
    expect(s.powers.bomb).toBe(before - 1);
  });
});
